"use client";

import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Paperclip, X, Image as ImageIcon, FileText, Download } from "lucide-react";
import { toast } from "sonner";
import { Attachment } from "@/lib/types";
import { formatDistanceToNow } from "date-fns";

interface AttachmentsProps {
  attachments: Attachment[];
  cardId: string;
  boardId: string;
}

export function Attachments({ attachments, cardId, boardId }: AttachmentsProps) {
  const [isDeleting, setIsDeleting] = useState<string | null>(null);
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
    switch (type) {
      case 'image':
        return <ImageIcon className="w-4 h-4" />;
      default:
        return <FileText className="w-4 h-4" />;
    }
  };

  const getFileType = (url: string, type?: string) => {
    if (type === 'image') {
      // Extract filename from URL for images
      const filename = url.split('/').pop() || 'image';
      return filename.split('.')[0] || 'Image';
    }
    
    const extension = url.split('.').pop()?.toLowerCase();
    switch (extension) {
      case 'pdf':
        return 'PDF';
      case 'doc':
      case 'docx':
        return 'Document';
      case 'xls':
      case 'xlsx':
        return 'Spreadsheet';
      case 'ppt':
      case 'pptx':
        return 'Presentation';
      case 'txt':
        return 'Text';
      default:
        return 'File';
    }
  };

  const getThumbnailUrl = (url: string, type?: string) => {
    if (type === 'image') {
      // For base64 images, return as is
      if (url.startsWith('data:')) return url;
      // For external images, you might want to use a thumbnail service
      return url;
    }
    return null;
  };

  if (attachments.length === 0) {
    return null;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <div className="p-2 bg-slate-100 dark:bg-slate-800 rounded-lg">
          <Paperclip className="w-4 h-4 text-slate-600 dark:text-slate-400" />
        </div>
        <h3 className="font-semibold text-slate-900 dark:text-white">Attachments</h3>
      </div>
      
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {attachments.map((attachment) => {
          const thumbnailUrl = getThumbnailUrl(attachment.url, attachment.type);
          const fileType = getFileType(attachment.url, attachment.type);
          
          return (
            <div
              key={attachment.id}
              className="group relative bg-slate-50 dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 overflow-hidden hover:shadow-md transition-all duration-200"
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
                    onClick={() => window.open(attachment.url, '_blank')}
                    className="h-8 px-2 text-xs"
                  >
                    <Download className="w-3 h-3 mr-1" />
                    View
                  </Button>
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() => handleDeleteAttachment(attachment.id)}
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
                <p className="text-xs font-medium text-slate-900 dark:text-white truncate">
                  {fileType}
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {formatDistanceToNow(new Date(attachment.createdAt), { addSuffix: true })}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
