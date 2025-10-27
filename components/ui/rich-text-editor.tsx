"use client";

import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Image from '@tiptap/extension-image';
import Link from '@tiptap/extension-link';
import Placeholder from '@tiptap/extension-placeholder';
import DOMPurify from 'dompurify';
import { useCallback, useEffect, useState } from 'react';
import { Button } from './button';
import { Input } from './input';
import { Label } from './label';
import { Popover, PopoverContent, PopoverTrigger } from './popover';
import { 
  Bold as BoldIcon, 
  Italic as ItalicIcon, 
  Strikethrough as StrikeIcon,
  Code as CodeIcon,
  Link as LinkIcon,
  Image as ImageIcon,
  List as ListIcon,
  ListOrdered as OrderedListIcon,
  Quote as QuoteIcon,
  Heading1 as H1Icon,
  Heading2 as H2Icon,
  Heading3 as H3Icon,
  Undo as UndoIcon,
  Redo as RedoIcon
} from 'lucide-react';
import { cn } from '@/lib/utils';

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
  const [isImagePopoverOpen, setIsImagePopoverOpen] = useState(false);
  const [linkUrl, setLinkUrl] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [isToolbarExpanded, setIsToolbarExpanded] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        codeBlock: false,
      }),
      Image.configure({
        HTMLAttributes: {
          class: 'max-w-full h-auto rounded-md',
        },
      }),
      Link.configure({
        openOnClick: false,
        HTMLAttributes: {
          class: 'text-blue-600 underline cursor-pointer',
        },
      }),
      Placeholder.configure({
        placeholder,
      }),
    ],
    content: content,
    editable,
    immediatelyRender: false,
    onUpdate: ({ editor }) => {
      const html = editor.getHTML();
      const sanitizedHtml = DOMPurify.sanitize(html);
      onChange?.(sanitizedHtml);
    },
  });

  useEffect(() => {
    if (editor && content !== editor.getHTML()) {
      editor.commands.setContent(content);
    }
  }, [content, editor]);

  const addLink = useCallback(() => {
    if (linkUrl && editor) {
      editor.chain().focus().setLink({ href: linkUrl }).run();
      setLinkUrl('');
      setIsLinkModalOpen(false);
    }
  }, [editor, linkUrl]);

  const addImage = useCallback(() => {
    if (imageUrl && editor) {
      editor.chain().focus().setImage({ src: imageUrl }).run();
      setImageUrl('');
      setIsImagePopoverOpen(false);
    }
  }, [editor, imageUrl]);

  const handleFileUpload = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Check if it's an image
    if (!file.type.startsWith('image/')) {
      alert('Please select an image file');
      return;
    }

    // Check file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      alert('Image size must be less than 5MB');
      return;
    }

    setIsUploading(true);
    
    try {
      // Convert to base64 for now (in production, upload to a service like Cloudinary)
      const reader = new FileReader();
      reader.onload = (e) => {
        const base64 = e.target?.result as string;
        editor?.chain().focus().setImage({ src: base64 }).run();
        setIsImagePopoverOpen(false);
        setIsUploading(false);
      };
      reader.readAsDataURL(file);
    } catch (error) {
      console.error('Error uploading image:', error);
      alert('Failed to upload image');
      setIsUploading(false);
    }
  }, [editor]);

  if (!editor) {
    return null;
  }

  return (
    <div className={cn("border border-slate-200 dark:border-slate-700 rounded-md", className)}>
      {showToolbar && (
        <div className="border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800">
          {/* First Line - Basic Tools */}
          <div className="flex items-center justify-between p-2">
            <div className="flex items-center gap-1">
              {/* Text Formatting */}
              <div className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => editor.chain().focus().toggleBold().run()}
                  className={cn(
                    "h-8 w-8 p-0",
                    editor.isActive('bold') && "bg-slate-200 dark:bg-slate-700"
                  )}
                >
                  <BoldIcon className="w-4 h-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => editor.chain().focus().toggleItalic().run()}
                  className={cn(
                    "h-8 w-8 p-0",
                    editor.isActive('italic') && "bg-slate-200 dark:bg-slate-700"
                  )}
                >
                  <ItalicIcon className="w-4 h-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => editor.chain().focus().toggleStrike().run()}
                  className={cn(
                    "h-8 w-8 p-0",
                    editor.isActive('strike') && "bg-slate-200 dark:bg-slate-700"
                  )}
                >
                  <StrikeIcon className="w-4 h-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => editor.chain().focus().toggleCode().run()}
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
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsLinkModalOpen(true)}
                  className="h-8 w-8 p-0"
                >
                  <LinkIcon className="w-4 h-4" />
                </Button>
                <Popover open={isImagePopoverOpen} onOpenChange={setIsImagePopoverOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 w-8 p-0"
                    >
                      <ImageIcon className="w-4 h-4" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-80 p-4" align="start">
                    <div className="space-y-4">
                      <h4 className="font-medium text-sm">Add Image</h4>
                      
                      {/* File Upload */}
                      <div className="space-y-2">
                        <Label className="text-sm font-medium">Upload Image</Label>
                        <div className="flex items-center gap-2">
                          <input
                            type="file"
                            accept="image/*"
                            onChange={handleFileUpload}
                            className="hidden"
                            id="image-upload"
                            disabled={isUploading}
                          />
                          <label
                            htmlFor="image-upload"
                            className="flex-1 px-3 py-2 text-sm border border-slate-300 dark:border-slate-600 rounded-md cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            {isUploading ? 'Uploading...' : 'Choose File'}
                          </label>
                        </div>
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                          Max 5MB, JPG, PNG, GIF, WebP
                        </p>
                      </div>

                      <div className="flex items-center gap-2">
                        <div className="flex-1 h-px bg-slate-200 dark:bg-slate-700" />
                        <span className="text-xs text-slate-500 dark:text-slate-400">or</span>
                        <div className="flex-1 h-px bg-slate-200 dark:bg-slate-700" />
                      </div>

                      {/* URL Input */}
                      <div className="space-y-2">
                        <Label className="text-sm font-medium">Image URL</Label>
                        <div className="flex gap-2">
                          <Input
                            value={imageUrl}
                            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setImageUrl(e.target.value)}
                            placeholder="https://example.com/image.jpg"
                            className="flex-1 h-8 text-sm"
                            onKeyPress={(e: React.KeyboardEvent) => {
                              if (e.key === 'Enter') {
                                addImage();
                              }
                            }}
                          />
                          <Button
                            onClick={addImage}
                            disabled={!imageUrl || isUploading}
                            size="sm"
                            className="h-8 px-3"
                          >
                            Add
                          </Button>
                        </div>
                      </div>
                    </div>
                  </PopoverContent>
                </Popover>
              </div>

              <div className="w-px h-6 bg-slate-300 dark:bg-slate-600 mx-2" />

              {/* History */}
              <div className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => editor.chain().focus().undo().run()}
                  disabled={!editor.can().undo()}
                  className="h-8 w-8 p-0"
                >
                  <UndoIcon className="w-4 h-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => editor.chain().focus().redo().run()}
                  disabled={!editor.can().redo()}
                  className="h-8 w-8 p-0"
                >
                  <RedoIcon className="w-4 h-4" />
                </Button>
              </div>
            </div>

            {/* Expand/Collapse Button */}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsToolbarExpanded(!isToolbarExpanded)}
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
                  variant="ghost"
                  size="sm"
                  onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
                  className={cn(
                    "h-8 w-8 p-0",
                    editor.isActive('heading', { level: 1 }) && "bg-slate-200 dark:bg-slate-700"
                  )}
                >
                  <H1Icon className="w-4 h-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
                  className={cn(
                    "h-8 w-8 p-0",
                    editor.isActive('heading', { level: 2 }) && "bg-slate-200 dark:bg-slate-700"
                  )}
                >
                  <H2Icon className="w-4 h-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
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
                  variant="ghost"
                  size="sm"
                  onClick={() => editor.chain().focus().toggleBulletList().run()}
                  className={cn(
                    "h-8 w-8 p-0",
                    editor.isActive('bulletList') && "bg-slate-200 dark:bg-slate-700"
                  )}
                >
                  <ListIcon className="w-4 h-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => editor.chain().focus().toggleOrderedList().run()}
                  className={cn(
                    "h-8 w-8 p-0",
                    editor.isActive('orderedList') && "bg-slate-200 dark:bg-slate-700"
                  )}
                >
                  <OrderedListIcon className="w-4 h-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => editor.chain().focus().toggleBlockquote().run()}
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
        className="prose prose-sm max-w-none p-3 focus-within:outline-none"
        style={{
          minHeight,
          maxHeight: showToolbar ? maxHeight : 'none',
          overflowY: 'auto'
        }}
      >
        <EditorContent 
          editor={editor}
          className="[&_.ProseMirror]:outline-none 
                     [&_.ProseMirror]:border-none 
                     [&_.ProseMirror]:bg-transparent 
                     [&_.ProseMirror]:min-h-[2.5rem] 
                     [&_.ProseMirror]:p-0 
                     [&_.ProseMirror]:focus:ring-0 
                     [&_.ProseMirror]:focus:border-none 
                     [&_.ProseMirror]:resize-none 
                     [&_.ProseMirror]:w-full 
                     [&_.ProseMirror]:max-w-full 
                     [&_.ProseMirror]:break-words 
                     [&_.ProseMirror]:whitespace-pre-wrap 
                     [&_.ProseMirror]:overflow-wrap-anywhere 
                     [&_.ProseMirror]:word-break-break-word 
                     [&_.ProseMirror]:box-border 
                     [&_.ProseMirror]:overflow-x-hidden 
                     [&_.ProseMirror]:overflow-y-auto 
                     [&_.ProseMirror>p]:max-w-full 
                     [&_.ProseMirror>img]:max-w-full 
                     [&_.ProseMirror>pre]:max-w-full 
                     [&_.ProseMirror]:text-wrap 
                     [&_.ProseMirror]:hyphens-auto"
        />
      </div>

      {/* Link Modal */}
      {isLinkModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-slate-900 p-6 rounded-lg w-96">
            <h3 className="text-lg font-semibold mb-4">Add Link</h3>
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
