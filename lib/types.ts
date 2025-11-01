// User types
export interface User {
  id: string;
  name?: string;
  email: string;
  avatarUrl?: string;
}

// Label types
export interface Label {
  id: string;
  name: string;
  color: string;
  boardLabelId?: string;
}

// Checklist types
export interface ChecklistItem {
  id: string;
  content: string;
  isCompleted: boolean;
}

export interface Checklist {
  id: string;
  title: string;
  items: ChecklistItem[];
}

// Reaction types
export interface Reaction {
  id: string;
  emoji: string;
  userId: string;
  user?: User;
  createdAt?: string;
}

// Comment types
export interface Comment {
  id: string;
  content: string;
  user: User;
  reactions?: Reaction[];
  createdAt: string;
}

// Attachment types
export interface Attachment {
  id: string;
  url: string;
  type?: string;
  filename?: string;
  cardId: string;
  createdAt: string;
}

// Card types
export interface Card {
  id: string;
  title: string;
  description?: string;
  position: number;
  isCompleted: boolean;
  listId?: string; // Optional for drag and drop operations
  labels: Label[];
  checklists: Checklist[];
  comments: Comment[];
  attachments: Attachment[];
  dueDate?: string;
  startDate?: string;
  isRecurring?: boolean;
  recurringType?: string;
  reminderType?: string;
  assignedTo?: string;
  createdAt: string;
  updatedAt: string;
}

// List types
export interface List {
  id: string;
  title: string;
  position: number;
  cards: Card[];
  createdAt: string;
  updatedAt: string;
}

// Board member types
export interface BoardMember {
  user: User;
}

// Board types
export interface Board {
  id: string;
  title: string;
  description?: string;
  owner: User;
  members: BoardMember[];
  lists: List[];
  createdAt: string;
  updatedAt: string;
}

// Drag and drop types
export interface DragResult {
  draggableId: string;
  type: string;
  source: {
    droppableId: string;
    index: number;
  };
  destination: {
    droppableId: string;
    index: number;
  } | null;
}

// Mutation types
export interface MoveCardParams {
  cardId: string;
  destinationListId: string;
  destinationIndex: number;
}

export interface MoveListParams {
  listId: string;
  position: number;
}

export interface UpdateCardParams {
  title?: string;
  description?: string;
  position?: number;
  isCompleted?: boolean;
}

export interface UpdateListParams {
  title?: string;
  position?: number;
}

// Utility types for array operations
export type ReorderArray<T> = (array: T[], fromIndex: number, toIndex: number) => T[];

// Generic reorder function type
export type ReorderFunction<T> = (items: T[], sourceIndex: number, destinationIndex: number) => T[];
