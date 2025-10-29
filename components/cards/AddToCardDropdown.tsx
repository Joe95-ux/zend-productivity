"use client";

import { useState } from "react";
import { X, ArrowLeft, Tag, Users, CheckSquare, Calendar, Paperclip } from "lucide-react";
import { LabelDropdown } from "./LabelDropdown";
import { DueDateDropdown } from "./DueDateDropdown";
import { ChecklistDropdown } from "./ChecklistDropdown";
import { MembersDropdown } from "./MembersDropdown";
import { AttachmentUpload } from "@/components/ui/AttachmentUpload";
import { Card } from "@/lib/types";

type CardModalCard = Omit<Card, 'createdAt' | 'updatedAt'> & {
  createdAt?: string;
  updatedAt?: string;
  isCompleted: boolean;
};

interface AddToCardDropdownProps {
  isOpen: boolean;
  onClose: () => void;
  card: CardModalCard;
  boardId: string;
  onFileUpload: (file: File) => void;
  onUrlUpload: (url: string, displayName?: string) => void;
  isUploadingAttachment: boolean;
}

type DropdownView = 'main' | 'labels' | 'dates' | 'checklist' | 'members' | 'attachment';

export function AddToCardDropdown({
  isOpen,
  onClose,
  card,
  boardId,
  onFileUpload,
  onUrlUpload,
  isUploadingAttachment
}: AddToCardDropdownProps) {
  const [currentDropdownView, setCurrentDropdownView] = useState<DropdownView>('main');

  // Add to card actions data
  const addToCardActions = [
    {
      id: 'labels',
      name: 'Labels',
      description: 'Add labels to organize and categorize',
      icon: Tag,
      color: 'bg-blue-100 text-blue-600 dark:bg-blue-900 dark:text-blue-300'
    },
    {
      id: 'dates',
      name: 'Due Date',
      description: 'Set a due date and time',
      icon: Calendar,
      color: 'bg-green-100 text-green-600 dark:bg-green-900 dark:text-green-300'
    },
    {
      id: 'checklist',
      name: 'Checklist',
      description: 'Add a checklist to track tasks',
      icon: CheckSquare,
      color: 'bg-purple-100 text-purple-600 dark:bg-purple-900 dark:text-purple-300'
    },
    {
      id: 'members',
      name: 'Members',
      description: 'Assign people to this card',
      icon: Users,
      color: 'bg-orange-100 text-orange-600 dark:bg-orange-900 dark:text-orange-300'
    },
    {
      id: 'attachment',
      name: 'Attachment',
      description: 'Add files, images, or links',
      icon: Paperclip,
      color: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300'
    }
  ];

  // Handle Add to card dropdown actions
  const handleAddToCardAction = (actionId: string) => {
    setCurrentDropdownView(actionId as DropdownView);
  };

  const handleBackToMainMenu = () => {
    setCurrentDropdownView('main');
  };

  if (!isOpen) return null;

  return (
    <div className="absolute top-full right-0 mt-2 w-80 bg-white dark:bg-slate-800 rounded-lg shadow-lg border border-slate-200 dark:border-slate-700 z-50">
      {currentDropdownView === 'main' ? (
        <>
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-slate-200 dark:border-slate-700">
            <h3 className="text-sm font-semibold text-slate-900 dark:text-white">Add to card</h3>
            <button
              onClick={onClose}
              className="p-1 hover:bg-slate-100 dark:hover:bg-slate-700 rounded"
            >
              <X className="w-4 h-4 text-slate-500" />
            </button>
          </div>
          
          {/* Actions List */}
          <div className="p-2">
            {addToCardActions.map((action) => {
              const IconComponent = action.icon;
              return (
                <button
                  key={action.id}
                  onClick={() => handleAddToCardAction(action.id)}
                  className="w-full flex items-center gap-3 p-3 hover:bg-slate-50 dark:hover:bg-slate-700 rounded-lg transition-colors"
                >
                  <div className={`w-8 h-8 rounded flex items-center justify-center ${action.color}`}>
                    <IconComponent className="w-4 h-4" />
                  </div>
                  <div className="flex-1 text-left">
                    <div className="text-sm font-medium text-slate-900 dark:text-white">
                      {action.name}
                    </div>
                    <div className="text-xs text-slate-500 dark:text-slate-400">
                      {action.description}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </>
      ) : (
        <>
          {/* Sub-menu Header with Back Button */}
          <div className="flex items-center gap-3 p-4 border-b border-slate-200 dark:border-slate-700">
            <button
              onClick={handleBackToMainMenu}
              className="p-1 hover:bg-slate-100 dark:hover:bg-slate-700 rounded"
            >
              <ArrowLeft className="w-4 h-4 text-slate-500" />
            </button>
            <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
              {addToCardActions.find(a => a.id === currentDropdownView)?.name}
            </h3>
            <button
              onClick={onClose}
              className="ml-auto p-1 hover:bg-slate-100 dark:hover:bg-slate-700 rounded"
            >
              <X className="w-4 h-4 text-slate-500" />
            </button>
          </div>
          
          {/* Sub-menu Content */}
          <div className="p-4">
            {currentDropdownView === 'labels' && <LabelDropdown card={card} boardId={boardId} />}
            {currentDropdownView === 'dates' && <DueDateDropdown card={card} boardId={boardId} />}
            {currentDropdownView === 'checklist' && <ChecklistDropdown cardId={card.id} boardId={boardId} existingChecklists={card.checklists || []} />}
            {currentDropdownView === 'members' && <MembersDropdown card={card} boardId={boardId} />}
            {currentDropdownView === 'attachment' && (
              <div className="space-y-2">
                <AttachmentUpload
                  onFileUpload={onFileUpload}
                  onUrlUpload={onUrlUpload}
                  isUploading={isUploadingAttachment}
                  acceptedTypes="*/*"
                  maxSize={2}
                  variant="button"
                />
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
