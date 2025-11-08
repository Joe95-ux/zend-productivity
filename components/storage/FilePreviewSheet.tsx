"use client";

import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { FileText, Image, Download, ExternalLink, Calendar, Folder, File } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";

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

interface FilePreviewSheetProps {
  file: FileItem;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function FilePreviewSheet({ file, open, onOpenChange }: FilePreviewSheetProps) {
  const url = file.url?.toLowerCase() || "";
  const isImage = file.type?.startsWith("image/") || 
    file.filename?.match(/\.(jpg|jpeg|png|gif|webp|svg)$/i) ||
    url.startsWith('data:image/') ||
    ((url.startsWith('http://') || url.startsWith('https://')) && /\.(jpg|jpeg|png|gif|webp|svg)(\?.*)?$/i.test(file.url));


  const getFileIcon = () => {
    const fileType = file.type?.toLowerCase() || "";
    const filename = file.filename?.toLowerCase() || "";
    const urlLower = file.url?.toLowerCase() || "";
    
    if (fileType.startsWith("image/") || 
        filename.match(/\.(jpg|jpeg|png|gif|webp|svg)$/i) ||
        urlLower.startsWith('data:image/') ||
        ((urlLower.startsWith('http://') || urlLower.startsWith('https://')) && /\.(jpg|jpeg|png|gif|webp|svg)(\?.*)?$/i.test(file.url))) {
      return Image;
    }
    return FileText;
  };

  const getFileTypeLabel = () => {
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
      return "Word Document";
    }
    if (fileType.includes("excel") || filename.match(/\.(xls|xlsx)$/)) {
      return "Excel Spreadsheet";
    }
    if (fileType.includes("powerpoint") || filename.match(/\.(ppt|pptx)$/)) {
      return "PowerPoint Presentation";
    }
    return "File";
  };

  const formatFileSize = () => {
    if (file.url.startsWith("data:")) {
      const base64Length = file.url.split(",")[1]?.length || 0;
      const sizeInBytes = (base64Length * 3) / 4;
      if (sizeInBytes < 1024) return `${Math.round(sizeInBytes)} B`;
      if (sizeInBytes < 1024 * 1024) return `${(sizeInBytes / 1024).toFixed(1)} KB`;
      return `${(sizeInBytes / (1024 * 1024)).toFixed(1)} MB`;
    }
    return "—";
  };

  const handleDownload = () => {
    if (file.url.startsWith("data:")) {
      const link = document.createElement("a");
      link.href = file.url;
      link.download = file.filename || "file";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } else {
      window.open(file.url, "_blank");
    }
  };

  const handleOpenInNewTab = () => {
    window.open(file.url, "_blank");
  };

  const FileIcon = getFileIcon();

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:w-[400px] md:w-[480px] overflow-y-auto p-0">
        <div className="flex flex-col h-full">
          <SheetHeader className="px-6 pt-6 pb-4 border-b">
            <SheetTitle className="truncate text-lg">{file.filename || "Untitled File"}</SheetTitle>
          </SheetHeader>

          <div className="flex-1 overflow-y-auto px-6 py-6">
            {/* File Preview */}
            <div className="mb-6">
              {isImage && file.url ? (
                <div className="flex items-center justify-center min-h-[200px] max-h-[400px]">
                  <img
                    src={file.url}
                    alt={file.filename || "Image"}
                    className="max-w-full max-h-full object-contain"
                    onError={(e) => {
                      // Fallback to icon if image fails to load
                      e.currentTarget.style.display = 'none';
                      const iconContainer = e.currentTarget.nextElementSibling as HTMLElement;
                      if (iconContainer) {
                        iconContainer.style.display = 'flex';
                      }
                    }}
                  />
                </div>
              ) : (
                <div className="rounded-lg border bg-muted/50 p-6 flex items-center justify-center min-h-[200px] max-h-[400px]">
                  <div className="flex flex-col items-center gap-4">
                    <FileIcon className="h-16 w-16 text-muted-foreground" />
                    <p className="text-sm text-muted-foreground">{getFileTypeLabel()}</p>
                  </div>
                </div>
              )}
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-2 mb-6">
              <Button onClick={handleDownload} variant="outline" className="flex-1">
                <Download className="h-4 w-4 mr-2" />
                Download
              </Button>
              <Button onClick={handleOpenInNewTab} variant="outline" className="flex-1">
                <ExternalLink className="h-4 w-4 mr-2" />
                Open
              </Button>
            </div>

            <Separator className="mb-6" />

            {/* File Details */}
            <div className="space-y-4">
              <h3 className="text-sm font-semibold">Details</h3>
              
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Type</span>
                  <Badge variant="secondary">{getFileTypeLabel()}</Badge>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Size</span>
                  <span className="text-sm font-medium">{formatFileSize()}</span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    Uploaded
                  </span>
                  <span className="text-sm font-medium">
                    {formatDistanceToNow(new Date(file.createdAt), { addSuffix: true })}
                  </span>
                </div>

                <Separator />

                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Folder className="h-4 w-4" />
                    <span>Location</span>
                  </div>
                  <div className="pl-6 space-y-1">
                    <div className="flex items-center gap-2">
                      <File className="h-3 w-3 text-muted-foreground" />
                      <span className="text-sm font-medium">{file.card.list.board.title}</span>
                    </div>
                    <div className="pl-4">
                      <span className="text-sm text-muted-foreground">→ {file.card.title}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}

