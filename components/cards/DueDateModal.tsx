"use client";

import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar, Clock, RotateCcw, Bell, X } from "lucide-react";
import { toast } from "sonner";
import { format, addDays, addWeeks, addMonths, addYears } from "date-fns";

interface DueDateModalProps {
  isOpen: boolean;
  onClose: () => void;
  card: {
    id: string;
    title: string;
    dueDate?: string;
    startDate?: string;
    isRecurring?: boolean;
    recurringType?: string;
    reminderType?: string;
  };
  boardId: string;
}

export function DueDateModal({ isOpen, onClose, card, boardId }: DueDateModalProps) {
  const [startDate, setStartDate] = useState(card.startDate ? format(new Date(card.startDate), "yyyy-MM-dd") : "");
  const [dueDate, setDueDate] = useState(card.dueDate ? format(new Date(card.dueDate), "yyyy-MM-dd") : "");
  const [startTime, setStartTime] = useState(card.startDate ? format(new Date(card.startDate), "HH:mm") : "");
  const [dueTime, setDueTime] = useState(card.dueDate ? format(new Date(card.dueDate), "HH:mm") : "");
  const [isRecurring, setIsRecurring] = useState(card.isRecurring || false);
  const [recurringType, setRecurringType] = useState(card.recurringType || "weekly");
  const [reminderType, setReminderType] = useState(card.reminderType || "1_day");
  
  const queryClient = useQueryClient();

  const updateDueDateMutation = useMutation({
    mutationFn: async (data: {
      startDate?: string;
      dueDate?: string;
      isRecurring?: boolean;
      recurringType?: string;
      reminderType?: string;
    }) => {
      const response = await fetch(`/api/cards/${card.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error("Failed to update due date");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["board", boardId] });
      toast.success("Due date updated successfully!");
      onClose();
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  const removeDueDateMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch(`/api/cards/${card.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          startDate: null,
          dueDate: null,
          isRecurring: false,
          recurringType: null,
          reminderType: null,
        }),
      });
      if (!response.ok) throw new Error("Failed to remove due date");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["board", boardId] });
      toast.success("Due date removed successfully!");
      onClose();
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  const handleSave = () => {
    const startDateTime = startDate && startTime ? `${startDate}T${startTime}:00` : null;
    const dueDateTime = dueDate && dueTime ? `${dueDate}T${dueTime}:00` : null;

    updateDueDateMutation.mutate({
      startDate: startDateTime,
      dueDate: dueDateTime,
      isRecurring,
      recurringType: isRecurring ? recurringType : null,
      reminderType,
    });
  };

  const handleRemove = () => {
    removeDueDateMutation.mutate();
  };

  const getQuickDateOptions = () => {
    const today = new Date();
    return [
      { label: "Today", value: format(today, "yyyy-MM-dd") },
      { label: "Tomorrow", value: format(addDays(today, 1), "yyyy-MM-dd") },
      { label: "Next week", value: format(addWeeks(today, 1), "yyyy-MM-dd") },
      { label: "Next month", value: format(addMonths(today, 1), "yyyy-MM-dd") },
    ];
  };

  const getRecurringOptions = () => [
    { value: "daily", label: "Daily" },
    { value: "weekly", label: "Weekly" },
    { value: "monthly", label: "Monthly" },
    { value: "yearly", label: "Yearly" },
  ];

  const getReminderOptions = () => [
    { value: "none", label: "No reminder" },
    { value: "at_due", label: "At due time" },
    { value: "1_day", label: "1 day before" },
    { value: "2_days", label: "2 days before" },
    { value: "1_week", label: "1 week before" },
  ];

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Calendar className="w-5 h-5" />
            Set Due Date
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Start Date */}
          <div className="space-y-3">
            <Label className="text-sm font-medium flex items-center gap-2">
              <Clock className="w-4 h-4" />
              Start Date
            </Label>
            <div className="grid grid-cols-2 gap-2">
              <Input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="text-sm"
              />
              <Input
                type="time"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                className="text-sm"
              />
            </div>
          </div>

          {/* Due Date */}
          <div className="space-y-3">
            <Label className="text-sm font-medium flex items-center gap-2">
              <Calendar className="w-4 h-4" />
              Due Date
            </Label>
            <div className="grid grid-cols-2 gap-2">
              <Input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="text-sm"
              />
              <Input
                type="time"
                value={dueTime}
                onChange={(e) => setDueTime(e.target.value)}
                className="text-sm"
              />
            </div>
            
            {/* Quick Date Options */}
            <div className="flex flex-wrap gap-2">
              {getQuickDateOptions().map((option) => (
                <Button
                  key={option.value}
                  variant="outline"
                  size="sm"
                  onClick={() => setDueDate(option.value)}
                  className="text-xs h-7 px-2"
                >
                  {option.label}
                </Button>
              ))}
            </div>
          </div>

          {/* Recurring */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="recurring"
                checked={isRecurring}
                onChange={(e) => setIsRecurring(e.target.checked)}
                className="rounded border-slate-300"
              />
              <Label htmlFor="recurring" className="text-sm font-medium flex items-center gap-2">
                <RotateCcw className="w-4 h-4" />
                Recurring
              </Label>
            </div>
            
            {isRecurring && (
              <Select value={recurringType} onValueChange={setRecurringType}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {getRecurringOptions().map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>

          {/* Reminder */}
          <div className="space-y-3">
            <Label className="text-sm font-medium flex items-center gap-2">
              <Bell className="w-4 h-4" />
              Reminder
            </Label>
            <Select value={reminderType} onValueChange={setReminderType}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {getReminderOptions().map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Actions */}
          <div className="flex justify-between pt-4">
            <Button
              variant="outline"
              onClick={handleRemove}
              disabled={updateDueDateMutation.isPending || removeDueDateMutation.isPending}
              className="text-red-600 hover:text-red-700 hover:bg-red-50"
            >
              <X className="w-4 h-4 mr-2" />
              Remove
            </Button>
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={onClose}
                disabled={updateDueDateMutation.isPending || removeDueDateMutation.isPending}
              >
                Cancel
              </Button>
              <Button
                onClick={handleSave}
                disabled={updateDueDateMutation.isPending || removeDueDateMutation.isPending}
                className="bg-teal-600 hover:bg-teal-700"
              >
                {updateDueDateMutation.isPending ? "Saving..." : "Save"}
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
