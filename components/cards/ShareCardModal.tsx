"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Share, Copy, Check } from "lucide-react";
import { toast } from "sonner";
import { generateCardSlug } from "@/lib/utils";
import { Card } from "@/lib/types";

interface ShareCardModalProps {
  isOpen: boolean;
  onClose: () => void;
  card: Card;
  boardId: string;
}

export function ShareCardModal({
  isOpen,
  onClose,
  card,
  boardId,
}: ShareCardModalProps) {
  const [copied, setCopied] = useState(false);
  
  const cardSlug = generateCardSlug(card.title, card.position);
  const cardUrl = `${typeof window !== 'undefined' ? window.location.origin : ''}/dashboard/boards/${boardId}/cards/${card.id}/${cardSlug}`;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(cardUrl);
      setCopied(true);
      toast.success("Card link copied to clipboard!");
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      toast.error("Failed to copy link");
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Share className="w-5 h-5" />
            Share Card
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
              Card Link
            </label>
            <div className="flex gap-2">
              <Input
                value={cardUrl}
                readOnly
                className="flex-1 font-mono text-xs bg-slate-50 dark:bg-slate-800"
                onClick={(e) => {
                  (e.target as HTMLInputElement).select();
                }}
              />
              <Button
                onClick={handleCopy}
                variant="outline"
                size="sm"
                className="flex-shrink-0"
              >
                {copied ? (
                  <>
                    <Check className="w-4 h-4 mr-2" />
                    Copied!
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4 mr-2" />
                    Copy
                  </>
                )}
              </Button>
            </div>
          </div>

          <div className="text-xs text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-800/50 p-3 rounded-md">
            <p className="font-medium mb-1">Share this link to:</p>
            <ul className="list-disc list-inside space-y-1 ml-2">
              <li>Give team members direct access to this card</li>
              <li>Reference the card in emails or messages</li>
              <li>Bookmark for quick access</li>
            </ul>
          </div>

          <div className="flex justify-end">
            <Button variant="outline" onClick={onClose}>
              Close
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

