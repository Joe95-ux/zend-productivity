"use client";

import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Download, X, ChevronLeft, ChevronRight, FileText, Image as ImageIcon, ChevronUp, ChevronDown } from "lucide-react";
import { Attachment } from "@/lib/types";
import { formatDistanceToNow } from "date-fns";
import { extractFilename } from "@/lib/file-utils";

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
  const [showThumbnails, setShowThumbnails] = useState(true);
  
  const currentAttachment = attachments[currentIndex];
  
  useEffect(() => {
    setImageError(false);
  }, [currentIndex]);


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
    link.download = currentAttachment.filename || getFileName(currentAttachment.url);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const getFileName = (url: string) => {
    return extractFilename(url);
  };

  const truncateFileName = (filename: string, maxLength: number = 30) => {
    if (filename.length <= maxLength) return filename;
    const extension = filename.split('.').pop();
    const nameWithoutExt = filename.substring(0, filename.lastIndexOf('.'));
    const truncatedName = nameWithoutExt.substring(0, maxLength - extension!.length - 4);
    return `${truncatedName}...${extension}`;
  };

  // Calculate modal width based on image dimensions
  // const getModalWidth = () => {
  //   if (!imageDimensions || !isImage) return 'max-w-4xl';
    
  //   const { width, height } = imageDimensions;
  //   const aspectRatio = width / height;
    
  //   // If image is very wide, use max width
  //   if (aspectRatio > 2) return 'max-w-6xl';
  //   // If image is very tall, use smaller width
  //   if (aspectRatio < 0.5) return 'max-w-2xl';
  //   // Default responsive width
  //   return 'max-w-4xl';
  // };

  const isImage = currentAttachment.type?.startsWith('image/') || 
                  currentAttachment.url.startsWith('data:image/') ||
                  (currentAttachment.type === 'url' && /\.(jpg|jpeg|png|gif|webp|svg)(\?.*)?$/i.test(currentAttachment.url));

  if (!currentAttachment) return null;

  return (
    <TooltipProvider>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent showCloseButton={false} className="w-full h-auto max-h-[85vh] sm:max-h-[95vh] sm:max-w-[calc(100vw-4rem)] max-w-[calc(100vw-2rem)] p-0 overflow-hidden gap-0">
          <DialogHeader className="p-6 tex-left
           gap-1">
            <div className="flex flex-col sm:flex-row items-left justify-between gap-2">
              <Tooltip>
                <TooltipTrigger asChild>
                  <DialogTitle className="mr-auto text-base sm:order-0 order-1 sm:text-lg font-semibold truncate max-w-[70%] sm:max-w-[75%]">
                    {truncateFileName(currentAttachment.filename || getFileName(currentAttachment.url))}
                  </DialogTitle>
                </TooltipTrigger>
                <TooltipContent>
                  <p className="max-w-xs break-words">{currentAttachment.filename || getFileName(currentAttachment.url)}</p>
                </TooltipContent>
              </Tooltip>
              <div className="ml-auto order-0 sm:order-1 flex items-center gap-1 sm:gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleDownload}
                  className="h-9 sm:h-9 px-2 sm:px-3 text-xs sm:text-sm"
                >
                  <Download className="w-3 h-3 sm:w-4 sm:h-4 sm:mr-2" />
                  <span className="inline">Download</span>
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onClose}
                  className="h-7 w-7 sm:h-8 sm:w-8 p-0"
                >
                  <X className="w-4 h-4 sm:w-5 sm:h-5" />
                </Button>
              </div>
            </div>
            <p className="mr-auto text-xs sm:text-sm text-slate-500 dark:text-slate-400">
              {formatDistanceToNow(new Date(currentAttachment.createdAt), { addSuffix: true })}
            </p>
          </DialogHeader>

        <div className="flex-1 w-full max-w-[inherit] flex flex-col bg-slate-50 dark:bg-slate-900">
          <div className="relative flex items-center justify-center p-6 h-full">
            {/* Navigation arrows */}
            {attachments.length > 1 && (
              <>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handlePrevious}
                  disabled={currentIndex === 0}
                  className="absolute left-4 top-1/2 -translate-y-1/2 z-10 h-10 w-10 p-0 bg-black/20 hover:bg-black/40 text-white"
                >
                  <ChevronLeft className="w-5 h-5" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleNext}
                  disabled={currentIndex === attachments.length - 1}
                  className="absolute right-4 top-1/2 -translate-y-1/2 z-10 h-10 w-10 p-0 bg-black/20 hover:bg-black/40 text-white"
                >
                  <ChevronRight className="w-5 h-5" />
                </Button>
              </>
            )}

            {/* Main image/content */}
            <div className="flex items-center justify-center w-full h-full">
              {isImage ? (
                <div className="relative w-full h-full flex items-center justify-center">
                  {!imageError ? (
                    <img
                      src={currentAttachment.url}
                      alt={currentAttachment.filename || getFileName(currentAttachment.url)}
                      className="max-w-full max-h-[60vh] w-auto h-auto object-contain block rounded-lg shadow-lg"
                      onError={() => setImageError(true)}
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
          </div>

          {/* Thumbnail strip*/}
          {attachments.length > 1 && (
            <div className="flex justify-center itmes-center bg-slate-100 dark:bg-slate-800 border-t border-slate-200 dark:border-slate-700 w-full">
              {/* Desktop thumbnail strip */}
              <div className="hidden sm:flex gap-2 p-3 h-full items-center overflow-x-auto md:max-w-[70%] lg:max-w-[60%] max-w-full">
                {attachments.map((attachment, index) => (
                  <button
                    key={attachment.id}
                    onClick={() => onIndexChange(index)}
                    className={`relative min-w-8 min-h-8 2xl:w-16 2xl:h-16 w-12 h-12 flex-shrink-0 rounded overflow-hidden border-2 transition-all ${
                      index === currentIndex 
                        ? 'border-blue-500 ring-2 ring-blue-200' 
                        : 'border-transparent hover:border-slate-300'
                    }`}
                  >
                    {attachment.type?.startsWith('image/') || attachment.url.startsWith('data:image/') || (attachment.type === 'url' && /\.(jpg|jpeg|png|gif|webp|svg)(\?.*)?$/i.test(attachment.url)) ? (
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

              {/* Mobile thumbnail strip */}
              <div className="sm:hidden overflow-x-auto flex flex-col h-full">
                {/* Toggle button - top right */}
                <div className="flex justify-end px-2 py-0">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowThumbnails(!showThumbnails)}
                    className="h-6 w-6 p-0 text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
                  >
                    {showThumbnails ? (
                      <ChevronDown className="w-4 h-4" />
                    ) : (
                      <ChevronUp className="w-4 h-4" />
                    )}
                  </Button>
                </div>

                {/* Thumbnail strip */}
                {showThumbnails && (
                  <div className="flex gap-1.5 p-2 overflow-x-auto">
                    {attachments.map((attachment, index) => (
                      <button
                        key={attachment.id}
                        onClick={() => onIndexChange(index)}
                        className={`relative w-10 h-10 rounded overflow-hidden border-2 transition-all flex-shrink-0 ${
                          index === currentIndex 
                            ? 'border-blue-500 ring-2 ring-blue-200' 
                            : 'border-transparent hover:border-slate-300'
                        }`}
                      >
                        {attachment.type?.startsWith('image/') || attachment.url.startsWith('data:image/') || (attachment.type === 'url' && /\.(jpg|jpeg|png|gif|webp|svg)(\?.*)?$/i.test(attachment.url)) ? (
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
                            <FileText className="w-2.5 h-2.5" />
                          </div>
                        )}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
    </TooltipProvider>
  );
}
