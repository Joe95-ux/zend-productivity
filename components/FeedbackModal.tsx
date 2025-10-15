"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { MessageSquare, Send, X } from "lucide-react";

interface FeedbackModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type FeedbackType = 
  | "choose-one" 
  | "ask-question" 
  | "leave-comment" 
  | "report-bug" 
  | "suggest-improvement";

const feedbackOptions = [
  { value: "choose-one", label: "Choose one" },
  { value: "ask-question", label: "Ask a question" },
  { value: "leave-comment", label: "Leave a comment" },
  { value: "report-bug", label: "Report a bug" },
  { value: "suggest-improvement", label: "Suggest improvement" },
] as const;

const getMessageLabel = (type: FeedbackType): string => {
  switch (type) {
    case "ask-question":
      return "Your question";
    case "leave-comment":
      return "Your comment";
    case "report-bug":
      return "Bug description";
    case "suggest-improvement":
      return "Your suggestion";
    default:
      return "Message";
  }
};

const getMessagePlaceholder = (type: FeedbackType): string => {
  switch (type) {
    case "ask-question":
      return "What would you like to know?";
    case "leave-comment":
      return "Share your thoughts...";
    case "report-bug":
      return "Please describe the bug, including steps to reproduce it...";
    case "suggest-improvement":
      return "How can we improve this feature?";
    default:
      return "Enter your message...";
  }
};

export function FeedbackModal({ isOpen, onClose }: FeedbackModalProps) {
  const [feedbackType, setFeedbackType] = useState<FeedbackType>("choose-one");
  const [message, setMessage] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // TODO: Handle form submission
    console.log("Feedback submitted:", { feedbackType, message });
    onClose();
  };

  const handleClose = () => {
    setFeedbackType("choose-one");
    setMessage("");
    onClose();
  };

  const isSubmitDisabled = feedbackType === "choose-one" || !message.trim();

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[500px] w-[95vw] max-h-[90vh] overflow-y-auto">
        <DialogHeader className="space-y-3">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
              <MessageSquare className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <DialogTitle className="text-xl font-semibold text-slate-900 dark:text-white">
                Send Feedback
              </DialogTitle>
              <DialogDescription className="text-sm text-slate-600 dark:text-slate-400 mt-1">
                Help us improve by sharing your thoughts, questions, or suggestions
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6 mt-6">
          {/* Feedback Type Selection */}
          <div className="space-y-2">
            <Label htmlFor="feedback-type" className="text-sm font-medium text-slate-700 dark:text-slate-300">
              Type of feedback
            </Label>
            <Select value={feedbackType} onValueChange={(value: FeedbackType) => setFeedbackType(value)}>
              <SelectTrigger 
                id="feedback-type"
                className="w-full bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-600 focus:border-blue-500 dark:focus:border-blue-400"
              >
                <SelectValue placeholder="Select feedback type" />
              </SelectTrigger>
              <SelectContent className="bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-600">
                {feedbackOptions.map((option) => (
                  <SelectItem 
                    key={option.value} 
                    value={option.value}
                    className="text-slate-900 dark:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-700 focus:bg-slate-100 dark:focus:bg-slate-700"
                  >
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Message Field */}
          <div className="space-y-2">
            <Label htmlFor="message" className="text-sm font-medium text-slate-700 dark:text-slate-300">
              {getMessageLabel(feedbackType)}
            </Label>
            <Textarea
              id="message"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder={getMessagePlaceholder(feedbackType)}
              className="min-h-[120px] resize-none bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-600 focus:border-blue-500 dark:focus:border-blue-400 text-slate-900 dark:text-white placeholder:text-slate-500 dark:placeholder:text-slate-400"
              required
            />
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {message.length}/1000 characters
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              className="flex-1 sm:flex-none sm:w-auto order-2 sm:order-1 bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition-all duration-200"
            >
              <X className="h-4 w-4 mr-2" />
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isSubmitDisabled}
              className="flex-1 sm:flex-none sm:w-auto order-1 sm:order-2 bg-blue-600 hover:bg-blue-700 text-white disabled:bg-slate-300 dark:disabled:bg-slate-600 disabled:text-slate-500 dark:disabled:text-slate-400 transition-all duration-200"
            >
              <Send className="h-4 w-4 mr-2" />
              Send Feedback
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
