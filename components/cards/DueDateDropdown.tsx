"use client";

import { useState, useCallback } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DropdownMenu, DropdownMenuContent, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Calendar, Clock, RotateCcw, Bell, X } from "lucide-react";
import { toast } from "sonner";
import { format, addDays, addWeeks, addMonths } from "date-fns";
import { Card } from "@/lib/types";

type CardModalCard = Omit<Card, 'createdAt' | 'updatedAt'> & {
  createdAt?: string;
  updatedAt?: string;
  isCompleted: boolean;
};

interface DueDateDropdownProps {
  card: CardModalCard;
  boardId: string;
}

export function DueDateDropdown({ card, boardId }: DueDateDropdownProps) {
  const [startDate, setStartDate] = useState(card.startDate ? format(new Date(card.startDate), "yyyy-MM-dd") : "");
  const [dueDate, setDueDate] = useState(card.dueDate ? format(new Date(card.dueDate), "yyyy-MM-dd") : "");
  const [startTime, setStartTime] = useState(card.startDate ? format(new Date(card.startDate), "HH:mm") : "");
  const [dueTime, setDueTime] = useState(card.dueDate ? format(new Date(card.dueDate), "HH:mm") : "");
  const [isRecurring, setIsRecurring] = useState(card.isRecurring || false);
  const [recurringType, setRecurringType] = useState(card.recurringType || "weekly");
  const [reminderType, setReminderType] = useState(card.reminderType || "1_day");
  const [isOpen, setIsOpen] = useState(false);
  
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
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to update due date: ${response.status} ${errorText}`);
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["board", boardId] });
      toast.success("Due date updated successfully!");
      setIsOpen(false);
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
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to remove due date: ${response.status} ${errorText}`);
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["board", boardId] });
      toast.success("Due date removed successfully!");
      setIsOpen(false);
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  const handleSave = () => {
    const startDateTime = startDate && startTime ? `${startDate}T${startTime}:00` : null;
    const dueDateTime = dueDate && dueTime ? `${dueDate}T${dueTime}:00` : null;

    updateDueDateMutation.mutate({
      startDate: startDateTime || undefined,
      dueDate: dueDateTime || undefined,
      isRecurring,
      recurringType: isRecurring ? recurringType : undefined,
      reminderType,
    });
  };

  const handleRemove = () => {
    removeDueDateMutation.mutate();
  };

  const handleClose = useCallback(() => {
    // Reset to original values when closing
    setStartDate(card.startDate ? format(new Date(card.startDate), "yyyy-MM-dd") : "");
    setDueDate(card.dueDate ? format(new Date(card.dueDate), "yyyy-MM-dd") : "");
    setStartTime(card.startDate ? format(new Date(card.startDate), "HH:mm") : "");
    setDueTime(card.dueDate ? format(new Date(card.dueDate), "HH:mm") : "");
    setIsRecurring(card.isRecurring || false);
    setRecurringType(card.recurringType || "weekly");
    setReminderType(card.reminderType || "1_day");
    setIsOpen(false);
  }, [card]);

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

  const getDisplayText = () => {
    if (card.dueDate) {
      return format(new Date(card.dueDate), "MMM d, yyyy");
    }
    return "Due Date";
  };

  return (
    <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="h-9 px-3 text-sm font-medium border-slate-300 dark:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-800 hover:border-slate-400 dark:hover:border-slate-500 transition-all duration-200"
        >
          <Calendar className="w-4 h-4 mr-2" />
          {getDisplayText()}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-80 p-0 dark:bg-[#0D1117]">
        {/* Header */}
        <div className="flex items-center justify-between p-4">
          <h3 className="text-[16px] font-semibold text-slate-900 dark:text-white">
            {card.dueDate ? "Edit Due Date" : "Set Due Date"}
          </h3>
          <button
            onClick={handleClose}
            className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-md transition-colors"
          >
            <X className="w-4 h-4 text-slate-500 dark:text-slate-400" />
          </button>
        </div>
        
        <div className="p-4 space-y-4">
          {/* Start Date */}
          <div className="space-y-2">
            <Label className="text-sm font-medium flex items-center gap-2">
              <Clock className="w-4 h-4" />
              Start Date
            </Label>
            <div className="grid grid-cols-2 gap-2">
              <Input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="text-sm h-8"
              />
              <Input
                type="time"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                className="text-sm h-8"
              />
            </div>
          </div>

          {/* Due Date */}
          <div className="space-y-2">
            <Label className="text-sm font-medium flex items-center gap-2">
              <Calendar className="w-4 h-4" />
              Due Date
            </Label>
            <div className="grid grid-cols-2 gap-2">
              <Input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="text-sm h-8"
              />
              <Input
                type="time"
                value={dueTime}
                onChange={(e) => setDueTime(e.target.value)}
                className="text-sm h-8"
              />
            </div>
            
            {/* Quick Date Options */}
            <div className="flex flex-wrap gap-1">
              {getQuickDateOptions().map((option) => (
                <Button
                  key={option.value}
                  variant="outline"
                  size="sm"
                  onClick={() => setDueDate(option.value)}
                  className="text-xs h-6 px-2"
                >
                  {option.label}
                </Button>
              ))}
            </div>
          </div>

          {/* Recurring */}
          <div className="space-y-2">
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
                <SelectTrigger className="w-full h-8">
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
          <div className="space-y-2">
            <Label className="text-sm font-medium flex items-center gap-2">
              <Bell className="w-4 h-4" />
              Reminder
            </Label>
            <Select value={reminderType} onValueChange={setReminderType}>
              <SelectTrigger className="w-full h-8">
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
          <div className="flex justify-between pt-2">
            {card.dueDate && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleRemove}
                disabled={updateDueDateMutation.isPending || removeDueDateMutation.isPending}
                className="text-red-600 hover:text-red-700 hover:bg-red-50 h-8 px-3"
              >
                <X className="w-3 h-3 mr-1" />
                Remove
              </Button>
            )}
            <div className="flex gap-2 ml-auto">
              <Button
                onClick={handleSave}
                disabled={updateDueDateMutation.isPending || removeDueDateMutation.isPending}
                className="px-4 bg-teal-700 hover:bg-teal-900 text-slate-100 h-8"
              >
                {updateDueDateMutation.isPending ? (
                  <div className="w-4 h-4 animate-spin rounded-full border-2 border-white border-t-transparent mr-2" />
                ) : null}
                {updateDueDateMutation.isPending ? "Saving..." : "Save"}
              </Button>
            </div>
          </div>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
