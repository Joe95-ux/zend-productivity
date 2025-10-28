"use client";

import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Paperclip, X, Image as ImageIcon, FileText, Download } from "lucide-react";
import { toast } from "sonner";
import { Attachment } from "@/lib/types";
import { formatDistanceToNow } from "date-fns";
import { AttachmentViewerModal } from "./AttachmentViewerModal";
import { AttachmentUpload } from "@/components/ui/AttachmentUpload";
import { AttachmentsSkeleton } from "./AttachmentsSkeleton";
import { fileToBase64, validateFile, extractFilename } from "@/lib/file-utils";

interface AttachmentsProps {
  attachments: Attachment[];
  cardId: string;
  boardId: string;
  isLoading?: boolean;
}

export function Attachments({ attachments, cardId, boardId, isLoading = false }: AttachmentsProps) {
  const [isDeleting, setIsDeleting] = useState<string | null>(null);
  const [viewerOpen, setViewerOpen] = useState(false);
  const [currentAttachmentIndex, setCurrentAttachmentIndex] = useState(0);
  const [showAllAttachments, setShowAllAttachments] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const queryClient = useQueryClient();

  const deleteAttachmentMutation = useMutation({
    mutationFn: async (attachmentId: string) => {
      const response = await fetch(`/api/attachments/${attachmentId}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to delete attachment");
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["board", boardId] });
      toast.success("Attachment deleted successfully!");
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  const handleDeleteAttachment = async (attachmentId: string) => {
    setIsDeleting(attachmentId);
    try {
      await deleteAttachmentMutation.mutateAsync(attachmentId);
    } finally {
      setIsDeleting(null);
    }
  };

  const getFileIcon = (type?: string) => {
    if (type?.startsWith('image/')) {
        return <ImageIcon className="w-4 h-4" />;
    }
        return <FileText className="w-4 h-4" />;
  };

  const getFileName = (url: string) => {
    return extractFilename(url);
  };

  const handleAttachmentClick = (index: number) => {
    setCurrentAttachmentIndex(index);
    setViewerOpen(true);
  };

  const toggleShowAll = () => {
    setShowAllAttachments(!showAllAttachments);
  };

  const handleFileUpload = async (file: File) => {
    const validation = validateFile(file, "*/*", 2); // Allow all file types, 2MB max
    if (!validation.valid) {
      toast.error(validation.error);
      return;
    }

    setIsUploading(true);
    const loadingToastId = toast.loading(`Uploading "${file.name}"...`);
    
    try {
      const result = await fileToBase64(file);
      
      // Save to database via API
      const response = await fetch(`/api/cards/${cardId}/attachments`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          url: result.url,
          type: result.type || 'file',
          filename: file.name
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to upload attachment");
      }

      toast.dismiss(loadingToastId);
      toast.success(`File "${file.name}" uploaded successfully!`);
      
      // Refresh the attachments list
      queryClient.invalidateQueries({ queryKey: ["board", boardId] });
      queryClient.invalidateQueries({ queryKey: ["attachments", cardId] });
    } catch (error) {
      console.error('Error uploading file:', error);
      toast.dismiss(loadingToastId);
      toast.error('Failed to upload file');
    } finally {
      setIsUploading(false);
    }
  };

  const handleUrlUpload = async (url: string, displayName?: string) => {
    setIsUploading(true);
    const loadingToastId = toast.loading("Adding URL attachment...");
    
    try {
      // Save URL to database via API
      const response = await fetch(`/api/cards/${cardId}/attachments`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          url: url,
          type: 'url',
          filename: displayName || extractFilename(url)
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to add URL attachment");
      }

      toast.dismiss(loadingToastId);
      toast.success(`URL attachment added successfully!`);
      
      // Refresh the attachments list with a small delay to ensure database consistency
      setTimeout(() => {
        queryClient.invalidateQueries({ queryKey: ["board", boardId] });
        queryClient.invalidateQueries({ queryKey: ["attachments", cardId] });
      }, 100);
    } catch (error) {
      console.error('Error adding URL attachment:', error);
      toast.dismiss(loadingToastId);
      toast.error('Failed to add URL attachment');
    } finally {
      setIsUploading(false);
    }
  };

  // Determine which attachments to show
  const visibleAttachments = showAllAttachments ? attachments : attachments.slice(0, 6);
  const hiddenCount = attachments.length - 6;

  const getThumbnailUrl = (url: string, type?: string) => {
    // Check if it's an image by MIME type or by URL pattern
    const isImage = type?.startsWith('image/') || 
                   url.startsWith('data:image/') || 
                   /\.(jpg|jpeg|png|gif|webp|svg)(\?.*)?$/i.test(url);
    
    if (isImage) {
      // For base64 images, return as is
      if (url.startsWith('data:')) return url;
      // For external images, you might want to use a thumbnail service
      return url;
    }
    return null;
  };

  if (isLoading) {
    return <AttachmentsSkeleton />;
  }

  if (attachments.length === 0) {
    return null;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
      <div className="flex items-center gap-3">
        <div className="p-2 bg-slate-100 dark:bg-slate-800 rounded-lg">
          <Paperclip className="w-4 h-4 text-slate-600 dark:text-slate-400" />
        </div>
        <h3 className="font-semibold text-slate-900 dark:text-white">Attachments</h3>
        </div>
        <AttachmentUpload
          onFileUpload={handleFileUpload}
          onUrlUpload={handleUrlUpload}
          isUploading={isUploading}
          acceptedTypes="*/*"
          maxSize={2}
          variant="button"
        />
      </div>
      
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {visibleAttachments.map((attachment, index) => {
          const thumbnailUrl = getThumbnailUrl(attachment.url, attachment.type);
          const fileName = attachment.filename || getFileName(attachment.url);
          
          return (
            <div
              key={attachment.id}
              className="group relative bg-slate-50 dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 overflow-hidden hover:shadow-md transition-all duration-200 cursor-pointer"
              onClick={() => handleAttachmentClick(index)}
            >
              {/* Thumbnail or Icon */}
              <div className="aspect-[4/3] relative">
                {thumbnailUrl ? (
                  <img
                    src={thumbnailUrl}
                    alt="Attachment"
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      // Fallback to icon if image fails to load
                      e.currentTarget.style.display = 'none';
                      e.currentTarget.nextElementSibling?.classList.remove('hidden');
                    }}
                  />
                ) : null}
                <div className={`absolute inset-0 flex items-center justify-center bg-slate-100 dark:bg-slate-700 ${thumbnailUrl ? 'hidden' : ''}`}>
                  {getFileIcon(attachment.type)}
                </div>
                
                {/* Overlay with actions */}
                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center justify-center gap-2">
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleAttachmentClick(index);
                    }}
                    className="h-8 px-2 text-xs"
                  >
                    <Download className="w-3 h-3 mr-1" />
                    View
                  </Button>
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteAttachment(attachment.id);
                    }}
                    disabled={isDeleting === attachment.id}
                    className="h-8 px-2 text-xs"
                  >
                    {isDeleting === attachment.id ? (
                      <div className="w-3 h-3 animate-spin rounded-full border-2 border-white border-t-transparent" />
                    ) : (
                      <X className="w-3 h-3" />
                    )}
                  </Button>
                </div>
              </div>
              
              {/* File info */}
              <div className="p-2">
                <p className="text-xs font-medium text-slate-900 dark:text-white truncate" title={fileName}>
                  {fileName}
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {formatDistanceToNow(new Date(attachment.createdAt), { addSuffix: true })}
                </p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Show More/Less Toggle */}
      {attachments.length > 6 && (
        <div className="flex justify-center mt-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={toggleShowAll}
            className="text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"
          >
            {showAllAttachments ? (
              <>Show Less</>
            ) : (
              <>Show {hiddenCount} more attachment{hiddenCount > 1 ? 's' : ''}</>
            )}
          </Button>
        </div>
      )}

      {/* Attachment Viewer Modal */}
      <AttachmentViewerModal
        isOpen={viewerOpen}
        onClose={() => setViewerOpen(false)}
        attachments={attachments}
        currentIndex={currentAttachmentIndex}
        onIndexChange={setCurrentAttachmentIndex}
      />
    </div>
  );
}
