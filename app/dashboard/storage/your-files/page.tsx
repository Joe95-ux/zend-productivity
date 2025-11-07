"use client";

import { useState, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FileText, Image, Search, ChevronLeft, ChevronRight, Grid3x3, List, Star, MoreHorizontal, Edit, Trash2, Filter } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { FilePreviewSheet } from "@/components/storage/FilePreviewSheet";
import { formatDistanceToNow } from "date-fns";
import { cn } from "@/lib/utils";
import { AttachmentUpload } from "@/components/ui/AttachmentUpload";
import { extractFilename } from "@/lib/file-utils";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { useMutation } from "@tanstack/react-query";

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
  const [sortBy, setSortBy] = useState<"newest" | "oldest" | "filetype" | "filesize" | "favorites">("newest");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [selectedFile, setSelectedFile] = useState<FileItem | null>(null);
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [editingFile, setEditingFile] = useState<FileItem | null>(null);
  const [editFilename, setEditFilename] = useState("");
  const [deletingFile, setDeletingFile] = useState<FileItem | null>(null);
  const [favoriteStatuses, setFavoriteStatuses] = useState<Record<string, boolean>>({});
  const queryClient = useQueryClient();

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
      setCurrentPage(1); // Reset to first page on search
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  // Reset page when type or sortBy changes
  useEffect(() => {
    setCurrentPage(1);
  }, [type, sortBy]);

  const { data, isLoading } = useQuery<FilesResponse>({
    queryKey: ["your-files", debouncedSearch, type, sortBy, currentPage],
    queryFn: async () => {
      const params = new URLSearchParams({
        search: debouncedSearch,
        type: type,
        sortBy: sortBy,
        page: currentPage.toString(),
        limit: "24" // Smaller page size for better UX
      });
      const response = await fetch(`/api/storage/your-files?${params}`);
      if (!response.ok) throw new Error("Failed to fetch files");
      const data = await response.json();
      
      // Fetch favorite statuses for all files
      const favoritePromises = data.files.map((file: FileItem) =>
        fetch(`/api/storage/your-files/${file.id}/favorite`)
          .then(res => res.json())
          .then(res => ({ fileId: file.id, isFavorite: res.isFavorite }))
          .catch(() => ({ fileId: file.id, isFavorite: false }))
      );
      const favoriteResults = await Promise.all(favoritePromises);
      const favorites: Record<string, boolean> = {};
      favoriteResults.forEach(({ fileId, isFavorite }) => {
        favorites[fileId] = isFavorite;
      });
      setFavoriteStatuses(favorites);
      
      return data;
    },
  });

  // Favorite toggle mutation
  const favoriteMutation = useMutation({
    mutationFn: async ({ fileId, isFavorite }: { fileId: string; isFavorite: boolean }) => {
      const response = await fetch(`/api/storage/your-files/${fileId}/favorite`, {
        method: isFavorite ? "POST" : "DELETE",
      });
      if (!response.ok) throw new Error("Failed to toggle favorite");
      return response.json();
    },
    onSuccess: (_, variables) => {
      setFavoriteStatuses(prev => ({
        ...prev,
        [variables.fileId]: variables.isFavorite
      }));
      toast.success(variables.isFavorite ? "Added to favorites" : "Removed from favorites");
    },
    onError: () => {
      toast.error("Failed to update favorite");
    },
  });

  // Update filename mutation
  const updateFilenameMutation = useMutation({
    mutationFn: async ({ fileId, filename }: { fileId: string; filename: string }) => {
      const response = await fetch(`/api/storage/your-files/${fileId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ filename }),
      });
      if (!response.ok) throw new Error("Failed to update filename");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["your-files"] });
      setEditingFile(null);
      setEditFilename("");
      toast.success("Filename updated successfully");
    },
    onError: () => {
      toast.error("Failed to update filename");
    },
  });

  // Delete file mutation
  const deleteFileMutation = useMutation({
    mutationFn: async (fileId: string) => {
      const response = await fetch(`/api/storage/your-files/${fileId}`, {
        method: "DELETE",
      });
      if (!response.ok) throw new Error("Failed to delete file");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["your-files"] });
      setDeletingFile(null);
      toast.success("File deleted successfully");
    },
    onError: () => {
      toast.error("Failed to delete file");
    },
  });

  const handleFavoriteClick = (e: React.MouseEvent, file: FileItem) => {
    e.stopPropagation();
    const currentFavorite = favoriteStatuses[file.id] || false;
    favoriteMutation.mutate({ fileId: file.id, isFavorite: !currentFavorite });
  };

  const handleEditClick = (e: React.MouseEvent, file: FileItem) => {
    e.stopPropagation();
    setEditingFile(file);
    setEditFilename(file.filename || extractFilename(file.url));
  };

  const handleDeleteClick = (e: React.MouseEvent, file: FileItem) => {
    e.stopPropagation();
    setDeletingFile(file);
  };

  const handleEditSubmit = () => {
    if (!editingFile || !editFilename.trim()) return;
    updateFilenameMutation.mutate({ fileId: editingFile.id, filename: editFilename.trim() });
  };

  const handleDeleteConfirm = () => {
    if (!deletingFile) return;
    deleteFileMutation.mutate(deletingFile.id);
  };

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

  const getFileTypeBadge = (file: FileItem) => {
    const fileType = file.type?.toLowerCase() || "";
    const filename = file.filename?.toLowerCase() || "";
    const url = file.url?.toLowerCase() || "";
    
    // Check if it's an image
    const isImage = fileType.startsWith("image/") || 
        filename.match(/\.(jpg|jpeg|png|gif|webp|svg)$/i) ||
        url.startsWith('data:image/') ||
        /\.(jpg|jpeg|png|gif|webp|svg)(\?.*)?$/i.test(url);
    
    if (isImage) return "Image";
    
    // Check for documents
    if (fileType.startsWith("application/pdf") || filename.match(/\.pdf$/i)) return "PDF";
    if (fileType.includes("word") || filename.match(/\.(doc|docx)$/i)) return "Word";
    if (fileType.includes("excel") || filename.match(/\.(xls|xlsx)$/i)) return "Excel";
    if (fileType.includes("powerpoint") || filename.match(/\.(ppt|pptx)$/i)) return "PowerPoint";
    if (fileType.startsWith("text/") || filename.match(/\.txt$/i)) return "Text";
    
    // Check for other common types
    if (fileType.startsWith("video/")) return "Video";
    if (fileType.startsWith("audio/")) return "Audio";
    
    // Extract extension from filename or URL
    const extension = filename.match(/\.([^.]+)$/)?.[1] || url.match(/\.([^.]+)(\?|$)/)?.[1];
    if (extension) return extension.toUpperCase();
    
    return "File";
  };

  const isPDF = (file: FileItem) => {
    const fileType = file.type?.toLowerCase() || "";
    const filename = file.filename?.toLowerCase() || "";
    return fileType.startsWith("application/pdf") || filename.match(/\.pdf$/i);
  };

  const isDocument = (file: FileItem) => {
    const fileType = file.type?.toLowerCase() || "";
    const filename = file.filename?.toLowerCase() || "";
    return (
      fileType.includes("word") || filename.match(/\.(doc|docx)$/i) ||
      fileType.includes("excel") || filename.match(/\.(xls|xlsx)$/i) ||
      fileType.includes("powerpoint") || filename.match(/\.(ppt|pptx)$/i) ||
      fileType.startsWith("text/") || filename.match(/\.txt$/i)
    );
  };

  const getDocumentPreviewUrl = (file: FileItem) => {
    // For external URLs, use Google Docs Viewer
    if (file.url.startsWith('http://') || file.url.startsWith('https://')) {
      return `https://docs.google.com/viewer?url=${encodeURIComponent(file.url)}&embedded=true`;
    }
    // For base64, we can't use Google Docs Viewer, so return null
    return null;
  };

  const getPDFPreviewUrl = (file: FileItem) => {
    // PDFs can be displayed directly in iframe (both base64 and external URLs)
    if (isPDF(file)) {
      return file.url;
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

          {/* Search, Sort, and View Controls Row */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 w-full">
            {/* Tabs - Left */}
            <Tabs value={type} onValueChange={(v) => setType(v as typeof type)}>
              <TabsList>
                <TabsTrigger value="all">All</TabsTrigger>
                <TabsTrigger value="images">Images</TabsTrigger>
                <TabsTrigger value="documents">Documents</TabsTrigger>
                <TabsTrigger value="other">Other</TabsTrigger>
              </TabsList>
            </Tabs>

            {/* Search, Sort, and View Controls - Right */}
            <div className="flex items-center gap-2 ml-auto">
              {/* Search with Sort */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search files..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-9 pr-10 w-[200px] sm:w-[250px]"
                />
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="absolute right-1 top-1/2 transform -translate-y-1/2 h-8 w-8 p-0 hover:bg-muted/80"
                    >
                      <Filter className="h-4 w-4 text-muted-foreground" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-48">
                    <DropdownMenuItem onClick={() => setSortBy("newest")}>
                      Newest {sortBy === "newest" && "✓"}
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setSortBy("oldest")}>
                      Oldest {sortBy === "oldest" && "✓"}
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setSortBy("filetype")}>
                      File Type {sortBy === "filetype" && "✓"}
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setSortBy("filesize")}>
                      File Size {sortBy === "filesize" && "✓"}
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setSortBy("favorites")}>
                      Favorites {sortBy === "favorites" && "✓"}
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>

              {/* View Mode Toggle */}
              <div className="flex items-center gap-1 border rounded-md p-1">
                <Button
                  variant={viewMode === "grid" ? "default" : "ghost"}
                  size="sm"
                  className="h-8 w-8 p-0"
                  onClick={() => setViewMode("grid")}
                >
                  <Grid3x3 className="h-4 w-4" />
                </Button>
                <Button
                  variant={viewMode === "list" ? "default" : "ghost"}
                  size="sm"
                  className="h-8 w-8 p-0"
                  onClick={() => setViewMode("list")}
                >
                  <List className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Files Grid */}
      <div className="flex-1 overflow-auto p-6">
        {isLoading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-6 gap-3">
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
            {viewMode === "grid" ? (
              <div className="sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-6 gap-3">
                {data.files.map((file) => {
                  const Icon = getFileIcon(file);
                  const thumbnailUrl = getThumbnailUrl(file.url, file.type || undefined);
                  const fileName = file.filename || extractFilename(file.url);

                  const isFavorite = favoriteStatuses[file.id] || false;

                  return (
                    <div
                      key={file.id}
                      className={cn(
                        "group relative rounded-lg border bg-card hover:bg-accent transition-colors overflow-hidden",
                        "flex flex-col"
                      )}
                    >
                      {/* Favorite and Menu Icons */}
                      <div className="absolute top-2 left-2 z-10">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 w-7 p-0 bg-background/80 hover:bg-background"
                          onClick={(e) => handleFavoriteClick(e, file)}
                        >
                          <Star
                            className={cn(
                              "h-4 w-4",
                              isFavorite ? "fill-yellow-500 text-yellow-500" : "text-muted-foreground"
                            )}
                          />
                        </Button>
                      </div>
                      <div className="absolute top-2 right-2 z-10">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 w-7 p-0 bg-background/80 hover:bg-background"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <MoreHorizontal className="h-4 w-4 text-muted-foreground" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={(e) => handleEditClick(e, file)}>
                              <Edit className="h-4 w-4 mr-2" />
                              Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={(e) => handleDeleteClick(e, file)}
                              className="text-destructive focus:text-destructive"
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>

                      {/* File Preview/Thumbnail */}
                      <div
                        onClick={() => setSelectedFile(file)}
                        className="aspect-square bg-muted flex items-center justify-center relative overflow-hidden cursor-pointer"
                      >
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
                        ) : getPDFPreviewUrl(file) ? (
                          <iframe
                            src={getPDFPreviewUrl(file) || ''}
                            className="w-full h-full border-0 pointer-events-none"
                            title={fileName}
                            sandbox="allow-same-origin"
                          />
                        ) : isDocument(file) && getDocumentPreviewUrl(file) ? (
                          <iframe
                            src={getDocumentPreviewUrl(file) || ''}
                            className="w-full h-full border-0 pointer-events-none"
                            title={fileName}
                            sandbox="allow-same-origin allow-scripts"
                          />
                        ) : null}
                        <div className={cn(
                          "absolute inset-0 flex items-center justify-center bg-muted",
                          (thumbnailUrl || getPDFPreviewUrl(file) || (isDocument(file) && getDocumentPreviewUrl(file))) ? "hidden" : ""
                        )}>
                          <Icon className="h-8 w-8 text-muted-foreground" />
                        </div>
                      </div>

                      {/* File Info */}
                      <div
                        onClick={() => setSelectedFile(file)}
                        className="p-2 flex-1 flex flex-col min-w-0 cursor-pointer"
                      >
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
            ) : (
              <>
                {/* Mobile Layout - Keep existing design */}
                <div className="space-y-2 md:hidden">
                  {data.files.map((file) => {
                    const Icon = getFileIcon(file);
                    const thumbnailUrl = getThumbnailUrl(file.url, file.type || undefined);
                    const fileName = file.filename || extractFilename(file.url);
                    const isFavorite = favoriteStatuses[file.id] || false;

                    return (
                      <div
                        key={file.id}
                        className={cn(
                          "group relative rounded-lg border bg-card hover:bg-accent transition-colors",
                          "flex items-center gap-4 p-4"
                        )}
                        onClick={() => setSelectedFile(file)}
                      >
                        {/* Favorite and Menu Icons - Mobile */}
                        <div className="absolute top-2 left-2 z-10">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 w-7 p-0 bg-background/80 hover:bg-background"
                            onClick={(e) => handleFavoriteClick(e, file)}
                          >
                            <Star
                              className={cn(
                                "h-4 w-4",
                                isFavorite ? "fill-yellow-500 text-yellow-500" : "text-muted-foreground"
                              )}
                            />
                          </Button>
                        </div>
                        <div className="absolute top-2 right-2 z-10">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-7 w-7 p-0 bg-background/80 hover:bg-background"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <MoreHorizontal className="h-4 w-4 text-muted-foreground" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={(e) => handleEditClick(e, file)}>
                                <Edit className="h-4 w-4 mr-2" />
                                Edit
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={(e) => handleDeleteClick(e, file)}
                                className="text-destructive focus:text-destructive"
                              >
                                <Trash2 className="h-4 w-4 mr-2" />
                                Delete
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>

                        {/* File Preview/Thumbnail - Mobile */}
                        <div
                          className="w-16 h-16 bg-muted rounded flex items-center justify-center relative overflow-hidden flex-shrink-0 cursor-pointer"
                          onClick={(e) => e.stopPropagation()}
                        >
                          {thumbnailUrl ? (
                            <img
                              src={thumbnailUrl}
                              alt={fileName}
                              className="w-full h-full object-cover"
                              onError={(e) => {
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
                            <Icon className="h-6 w-6 text-muted-foreground" />
                          </div>
                        </div>

                        {/* File Info - Mobile */}
                        <div className="flex-1 min-w-0 cursor-pointer">
                          <p className="text-sm font-medium truncate mb-1" title={fileName}>
                            {fileName}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {formatDistanceToNow(new Date(file.createdAt), { addSuffix: true })}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Desktop Layout - Table */}
                <div className="hidden md:block border rounded-lg overflow-hidden">
                  <table className="w-full">
                    <thead className="bg-muted/50 border-b">
                      <tr>
                        <th className="text-left p-3 text-xs font-semibold text-muted-foreground w-16">Preview</th>
                        <th className="text-left p-3 text-xs font-semibold text-muted-foreground">Name</th>
                        <th className="text-left p-3 text-xs font-semibold text-muted-foreground hidden lg:table-cell w-24">Type</th>
                        <th className="text-left p-3 text-xs font-semibold text-muted-foreground hidden xl:table-cell">Location</th>
                        <th className="text-right p-3 text-xs font-semibold text-muted-foreground hidden lg:table-cell w-32">Date</th>
                        <th className="text-right p-3 text-xs font-semibold text-muted-foreground w-20">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.files.map((file) => {
                        const Icon = getFileIcon(file);
                        const thumbnailUrl = getThumbnailUrl(file.url, file.type || undefined);
                        const fileName = file.filename || extractFilename(file.url);
                        const isFavorite = favoriteStatuses[file.id] || false;
                        const fileTypeBadge = getFileTypeBadge(file);
                        const location = `${file.card.list.board.title} / ${file.card.list.title}`;
                        const pdfPreviewUrl = getPDFPreviewUrl(file);
                        const docPreviewUrl = isDocument(file) ? getDocumentPreviewUrl(file) : null;

                        return (
                          <tr
                            key={file.id}
                            className="group border-b hover:bg-accent transition-colors cursor-pointer"
                            onClick={() => setSelectedFile(file)}
                          >
                            {/* Preview Column */}
                            <td className="p-3">
                              <div
                                className="w-12 h-12 bg-muted rounded flex items-center justify-center relative overflow-hidden"
                                onClick={(e) => e.stopPropagation()}
                              >
                                {thumbnailUrl ? (
                                  <img
                                    src={thumbnailUrl}
                                    alt={fileName}
                                    className="w-full h-full object-cover"
                                    onError={(e) => {
                                      e.currentTarget.style.display = 'none';
                                      const iconContainer = e.currentTarget.nextElementSibling as HTMLElement;
                                      if (iconContainer) {
                                        iconContainer.classList.remove('hidden');
                                      }
                                    }}
                                  />
                                ) : pdfPreviewUrl ? (
                                  <iframe
                                    src={pdfPreviewUrl}
                                    className="w-full h-full border-0 pointer-events-none"
                                    title={fileName}
                                    sandbox="allow-same-origin"
                                  />
                                ) : docPreviewUrl ? (
                                  <iframe
                                    src={docPreviewUrl}
                                    className="w-full h-full border-0 pointer-events-none"
                                    title={fileName}
                                    sandbox="allow-same-origin allow-scripts"
                                  />
                                ) : null}
                                <div className={cn(
                                  "absolute inset-0 flex items-center justify-center bg-muted",
                                  (thumbnailUrl || pdfPreviewUrl || docPreviewUrl) ? "hidden" : ""
                                )}>
                                  <Icon className="h-5 w-5 text-muted-foreground" />
                                </div>
                              </div>
                            </td>

                            {/* Name Column */}
                            <td className="p-3">
                              <div className="flex items-center gap-2 min-w-0">
                                <p className="text-sm font-semibold truncate" title={fileName}>
                                  {fileName}
                                </p>
                                {isFavorite && (
                                  <Star className="h-3.5 w-3.5 fill-yellow-500 text-yellow-500 flex-shrink-0" />
                                )}
                              </div>
                            </td>

                            {/* Type Column */}
                            <td className="p-3 hidden lg:table-cell">
                              <span className="text-xs text-muted-foreground px-2 py-1 rounded bg-muted/50">
                                {fileTypeBadge}
                              </span>
                            </td>

                            {/* Location Column */}
                            <td className="p-3 hidden xl:table-cell">
                              <p className="text-xs text-muted-foreground truncate" title={location}>
                                {location}
                              </p>
                            </td>

                            {/* Date Column */}
                            <td className="p-3 hidden lg:table-cell text-right">
                              <p className="text-xs text-muted-foreground">
                                {formatDistanceToNow(new Date(file.createdAt), { addSuffix: true })}
                              </p>
                            </td>

                            {/* Actions Column */}
                            <td className="p-3">
                              <div className="flex items-center justify-end gap-1">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-8 w-8 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                                  onClick={(e) => handleFavoriteClick(e, file)}
                                >
                                  <Star
                                    className={cn(
                                      "h-4 w-4",
                                      isFavorite ? "fill-yellow-500 text-yellow-500" : "text-muted-foreground"
                                    )}
                                  />
                                </Button>
                                <DropdownMenu>
                                  <DropdownMenuTrigger asChild>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      className="h-8 w-8 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                                      onClick={(e) => e.stopPropagation()}
                                    >
                                      <MoreHorizontal className="h-4 w-4 text-muted-foreground" />
                                    </Button>
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent align="end">
                                    <DropdownMenuItem onClick={(e) => handleEditClick(e, file)}>
                                      <Edit className="h-4 w-4 mr-2" />
                                      Edit
                                    </DropdownMenuItem>
                                    <DropdownMenuItem
                                      onClick={(e) => handleDeleteClick(e, file)}
                                      className="text-destructive focus:text-destructive"
                                    >
                                      <Trash2 className="h-4 w-4 mr-2" />
                                      Delete
                                    </DropdownMenuItem>
                                  </DropdownMenuContent>
                                </DropdownMenu>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </>
            )}

            {/* Edit File Dialog */}
            <Dialog open={!!editingFile} onOpenChange={(open: boolean) => {
              if (!open) {
                setEditingFile(null);
                setEditFilename("");
              }
            }}>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Edit File Name</DialogTitle>
                  <DialogDescription>
                    Update the filename for this file.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <Input
                    value={editFilename}
                    onChange={(e) => setEditFilename(e.target.value)}
                    placeholder="Enter filename..."
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        handleEditSubmit();
                      }
                    }}
                  />
                  <div className="flex justify-end gap-2">
                    <Button
                      variant="outline"
                      onClick={() => {
                        setEditingFile(null);
                        setEditFilename("");
                      }}
                    >
                      Cancel
                    </Button>
                    <Button
                      onClick={handleEditSubmit}
                      disabled={!editFilename.trim() || updateFilenameMutation.isPending}
                    >
                      {updateFilenameMutation.isPending ? "Saving..." : "Save"}
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>

            {/* Delete Confirmation Dialog */}
            <Dialog open={!!deletingFile} onOpenChange={(open: boolean) => {
              if (!open) {
                setDeletingFile(null);
              }
            }}>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Delete File</DialogTitle>
                  <DialogDescription>
                    Are you sure you want to delete &quot;{deletingFile?.filename || extractFilename(deletingFile?.url || "")}&quot;? This action cannot be undone.
                  </DialogDescription>
                </DialogHeader>
                <div className="flex justify-end gap-2 pt-4">
                  <Button
                    variant="outline"
                    onClick={() => setDeletingFile(null)}
                    disabled={deleteFileMutation.isPending}
                  >
                    Cancel
                  </Button>
                  <Button
                    variant="destructive"
                    onClick={handleDeleteConfirm}
                    disabled={deleteFileMutation.isPending}
                  >
                    {deleteFileMutation.isPending ? "Deleting..." : "Delete"}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>

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

