"use client";

import { useState, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FileText, Image, Search, ChevronLeft, ChevronRight } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { FilePreviewSheet } from "@/components/storage/FilePreviewSheet";
import { formatDistanceToNow } from "date-fns";
import { cn } from "@/lib/utils";
import { AttachmentUpload } from "@/components/ui/AttachmentUpload";
import { extractFilename } from "@/lib/file-utils";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

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
  const [currentPage, setCurrentPage] = useState(1);
  const queryClient = useQueryClient();

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
      setCurrentPage(1); // Reset to first page on search
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  // Reset page when type changes
  useEffect(() => {
    setCurrentPage(1);
  }, [type]);

  const { data, isLoading } = useQuery<FilesResponse>({
    queryKey: ["your-files", debouncedSearch, type, currentPage],
    queryFn: async () => {
      const params = new URLSearchParams({
        search: debouncedSearch,
        type: type,
        page: currentPage.toString(),
        limit: "24" // Smaller page size for better UX
      });
      const response = await fetch(`/api/storage/your-files?${params}`);
      if (!response.ok) throw new Error("Failed to fetch files");
      return response.json();
    },
  });

  const getFileIcon = (file: FileItem) => {
    const fileType = file.type?.toLowerCase() || "";
    const filename = file.filename?.toLowerCase() || "";
    const url = file.url?.toLowerCase() || "";
    
    // Check if it's an image by type, filename, or URL pattern
    const isImage = fileType.startsWith("image/") || 
        filename.match(/\.(jpg|jpeg|png|gif|webp|svg)$/i) ||
        url.startsWith('data:image/') ||
        /\.(jpg|jpeg|png|gif|webp|svg)(\?.*)?$/i.test(url);
    
    if (isImage) {
      return Image;
    }
    return FileText;
  };

  const getThumbnailUrl = (url: string, type?: string) => {
    // Check if it's an image by MIME type or by URL pattern
    const isImage = type?.startsWith('image/') || 
                   url.startsWith('data:image/') || 
                   (url.startsWith('http://') || url.startsWith('https://')) && /\.(jpg|jpeg|png|gif|webp|svg)(\?.*)?$/i.test(url);
    
    if (isImage) {
      // For base64 images, return as is
      if (url.startsWith('data:')) return url;
      // For external images, return the URL
      if (url.startsWith('http://') || url.startsWith('https://')) return url;
    }
    return null;
  };

  const handleFileUpload = async (file: File) => {
    setIsUploading(true);
    const loadingToastId = toast.loading(`Uploading "${file.name}"...`);

    try {
      const { fileToBase64 } = await import("@/lib/file-utils");
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

  const handleUrlUpload = async (url: string, displayName?: string) => {
    setIsUploading(true);
    const loadingToastId = toast.loading("Adding URL attachment...");

    try {
      const response = await fetch("/api/storage/your-files/upload", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          url: url,
          type: 'url',
          filename: displayName || extractFilename(url),
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to add URL attachment");
      }

      toast.dismiss(loadingToastId);
      toast.success(`URL attachment added successfully!`);

      // Refresh the files list
      setTimeout(() => {
        queryClient.invalidateQueries({ queryKey: ["your-files"] });
      }, 100);
    } catch (error) {
      console.error("Error adding URL attachment:", error);
      toast.dismiss(loadingToastId);
      toast.error(error instanceof Error ? error.message : "Failed to add URL attachment");
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
              <AttachmentUpload
                onFileUpload={handleFileUpload}
                onUrlUpload={handleUrlUpload}
                isUploading={isUploading}
                acceptedTypes="*/*"
                maxSize={2}
                variant="button"
              />
            </div>
          </div>

          {/* Search and Tabs Row */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 w-full">
            {/* Tabs */}
            <Tabs value={type} onValueChange={(v) => setType(v as typeof type)}>
              <TabsList>
                <TabsTrigger value="all">All</TabsTrigger>
                <TabsTrigger value="images">Images</TabsTrigger>
                <TabsTrigger value="documents">Documents</TabsTrigger>
                <TabsTrigger value="other">Other</TabsTrigger>
              </TabsList>
            </Tabs>

            {/* Search */}
            <div className="relative w-full sm:w-auto sm:min-w-[300px]">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search files..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 w-full"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Files Grid */}
      <div className="flex-1 overflow-auto p-6">
        {isLoading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-8 gap-3">
            {Array.from({ length: 24 }).map((_, i) => (
              <div
                key={i}
                className="rounded-lg border bg-card overflow-hidden flex flex-col"
              >
                {/* File Preview/Thumbnail Skeleton */}
                <div className="aspect-square bg-muted">
                  <Skeleton className="w-full h-full rounded-none" />
                </div>
                {/* File Info Skeleton */}
                <div className="p-2 flex-1 flex flex-col min-w-0">
                  <Skeleton className="h-3 w-3/4 mb-1" />
                  <Skeleton className="h-2.5 w-1/2" />
                </div>
              </div>
            ))}
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
          <>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-8 gap-3">
              {data.files.map((file) => {
                const Icon = getFileIcon(file);
                const thumbnailUrl = getThumbnailUrl(file.url, file.type || undefined);
                const fileName = file.filename || extractFilename(file.url);

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
                      {thumbnailUrl ? (
                        <img
                          src={thumbnailUrl}
                          alt={fileName}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                          onError={(e) => {
                            // Fallback to icon if image fails to load
                            e.currentTarget.style.display = 'none';
                            const iconContainer = e.currentTarget.nextElementSibling as HTMLElement;
                            if (iconContainer) {
                              iconContainer.classList.remove('hidden');
                            }
                          }}
                        />
                      ) : null}
                      <div className={cn(
                        "absolute inset-0 flex items-center justify-center",
                        thumbnailUrl ? "hidden" : ""
                      )}>
                        <Icon className="h-8 w-8 text-muted-foreground" />
                      </div>
                    </div>

                    {/* File Info */}
                    <div className="p-2 flex-1 flex flex-col min-w-0">
                      <p className="text-xs font-medium truncate mb-0.5" title={fileName}>
                        {fileName}
                      </p>
                      <p className="text-[10px] text-muted-foreground truncate">
                        {formatDistanceToNow(new Date(file.createdAt), { addSuffix: true })}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Pagination */}
            {data.totalPages > 1 && (
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mt-6 pt-6 border-t">
                <div className="text-sm text-muted-foreground text-center sm:text-left">
                  Showing {((currentPage - 1) * 24) + 1} to {Math.min(currentPage * 24, data.total)} of {data.total} files
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                    disabled={currentPage === 1}
                  >
                    <ChevronLeft className="h-4 w-4 mr-1" />
                    <span className="hidden sm:inline">Previous</span>
                  </Button>
                  <div className="flex items-center gap-1">
                    {Array.from({ length: Math.min(5, data.totalPages) }, (_, i) => {
                      let pageNum: number;
                      if (data.totalPages <= 5) {
                        pageNum = i + 1;
                      } else if (currentPage <= 3) {
                        pageNum = i + 1;
                      } else if (currentPage >= data.totalPages - 2) {
                        pageNum = data.totalPages - 4 + i;
                      } else {
                        pageNum = currentPage - 2 + i;
                      }
                      return (
                        <Button
                          key={pageNum}
                          variant={currentPage === pageNum ? "default" : "outline"}
                          size="sm"
                          className="w-8 h-8 p-0"
                          onClick={() => setCurrentPage(pageNum)}
                        >
                          {pageNum}
                        </Button>
                      );
                    })}
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(prev => Math.min(data.totalPages, prev + 1))}
                    disabled={currentPage === data.totalPages}
                  >
                    <span className="hidden sm:inline">Next</span>
                    <ChevronRight className="h-4 w-4 sm:ml-1" />
                  </Button>
                </div>
              </div>
            )}
          </>
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

