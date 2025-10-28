/**
 * File upload utilities for handling attachments and images
 */

export interface FileUploadResult {
  url: string;
  filename: string;
  type: string;
  size: number;
}

/**
 * Convert file to base64 data URL with filename metadata
 */
export function fileToBase64(file: File): Promise<FileUploadResult> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = (e) => {
      const base64 = e.target?.result as string;
      
      resolve({
        url: base64,
        filename: file.name,
        type: file.type,
        size: file.size
      });
    };
    
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsDataURL(file);
  });
}

/**
 * Validate file before upload
 */
export function validateFile(
  file: File, 
  acceptedTypes: string = "image/*", 
  maxSizeMB: number = 5
): { valid: boolean; error?: string } {
  // Check file type
  if (acceptedTypes !== "*/*") {
    const typePattern = acceptedTypes.replace(/\*/g, ".*");
    if (!file.type.match(typePattern)) {
      return {
        valid: false,
        error: `Invalid file type. Accepted: ${acceptedTypes}`
      };
    }
  }

  // Check file size
  const maxSizeBytes = maxSizeMB * 1024 * 1024;
  if (file.size > maxSizeBytes) {
    return {
      valid: false,
      error: `File size must be less than ${maxSizeMB}MB`
    };
  }

  return { valid: true };
}

/**
 * Extract filename from URL or data URL
 */
export function extractFilename(url: string): string {
  // Handle base64 data URLs
  if (url.startsWith('data:')) {
    return 'uploaded-file';
  }
  
  // Handle regular URLs
  try {
    const urlObj = new URL(url);
    const pathname = urlObj.pathname;
    const filename = pathname.split('/').pop() || 'attachment';
    return decodeURIComponent(filename);
  } catch {
    // Fallback for invalid URLs
    const filename = url.split('/').pop() || 'attachment';
    return decodeURIComponent(filename);
  }
}

/**
 * Get file type category for display
 */
export function getFileTypeCategory(mimeType: string): string {
  if (mimeType.startsWith('image/')) return 'image';
  if (mimeType.startsWith('video/')) return 'video';
  if (mimeType.startsWith('audio/')) return 'audio';
  if (mimeType.includes('pdf')) return 'pdf';
  if (mimeType.includes('word') || mimeType.includes('document')) return 'document';
  if (mimeType.includes('sheet') || mimeType.includes('excel')) return 'spreadsheet';
  if (mimeType.includes('presentation') || mimeType.includes('powerpoint')) return 'presentation';
  return 'file';
}
