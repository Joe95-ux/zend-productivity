"use client";

import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Download, X, ChevronLeft, ChevronRight, FileText, Image as ImageIcon } from "lucide-react";
import { Attachment } from "@/lib/types";
import { formatDistanceToNow } from "date-fns";

interface AttachmentViewerModalProps {
  isOpen: boolean;
  onClose: () => void;
  attachments: Attachment[];
  currentIndex: number;
  onIndexChange: (index: number) => void;
}

export function AttachmentViewerModal({ 
  isOpen, 
  onClose, 
  attachments, 
  currentIndex, 
  onIndexChange 
}: AttachmentViewerModalProps) {
  const [imageError, setImageError] = useState(false);
  const [imageDimensions, setImageDimensions] = useState<{ width: number; height: number } | null>(null);
  
  const currentAttachment = attachments[currentIndex];
  
  useEffect(() => {
    setImageError(false);
    setImageDimensions(null);
  }, [currentIndex]);

  const handleImageLoad = (event: React.SyntheticEvent<HTMLImageElement>) => {
    const img = event.currentTarget;
    setImageDimensions({
      width: img.naturalWidth,
      height: img.naturalHeight
    });
  };

  const handlePrevious = () => {
    const newIndex = currentIndex > 0 ? currentIndex - 1 : attachments.length - 1;
    onIndexChange(newIndex);
  };

  const handleNext = () => {
    const newIndex = currentIndex < attachments.length - 1 ? currentIndex + 1 : 0;
    onIndexChange(newIndex);
  };

  const handleDownload = () => {
    const link = document.createElement('a');
    link.href = currentAttachment.url;
    link.download = getFileName(currentAttachment.url);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const getFileName = (url: string) => {
    // Extract filename from URL
    const filename = url.split('/').pop() || 'attachment';
    return filename;
  };

  const truncateFileName = (filename: string, maxLength: number = 30) => {
    if (filename.length <= maxLength) return filename;
    const extension = filename.split('.').pop();
    const nameWithoutExt = filename.substring(0, filename.lastIndexOf('.'));
    const truncatedName = nameWithoutExt.substring(0, maxLength - extension!.length - 4);
    return `${truncatedName}...${extension}`;
  };

  // Calculate modal width based on image dimensions
  const getModalWidth = () => {
    if (!imageDimensions || !isImage) return 'max-w-4xl';
    
    const { width, height } = imageDimensions;
    const aspectRatio = width / height;
    const maxWidth = Math.min(width, window.innerWidth * 0.9);
    const maxHeight = Math.min(height, window.innerHeight * 0.8);
    
    // If image is very wide, use max width
    if (aspectRatio > 2) return 'max-w-6xl';
    // If image is very tall, use smaller width
    if (aspectRatio < 0.5) return 'max-w-2xl';
    // Default responsive width
    return 'max-w-4xl';
  };

  const isImage = currentAttachment.type === 'image';

  if (!currentAttachment) return null;

  return (
    <TooltipProvider>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent showCloseButton={false} className={`${getModalWidth()} max-h-[90vh] p-0 overflow-hidden`}>
          <DialogHeader className="p-6 pb-4">
            <div className="flex items-center justify-between">
              <Tooltip>
                <TooltipTrigger asChild>
                  <DialogTitle className="text-lg font-semibold truncate max-w-[60%]">
                    {truncateFileName(getFileName(currentAttachment.url))}
                  </DialogTitle>
                </TooltipTrigger>
                <TooltipContent>
                  <p className="max-w-xs break-words">{getFileName(currentAttachment.url)}</p>
                </TooltipContent>
              </Tooltip>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleDownload}
                className="h-8"
              >
                <Download className="w-4 h-4 mr-2" />
                Download
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={onClose}
                className="h-8 w-8 p-0"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          </div>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            {formatDistanceToNow(new Date(currentAttachment.createdAt), { addSuffix: true })}
          </p>
        </DialogHeader>

        <div className="flex-1 relative bg-slate-50 dark:bg-slate-900">
          {/* Navigation arrows */}
          {attachments.length > 1 && (
            <>
              <Button
                variant="ghost"
                size="sm"
                onClick={handlePrevious}
                className="absolute left-4 top-1/2 -translate-y-1/2 z-10 h-10 w-10 p-0 bg-black/20 hover:bg-black/40 text-white"
              >
                <ChevronLeft className="w-5 h-5" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleNext}
                className="absolute right-4 top-1/2 -translate-y-1/2 z-10 h-10 w-10 p-0 bg-black/20 hover:bg-black/40 text-white"
              >
                <ChevronRight className="w-5 h-5" />
              </Button>
            </>
          )}

          {/* Content area */}
          <div className="flex items-center justify-center min-h-[60vh] p-6">
            {isImage ? (
              <div className="relative w-full h-full flex items-center justify-center">
                {!imageError ? (
                  <img
                    src={currentAttachment.url}
                    alt={getFileName(currentAttachment.url)}
                    className="max-w-full max-h-[70vh] w-auto h-auto object-contain rounded-lg shadow-lg"
                    onError={() => setImageError(true)}
                    onLoad={handleImageLoad}
                  />
                ) : (
                  <div className="flex flex-col items-center justify-center h-64 text-slate-500 dark:text-slate-400">
                    <ImageIcon className="w-16 h-16 mb-4" />
                    <p className="text-lg font-medium">Failed to load image</p>
                    <p className="text-sm">The image could not be displayed</p>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-64 text-slate-500 dark:text-slate-400">
                <FileText className="w-16 h-16 mb-4" />
                <p className="text-lg font-medium">Preview not available</p>
                <p className="text-sm mb-4">This file type cannot be previewed</p>
                <Button onClick={handleDownload} variant="outline">
                  <Download className="w-4 h-4 mr-2" />
                  Download to view
                </Button>
              </div>
            )}
          </div>

          {/* Thumbnail strip */}
          {attachments.length > 1 && (
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2">
              <div className="flex gap-2 bg-black/20 backdrop-blur-sm rounded-lg p-2">
                {attachments.map((attachment, index) => (
                  <button
                    key={attachment.id}
                    onClick={() => onIndexChange(index)}
                    className={`relative w-12 h-12 rounded overflow-hidden border-2 transition-all ${
                      index === currentIndex 
                        ? 'border-blue-500 ring-2 ring-blue-200' 
                        : 'border-transparent hover:border-slate-300'
                    }`}
                  >
                    {attachment.type === 'image' ? (
                      <img
                        src={attachment.url}
                        alt=""
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          e.currentTarget.style.display = 'none';
                        }}
                      />
                    ) : (
                      <div className="w-full h-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center">
                        <FileText className="w-4 h-4" />
                      </div>
                    )}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
    </TooltipProvider>
  );
}
