"use client";

import { useState, useEffect, useRef } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FileText, Image, Search, Loader2, Upload } from "lucide-react";
import { FilePreviewSheet } from "@/components/storage/FilePreviewSheet";
import { formatDistanceToNow } from "date-fns";
import { cn } from "@/lib/utils";
import { fileToBase64, validateFile } from "@/lib/file-utils";
import { toast } from "sonner";

interface FileItem {
  id: string;
  url: string;
  type: string | null;
  filename: string | null;
  createdAt: string;
  card: {
    id: string;
    title: string;
    list: {
      id: string;
      title: string;
      board: {
        id: string;
        title: string;
      };
    };
  };
}

interface FilesResponse {
  files: FileItem[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export default function YourFilesPage() {
  const [search, setSearch] = useState("");
  const [type, setType] = useState<"all" | "images" | "documents" | "other">("all");
  const [selectedFile, setSelectedFile] = useState<FileItem | null>(null);
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const queryClient = useQueryClient();

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  const { data, isLoading } = useQuery<FilesResponse>({
    queryKey: ["your-files", debouncedSearch, type],
    queryFn: async () => {
      const params = new URLSearchParams({
        search: debouncedSearch,
        type: type
      });
      const response = await fetch(`/api/storage/your-files?${params}`);
      if (!response.ok) throw new Error("Failed to fetch files");
      return response.json();
    },
  });

  const getFileIcon = (file: FileItem) => {
    const fileType = file.type?.toLowerCase() || "";
    const filename = file.filename?.toLowerCase() || "";
    
    if (fileType.startsWith("image/") || 
        filename.match(/\.(jpg|jpeg|png|gif|webp|svg)$/)) {
      return Image;
    }
    return FileText;
  };

  const getFileTypeLabel = (file: FileItem) => {
    const fileType = file.type?.toLowerCase() || "";
    const filename = file.filename?.toLowerCase() || "";
    
    if (fileType.startsWith("image/") || 
        filename.match(/\.(jpg|jpeg|png|gif|webp|svg)$/)) {
      return "Image";
    }
    if (fileType.startsWith("application/pdf") || filename.endsWith(".pdf")) {
      return "PDF";
    }
    if (fileType.includes("word") || filename.match(/\.(doc|docx)$/)) {
      return "Word";
    }
    if (fileType.includes("excel") || filename.match(/\.(xls|xlsx)$/)) {
      return "Excel";
    }
    if (fileType.includes("powerpoint") || filename.match(/\.(ppt|pptx)$/)) {
      return "PowerPoint";
    }
    return "File";
  };

  const formatFileSize = (url: string) => {
    // For base64, estimate size
    if (url.startsWith("data:")) {
      const base64Length = url.split(",")[1]?.length || 0;
      const sizeInBytes = (base64Length * 3) / 4;
      if (sizeInBytes < 1024) return `${Math.round(sizeInBytes)} B`;
      if (sizeInBytes < 1024 * 1024) return `${(sizeInBytes / 1024).toFixed(1)} KB`;
      return `${(sizeInBytes / (1024 * 1024)).toFixed(1)} MB`;
    }
    return "—";
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const validation = validateFile(file, "*/*", 2); // 2MB max
    if (!validation.valid) {
      toast.error(validation.error);
      return;
    }

    handleFileUpload(file);
    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleFileUpload = async (file: File) => {
    setIsUploading(true);
    const loadingToastId = toast.loading(`Uploading "${file.name}"...`);

    try {
      const result = await fileToBase64(file);

      const response = await fetch("/api/storage/your-files/upload", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          url: result.url,
          type: result.type || "file",
          filename: file.name,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to upload file");
      }

      toast.dismiss(loadingToastId);
      toast.success(`File "${file.name}" uploaded successfully!`);

      // Refresh the files list
      queryClient.invalidateQueries({ queryKey: ["your-files"] });
    } catch (error) {
      console.error("Error uploading file:", error);
      toast.dismiss(loadingToastId);
      toast.error(error instanceof Error ? error.message : "Failed to upload file");
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header with Search and Tabs */}
      <div className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="flex flex-col gap-4 p-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-semibold">Your Files</h1>
              <p className="text-sm text-muted-foreground mt-1">
                {data?.total || 0} {data?.total === 1 ? "file" : "files"}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <input
                ref={fileInputRef}
                type="file"
                onChange={handleFileSelect}
                className="hidden"
                accept="*/*"
              />
              <Button
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploading}
                size="sm"
              >
                {isUploading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Uploading...
                  </>
                ) : (
                  <>
                    <Upload className="h-4 w-4 mr-2" />
                    Upload File
                  </>
                )}
              </Button>
            </div>
          </div>

          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search files..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>

          {/* Tabs */}
          <Tabs value={type} onValueChange={(v) => setType(v as typeof type)}>
            <TabsList>
              <TabsTrigger value="all">All</TabsTrigger>
              <TabsTrigger value="images">Images</TabsTrigger>
              <TabsTrigger value="documents">Documents</TabsTrigger>
              <TabsTrigger value="other">Other</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
      </div>

      {/* Files Grid */}
      <div className="flex-1 overflow-auto p-6">
        {isLoading ? (
          <div className="flex items-center justify-center h-64">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : !data?.files || data.files.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-center">
            <FileText className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No files found</h3>
            <p className="text-sm text-muted-foreground">
              {search ? "Try adjusting your search" : "Files you upload will appear here"}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
            {data.files.map((file) => {
              const Icon = getFileIcon(file);
              const isImage = file.type?.startsWith("image/") || 
                file.filename?.match(/\.(jpg|jpeg|png|gif|webp|svg)$/i);

              return (
                <div
                  key={file.id}
                  onClick={() => setSelectedFile(file)}
                  className={cn(
                    "group relative rounded-lg border bg-card hover:bg-accent transition-colors cursor-pointer overflow-hidden",
                    "flex flex-col"
                  )}
                >
                  {/* File Preview/Thumbnail */}
                  <div className="aspect-square bg-muted flex items-center justify-center relative overflow-hidden">
                    {isImage && file.url ? (
                      <img
                        src={file.url}
                        alt={file.filename || "Image"}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                      />
                    ) : (
                      <Icon className="h-12 w-12 text-muted-foreground" />
                    )}
                  </div>

                  {/* File Info */}
                  <div className="p-3 flex-1 flex flex-col">
                    <p className="text-sm font-medium truncate mb-1">
                      {file.filename || "Untitled"}
                    </p>
                    <p className="text-xs text-muted-foreground truncate">
                      {file.card.list.board.title} • {file.card.title}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {formatDistanceToNow(new Date(file.createdAt), { addSuffix: true })}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* File Preview Sheet */}
      {selectedFile && (
        <FilePreviewSheet
          file={selectedFile}
          open={!!selectedFile}
          onOpenChange={(open) => !open && setSelectedFile(null)}
        />
      )}
    </div>
  );
}

