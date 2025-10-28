"use client";

import { useState, useCallback } from "react";
import { Button } from "./button";
import { Input } from "./input";
import { Label } from "./label";
import { Popover, PopoverContent, PopoverTrigger } from "./popover";
import { Image as ImageIcon, Upload, Link as LinkIcon } from "lucide-react";

interface AttachmentUploadProps {
  onFileUpload: (file: File) => void;
  onUrlUpload: (url: string) => void;
  isUploading?: boolean;
  acceptedTypes?: string;
  maxSize?: number; // in MB
  children?: React.ReactNode;
  variant?: "button" | "icon";
}

export function AttachmentUpload({
  onFileUpload,
  onUrlUpload,
  isUploading = false,
  acceptedTypes = "image/*",
  maxSize = 5,
  children,
  variant = "button"
}: AttachmentUploadProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [url, setUrl] = useState("");

  const handleFileUpload = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Check file type
    if (!file.type.match(acceptedTypes.replace("*", ".*"))) {
      alert(`Please select a valid file type. Accepted: ${acceptedTypes}`);
      return;
    }

    // Check file size
    if (file.size > maxSize * 1024 * 1024) {
      alert(`File size must be less than ${maxSize}MB`);
      return;
    }

    onFileUpload(file);
    setIsOpen(false);
  }, [onFileUpload, acceptedTypes, maxSize]);

  const handleUrlUpload = useCallback(() => {
    if (url.trim()) {
      onUrlUpload(url.trim());
      setUrl("");
      setIsOpen(false);
    }
  }, [url, onUrlUpload]);

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleUrlUpload();
    }
  };

  const triggerButton = children || (
    variant === "icon" ? (
      <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
        <ImageIcon className="w-4 h-4" />
      </Button>
    ) : (
      <Button variant="outline" size="sm" disabled={isUploading}>
        <Upload className="w-4 h-4 mr-2" />
        {isUploading ? 'Uploading...' : 'Upload Attachment'}
      </Button>
    )
  );

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        {triggerButton}
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0 dark:bg-[#0D1117] max-h-96 flex flex-col" align="start">
        {/* Header */}
        <div className="flex items-center justify-between p-4 flex-shrink-0">
          <h3 className="text-[16px] font-semibold text-slate-900 dark:text-white">
            Add Attachment
          </h3>
          <button
            onClick={() => setIsOpen(false)}
            className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-md transition-colors"
          >
            <X className="w-4 h-4 text-slate-500 dark:text-slate-400" />
          </button>
        </div>
        
        <div className="p-4 space-y-4 flex-1 overflow-y-auto scrollbar-thin">
          
          {/* File Upload */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">Upload File</Label>
            <div className="flex items-center gap-2">
              <input
                type="file"
                accept={acceptedTypes}
                onChange={handleFileUpload}
                className="hidden"
                id="attachment-upload"
                disabled={isUploading}
              />
              <label
                htmlFor="attachment-upload"
                className="flex-1 px-3 py-2 text-sm border border-slate-300 dark:border-slate-600 rounded-md cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isUploading ? 'Uploading...' : 'Choose File'}
              </label>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Max {maxSize}MB, {acceptedTypes}
            </p>
          </div>

          <div className="flex items-center gap-2">
            <div className="flex-1 h-px bg-slate-200 dark:bg-slate-700" />
            <span className="text-xs text-slate-500 dark:text-slate-400">or</span>
            <div className="flex-1 h-px bg-slate-200 dark:bg-slate-700" />
          </div>

          {/* URL Input */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">File URL</Label>
            <div className="flex gap-2">
              <Input
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://example.com/file.pdf"
                className="flex-1 h-8 text-sm"
                onKeyPress={handleKeyPress}
              />
              <Button
                onClick={handleUrlUpload}
                disabled={!url || isUploading}
                size="sm"
                className="h-8 px-3"
              >
                <LinkIcon className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
