"use client";

import { useState, useCallback, useMemo } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Calendar as CalendarIcon,
  Clock,
  RotateCcw,
  Bell,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { format, parse, isValid } from "date-fns";
import { Card } from "@/lib/types";
import { Calendar as UiCalendar } from "@/components/ui/calendar";
import { ScrollArea } from "../ui/scroll-area";
import { useIsMobile } from "@/hooks/use-mobile";

type CardModalCard = Omit<Card, "createdAt" | "updatedAt"> & {
  createdAt?: string;
  updatedAt?: string;
  isCompleted: boolean;
};

interface DueDateDropdownProps {
  card: CardModalCard;
  boardId: string;
}

export function DueDateDropdown({ card, boardId }: DueDateDropdownProps) {
  const initialStartDate: Date | undefined = card.startDate
    ? new Date(card.startDate)
    : undefined;
  const initialDueDate: Date | undefined = card.dueDate
    ? new Date(card.dueDate)
    : undefined;

  const [startDate, setStartDate] = useState<Date | undefined>(
    initialStartDate
  );
  const [dueDate, setDueDate] = useState<Date | undefined>(initialDueDate);
  const [startTime, setStartTime] = useState(
    card.startDate ? format(new Date(card.startDate), "HH:mm") : ""
  );
  const [dueTime, setDueTime] = useState(
    card.dueDate ? format(new Date(card.dueDate), "HH:mm") : ""
  );
  const [isRecurring, setIsRecurring] = useState(card.isRecurring || false);
  const [recurringType, setRecurringType] = useState(
    card.recurringType || "weekly"
  );
  const [reminderType, setReminderType] = useState(
    card.reminderType || "1_day"
  );
  const [isOpen, setIsOpen] = useState(false);
  const [startEnabled, setStartEnabled] = useState<boolean>(
    Boolean(initialStartDate)
  );
  const [dueEnabled, setDueEnabled] = useState<boolean>(
    Boolean(initialDueDate)
  );
  const [activePicker, setActivePicker] = useState<"start" | "due" | null>(
    initialDueDate ? "due" : initialStartDate ? "start" : null
  );

  const queryClient = useQueryClient();
  const isMobile = useIsMobile();
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
        throw new Error(
          `Failed to update due date: ${response.status} ${errorText}`
        );
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
        throw new Error(
          `Failed to remove due date: ${response.status} ${errorText}`
        );
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
    // Build ISO strings safely from date + time inputs
    const toIsoFromDateAndTime = (
      date: Date | undefined,
      timeText: string,
      fallbackHour: number,
      fallbackMinute: number
    ): string | null => {
      if (!date) return null;
      let hours = fallbackHour;
      let minutes = fallbackMinute;
      const trimmed = (timeText || "").trim();
      if (trimmed) {
        const parsedTime = parse(trimmed, "h:mm a", new Date());
        if (isValid(parsedTime)) {
          hours = parsedTime.getHours();
          minutes = parsedTime.getMinutes();
        }
      }
      const d = new Date(
        date.getFullYear(),
        date.getMonth(),
        date.getDate(),
        hours,
        minutes,
        0,
        0
      );
      return d.toISOString();
    };

    const startIso = startEnabled
      ? toIsoFromDateAndTime(startDate, startTime, 0, 0)
      : null;
    const dueIso = dueEnabled
      ? toIsoFromDateAndTime(dueDate, dueTime || formatTime12(dueDate, ""), 23, 59)
      : null;

    updateDueDateMutation.mutate({
      startDate: startIso || undefined,
      dueDate: dueIso || undefined,
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
    const newStart = card.startDate ? new Date(card.startDate) : undefined;
    const newDue = card.dueDate ? new Date(card.dueDate) : undefined;
    setStartDate(newStart);
    setDueDate(newDue);
    setStartTime(
      card.startDate ? format(new Date(card.startDate), "HH:mm") : ""
    );
    setDueTime(card.dueDate ? format(new Date(card.dueDate), "HH:mm") : "");
    setIsRecurring(card.isRecurring || false);
    setRecurringType(card.recurringType || "weekly");
    setReminderType(card.reminderType || "1_day");
    setStartEnabled(Boolean(newStart));
    setDueEnabled(Boolean(newDue));
    setActivePicker(newDue ? "due" : newStart ? "start" : null);
    setIsOpen(false);
  }, [card]);

  const formatDateMDY = (date: Date | undefined): string => {
    return date ? format(date, "M/d/yyyy") : "";
  };

  const parseDateMDY = (value: string): Date | undefined => {
    const parsed = parse(value.trim(), "M/d/yyyy", new Date());
    return isValid(parsed) ? parsed : undefined;
  };

  const formatTime12 = (date: Date | undefined, fallback: string): string => {
    if (!date) return fallback;
    return format(date, "h:mm a");
  };

  const normalizeTime12 = (value: string): string => value.trim();

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

  const selectedForCalendar = useMemo(() => {
    if (activePicker === "start" && startEnabled) return startDate;
    if (activePicker === "due" && dueEnabled) return dueDate;
    return undefined;
  }, [activePicker, startEnabled, dueEnabled, startDate, dueDate]);

  return (
    <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="h-9 px-3 text-sm font-medium border-slate-300 dark:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-800 hover:border-slate-400 dark:hover:border-slate-500 transition-all duration-200"
        >
          <CalendarIcon className="w-4 h-4 mr-2" />
          {getDisplayText()}
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent
          align="start"
          sideOffset={isMobile ? -25 : 4}
          className="w-full max-w-96 h-auto p-0 sm:dark:bg-[#0D1117] dark:bg-[#151B23]"
        >
          <ScrollArea className="h-155 max-h-[calc(85vh-10rem)] w-full min-h-0">
         {/* Header */}
         <div className="flex z-30 sticky top-0 bg-[#F8FAFC] sm:dark:bg-[#0D1117] dark:bg-[#151B23] items-center justify-between p-4">
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
            {/* Calendar on top (inherits dropdown bg) */}
            <div className="rounded-md">
              <UiCalendar
                mode="single"
                selected={selectedForCalendar}
                onSelect={(date) => {
                  if (!date) return;
                  if (activePicker === "start" && startEnabled) {
                    setStartDate(date);
                  } else if (activePicker === "due" && dueEnabled) {
                    setDueDate(date);
                  }
                }}
                className="bg-transparent border-none [--cell-size:--spacing(10)] md:[--cell-size:--spacing(11)]"
                buttonVariant="ghost"
              />
            </div>

            {/* Start date row */}
            <div className="space-y-2">
              <Label className="text-sm font-medium flex items-center gap-2">
                <Clock className="w-4 h-4" />
                Start date
              </Label>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="start_enabled"
                  checked={startEnabled}
                  onChange={(e) => {
                    const enabled = e.target.checked;
                    setStartEnabled(enabled);
                    if (enabled) {
                      const now = new Date();
                      setStartDate(now);
                      setActivePicker("start");
                    }
                  }}
                  className="rounded border-slate-300"
                />
                <Input
                  placeholder="M/D/YYYY"
                  value={formatDateMDY(startDate)}
                  disabled={!startEnabled}
                  onFocus={() => setActivePicker("start")}
                  onChange={(e) => {
                    const parsed = parseDateMDY(e.target.value);
                    if (parsed) setStartDate(parsed);
                  }}
                  className="text-sm h-8 w-40"
                />
              </div>
            </div>

            {/* Due date row */}
            <div className="space-y-2">
              <Label className="text-sm font-medium flex items-center gap-2">
                <CalendarIcon className="w-4 h-4" />
                Due date
              </Label>
              <div className="flex items-center gap-2 flex-wrap">
                <input
                  type="checkbox"
                  id="due_enabled"
                  checked={dueEnabled}
                  onChange={(e) => {
                    const enabled = e.target.checked;
                    setDueEnabled(enabled);
                    if (enabled) {
                      const now = new Date();
                      setDueDate(now);
                      // initialize time to current time
                      setDueTime(format(now, "h:mm a"));
                      setActivePicker("due");
                    }
                  }}
                  className="rounded border-slate-300"
                />
                <Input
                  placeholder="M/D/YYYY"
                  value={formatDateMDY(dueDate)}
                  disabled={!dueEnabled}
                  onFocus={() => setActivePicker("due")}
                  onChange={(e) => {
                    const parsed = parseDateMDY(e.target.value);
                    if (parsed) setDueDate(parsed);
                  }}
                  className="text-sm h-8 w-40"
                />
                <Input
                  placeholder="h:mm a"
                  value={normalizeTime12(dueTime || formatTime12(dueDate, ""))}
                  disabled={!dueEnabled}
                  onChange={(e) => setDueTime(e.target.value)}
                  className="text-sm h-8 w-32"
                />
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
      </ScrollArea>
         
        </DropdownMenuContent>
    </DropdownMenu>
  );
}
