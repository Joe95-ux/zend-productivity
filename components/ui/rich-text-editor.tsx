"use client";

import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Image from '@tiptap/extension-image';
import Link from '@tiptap/extension-link';
import Placeholder from '@tiptap/extension-placeholder';
import DOMPurify from 'dompurify';
import { useCallback, useEffect, useState } from 'react';
import { toast } from "sonner";
import { Button } from './button';
import { 
  Bold as BoldIcon, 
  Italic as ItalicIcon, 
  Strikethrough as StrikeIcon,
  Code as CodeIcon,
  Link as LinkIcon,
  List as ListIcon,
  ListOrdered as OrderedListIcon,
  Quote as QuoteIcon,
  Heading1 as H1Icon,
  Heading2 as H2Icon,
  Heading3 as H3Icon,
  Undo as UndoIcon,
  Redo as RedoIcon,
  X as XIcon
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { AttachmentUpload } from './AttachmentUpload';
import { fileToBase64, validateFile } from '@/lib/file-utils';

interface RichTextEditorProps {
  content?: string;
  onChange?: (content: string) => void;
  placeholder?: string;
  className?: string;
  minHeight?: string;
  maxHeight?: string;
  showToolbar?: boolean;
  editable?: boolean;
}


export function RichTextEditor({
  content = '',
  onChange,
  placeholder = 'Start typing...',
  className,
  minHeight = '2.5rem',
  maxHeight = '20rem',
  showToolbar = true,
  editable = true
}: RichTextEditorProps) {
  const [isLinkModalOpen, setIsLinkModalOpen] = useState(false);
  const [linkUrl, setLinkUrl] = useState('');
  const [isToolbarExpanded, setIsToolbarExpanded] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        codeBlock: false,
      }),
      Image.configure({
        HTMLAttributes: {
          class: 'max-w-full h-auto rounded-md w-full object-contain',
        },
      }),
      Link.configure({
        openOnClick: false,
        HTMLAttributes: {
          class: 'text-blue-600 underline cursor-pointer break-all',
        },
      }),
      Placeholder.configure({
        placeholder,
      }),
    ],
    content: content,
    editable,
    immediatelyRender: false,
    editorProps: {
      attributes: {
        style: 'width: 100%; max-width: 100%; box-sizing: border-box; word-wrap: break-word; overflow-wrap: break-word; word-break: break-word;',
      },
    },
    onUpdate: ({ editor }) => {
      const html = editor.getHTML();
      const sanitizedHtml = DOMPurify.sanitize(html, { 
        USE_PROFILES: { html: true },
        ALLOWED_TAGS: ['p', 'br', 'strong', 'em', 'u', 'a', 'img', 'div', 'span', 'h1', 'h2', 'h3', 'ul', 'ol', 'li', 'blockquote', 'code', 'pre'],
        ALLOWED_ATTR: ['href', 'target', 'rel', 'src', 'alt', 'class', 'style']
      });
      onChange?.(sanitizedHtml);
    },
  });

  useEffect(() => {
    if (editor && content !== editor.getHTML()) {
      // Use a small delay to ensure the editor is fully ready
      const timer = setTimeout(() => {
        // Don't sanitize content when loading it into the editor
        // Only sanitize when saving/updating
        editor.commands.setContent(content);
      }, 10);
      return () => clearTimeout(timer);
    }
  }, [content, editor]);

  const addLink = useCallback(() => {
    if (linkUrl && editor) {
      editor.chain().focus().setLink({ href: linkUrl }).run();
      setLinkUrl('');
      setIsLinkModalOpen(false);
    }
  }, [editor, linkUrl]);

  const addImage = useCallback((url: string) => {
    if (url && editor) {
      editor.chain().focus().setImage({ src: url }).run();
    }
  }, [editor]);

  const handleFileUpload = useCallback(async (file: File) => {
    const validation = validateFile(file, "image/*", 2);
    if (!validation.valid) {
      toast.error(validation.error);
      return;
    }

    setIsUploading(true);
    const loadingToastId = toast.loading(`Uploading "${file.name}"...`);
    
    try {
      const result = await fileToBase64(file);
      editor?.chain().focus().setImage({ src: result.url }).run();
      toast.dismiss(loadingToastId);
      toast.success(`Image "${file.name}" uploaded successfully!`);
    } catch (error) {
      console.error('Error uploading image:', error);
      toast.dismiss(loadingToastId);
      toast.error('Failed to upload image');
    } finally {
      setIsUploading(false);
    }
  }, [editor]);

  if (!editor) {
    return null;
  }

  return (
    <div className={cn("border border-slate-200 dark:border-slate-700 rounded-md w-full max-w-full overflow-hidden", className)}>
      {showToolbar && (
        <div className="border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800">
          {/* First Line - Basic Tools */}
          <div className="flex items-center justify-between p-2">
            <div className="flex items-center gap-1">
              {/* Text Formatting */}
              <div className="flex items-center gap-1">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    editor.chain().focus().toggleBold().run();
                  }}
                  className={cn(
                    "h-8 w-8 p-0",
                    editor.isActive('bold') && "bg-slate-200 dark:bg-slate-700"
                  )}
                >
                  <BoldIcon className="w-4 h-4" />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    editor.chain().focus().toggleItalic().run();
                  }}
                  className={cn(
                    "h-8 w-8 p-0",
                    editor.isActive('italic') && "bg-slate-200 dark:bg-slate-700"
                  )}
                >
                  <ItalicIcon className="w-4 h-4" />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    editor.chain().focus().toggleStrike().run();
                  }}
                  className={cn(
                    "h-8 w-8 p-0",
                    editor.isActive('strike') && "bg-slate-200 dark:bg-slate-700"
                  )}
                >
                  <StrikeIcon className="w-4 h-4" />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    editor.chain().focus().toggleCode().run();
                  }}
                  className={cn(
                    "h-8 w-8 p-0",
                    editor.isActive('code') && "bg-slate-200 dark:bg-slate-700"
                  )}
                >
                  <CodeIcon className="w-4 h-4" />
                </Button>
              </div>

              <div className="w-px h-6 bg-slate-300 dark:bg-slate-600 mx-2" />

              {/* Links and Images */}
              <div className="flex items-center gap-1">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setIsLinkModalOpen(true);
                  }}
                  className="h-8 w-8 p-0"
                >
                  <LinkIcon className="w-4 h-4" />
                </Button>
                <AttachmentUpload
                  onFileUpload={handleFileUpload}
                  onUrlUpload={addImage}
                  isUploading={isUploading}
                  acceptedTypes="image/*"
                  maxSize={2}
                  variant="icon"
                />
              </div>

              <div className="w-px h-6 bg-slate-300 dark:bg-slate-600 mx-2" />

              {/* History */}
              <div className="flex items-center gap-1">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    editor.chain().focus().undo().run();
                  }}
                  disabled={!editor.can().undo()}
                  className="h-8 w-8 p-0"
                >
                  <UndoIcon className="w-4 h-4" />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    editor.chain().focus().redo().run();
                  }}
                  disabled={!editor.can().redo()}
                  className="h-8 w-8 p-0"
                >
                  <RedoIcon className="w-4 h-4" />
                </Button>
              </div>
            </div>

            {/* Expand/Collapse Button */}
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setIsToolbarExpanded(!isToolbarExpanded);
              }}
              className="h-8 w-8 p-0"
            >
              <svg
                className={cn("w-4 h-4 transition-transform", isToolbarExpanded && "rotate-180")}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </Button>
          </div>

          {/* Second Line - Advanced Tools (Collapsible) */}
          {isToolbarExpanded && (
            <div className="flex items-center gap-1 p-2 pt-0 border-t border-slate-200 dark:border-slate-700">
              {/* Headings */}
              <div className="flex items-center gap-1">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    editor.chain().focus().toggleHeading({ level: 1 }).run();
                  }}
                  className={cn(
                    "h-8 w-8 p-0",
                    editor.isActive('heading', { level: 1 }) && "bg-slate-200 dark:bg-slate-700"
                  )}
                >
                  <H1Icon className="w-4 h-4" />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    editor.chain().focus().toggleHeading({ level: 2 }).run();
                  }}
                  className={cn(
                    "h-8 w-8 p-0",
                    editor.isActive('heading', { level: 2 }) && "bg-slate-200 dark:bg-slate-700"
                  )}
                >
                  <H2Icon className="w-4 h-4" />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    editor.chain().focus().toggleHeading({ level: 3 }).run();
                  }}
                  className={cn(
                    "h-8 w-8 p-0",
                    editor.isActive('heading', { level: 3 }) && "bg-slate-200 dark:bg-slate-700"
                  )}
                >
                  <H3Icon className="w-4 h-4" />
                </Button>
              </div>

              <div className="w-px h-6 bg-slate-300 dark:bg-slate-600 mx-2" />

              {/* Lists */}
              <div className="flex items-center gap-1">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    editor.chain().focus().toggleBulletList().run();
                  }}
                  className={cn(
                    "h-8 w-8 p-0",
                    editor.isActive('bulletList') && "bg-slate-200 dark:bg-slate-700"
                  )}
                >
                  <ListIcon className="w-4 h-4" />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    editor.chain().focus().toggleOrderedList().run();
                  }}
                  className={cn(
                    "h-8 w-8 p-0",
                    editor.isActive('orderedList') && "bg-slate-200 dark:bg-slate-700"
                  )}
                >
                  <OrderedListIcon className="w-4 h-4" />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    editor.chain().focus().toggleBlockquote().run();
                  }}
                  className={cn(
                    "h-8 w-8 p-0",
                    editor.isActive('blockquote') && "bg-slate-200 dark:bg-slate-700"
                  )}
                >
                  <QuoteIcon className="w-4 h-4" />
                </Button>
              </div>
            </div>
          )}
        </div>
      )}

      <div
        className="prose prose-sm max-w-none p-3 focus-within:outline-none w-full max-w-full box-border"
        style={{
          minHeight,
          maxHeight: showToolbar ? maxHeight : 'none',
          overflowY: 'auto',
          overflowX: 'hidden'
        }}
      >
        <EditorContent 
          editor={editor}
          className="w-full max-w-full [&_.ProseMirror]:outline-none 
                     [&_.ProseMirror]:border-none 
                     [&_.ProseMirror]:bg-transparent 
                     [&_.ProseMirror]:min-h-[2.5rem] 
                     [&_.ProseMirror]:p-0 
                     [&_.ProseMirror]:focus:ring-0 
                     [&_.ProseMirror]:focus:border-none 
                     [&_.ProseMirror]:resize-none 
                     [&_.ProseMirror]:w-full 
                     [&_.ProseMirror]:max-w-full 
                     [&_.ProseMirror]:box-border
                     [&_.ProseMirror]:break-words 
                     [&_.ProseMirror]:whitespace-pre-wrap 
                     [&_.ProseMirror]:overflow-wrap-break-word
                     [&_.ProseMirror]:word-break-break-word 
                     [&_.ProseMirror]:overflow-x-hidden 
                     [&_.ProseMirror]:overflow-y-auto 
                     [&_.ProseMirror>p]:max-w-full 
                     [&_.ProseMirror>p]:w-full
                     [&_.ProseMirror>p]:box-border
                     [&_.ProseMirror>p]:break-words
                     [&_.ProseMirror>p]:overflow-wrap-break-word
                     [&_.ProseMirror>p]:word-break-break-word
                     [&_.ProseMirror>div]:max-w-full 
                     [&_.ProseMirror>div]:w-full
                     [&_.ProseMirror>div]:box-border
                     [&_.ProseMirror>div]:break-words
                     [&_.ProseMirror>img]:max-w-full 
                     [&_.ProseMirror>img]:h-auto
                     [&_.ProseMirror>pre]:max-w-full 
                     [&_.ProseMirror>pre]:overflow-x-auto
                     [&_.ProseMirror>a]:break-all
                     [&_.ProseMirror]:text-wrap"
        />
      </div>

      {/* Link Modal */}
      {isLinkModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-slate-900 p-6 rounded-lg w-96">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Add Link</h3>
              <button
                onClick={() => setIsLinkModalOpen(false)}
                className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-md transition-colors"
              >
                <XIcon className="w-4 h-4 text-slate-500 dark:text-slate-400" />
              </button>
            </div>
            <input
              type="url"
              value={linkUrl}
              onChange={(e) => setLinkUrl(e.target.value)}
              placeholder="Enter URL..."
              className="w-full p-2 border border-slate-300 dark:border-slate-600 rounded-md mb-4"
              autoFocus
            />
            <div className="flex gap-2">
              <Button onClick={addLink} disabled={!linkUrl}>
                Add Link
              </Button>
              <Button variant="outline" onClick={() => setIsLinkModalOpen(false)}>
                Cancel
              </Button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
