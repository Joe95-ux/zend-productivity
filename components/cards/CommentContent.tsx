"use client";

import { useState } from "react";
import { Image as ImageIcon, ExternalLink } from "lucide-react";
import DOMPurify from "dompurify";

interface CommentContentProps {
  content: string;
  className?: string;
}

export function CommentContent({ content, className = "" }: CommentContentProps) {
  const [imageErrors, setImageErrors] = useState<Set<string>>(new Set());

  // Function to handle image errors
  const handleImageError = (src: string) => {
    setImageErrors(prev => new Set(prev).add(src));
  };

  // Function to render content with proper image handling
  const renderContent = () => {
    // Sanitize the HTML content
    const sanitizedHtml = DOMPurify.sanitize(content, { 
      USE_PROFILES: { html: true },
      ALLOWED_TAGS: ['p', 'br', 'strong', 'em', 'u', 'a', 'img', 'div', 'span'],
      ALLOWED_ATTR: ['href', 'target', 'rel', 'src', 'alt', 'class', 'style']
    });

    // Parse the HTML to extract elements
    const parser = new DOMParser();
    const doc = parser.parseFromString(sanitizedHtml, 'text/html');
    const elements = Array.from(doc.body.childNodes);

    return elements.map((node, index) => {
      if (node.nodeName === 'IMG') {
        const imgElement = node as HTMLImageElement;
        const src = imgElement.src;
        const alt = imgElement.alt || 'Comment image';
        
        if (imageErrors.has(src)) {
          return (
            <div key={index} className="my-2 p-3 bg-slate-100 dark:bg-slate-800 rounded-md border border-slate-200 dark:border-slate-700">
              <div className="flex items-center gap-2">
                <ImageIcon className="w-4 h-4 text-slate-500" />
                <span className="text-sm text-slate-600 dark:text-slate-400">Image failed to load</span>
                <a 
                  href={src} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:text-blue-800"
                >
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            </div>
          );
        }

        return (
          <div key={index} className="my-2 rounded-lg overflow-hidden border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800">
            <img
              src={src}
              alt={alt}
              onError={() => handleImageError(src)}
              onClick={() => window.open(src, '_blank')}
              className="max-w-full h-auto cursor-pointer hover:opacity-90 transition-opacity"
              style={{ maxHeight: '300px', objectFit: 'contain' }}
            />
            <div className="p-2 bg-slate-50 dark:bg-slate-700 border-t border-slate-200 dark:border-slate-600">
              <a 
                href={src} 
                target="_blank" 
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-xs text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 transition-colors"
              >
                <ExternalLink className="w-3 h-3" />
                View full size
              </a>
            </div>
          </div>
        );
      } else if (node.nodeType === Node.TEXT_NODE) {
        return <span key={index}>{node.textContent}</span>;
      } else {
        // For other HTML elements, render them safely
        return (
          <div 
            key={index} 
            dangerouslySetInnerHTML={{ __html: node.outerHTML }} 
          />
        );
      }
    });
  };

  return (
    <div className={`text-sm text-slate-900 dark:text-slate-300 leading-relaxed prose prose-sm max-w-none ${className}`}>
      {renderContent()}
    </div>
  );
}
