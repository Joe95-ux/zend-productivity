# Trello-Style Productivity MVP

A minimal but functional Trello-style productivity tool built with Next.js, TypeScript, and modern web technologies.

## Features

### ✅ Landing Page & Navigation
- **Minimalist Landing Page**: Beautiful hero section with features showcase
- **Responsive Navbar**: Adaptive navigation with user profile and auth buttons
- **Theme Toggle**: Dark/light mode switcher in navbar
- **Authentication Flow**: Seamless sign-in/sign-up experience

### ✅ Core Functionality
- **Authentication**: Clerk integration for user management
- **Boards**: Create, edit, delete, and view boards
- **Lists**: Create, edit, delete, and reorder lists within boards
- **Cards**: Create, edit, delete, and drag-and-drop reorder cards
- **Comments**: Add comments to cards with real-time updates
- **Activity Tracking**: Track all board activities (card creation, updates, deletions)

### ✅ User Experience
- **Dark/Light Mode**: Theme switcher with system preference detection
- **Responsive Design**: Mobile-friendly layout
- **Drag & Drop**: Smooth card and list reordering with @dnd-kit
- **Loading States**: Skeleton loading and optimistic updates
- **Real-time Updates**: React Query for efficient data fetching

### ✅ Technical Features
- **TypeScript**: Full type safety
- **Database**: MongoDB with Prisma ORM
- **API Routes**: RESTful API with proper error handling
- **Form Validation**: Zod schema validation
- **UI Components**: shadcn/ui component library
- **Styling**: Tailwind CSS with custom design system

## Project Structure

```
app/
├── (auth)/                 # Authentication pages
│   ├── login/page.tsx
│   └── signup/page.tsx
├── (dashboard)/            # Protected dashboard routes
│   ├── layout.tsx          # Dashboard layout
│   ├── page.tsx           # Dashboard home (boards list)
│   └── boards/[boardId]/   # Individual board pages
│       └── page.tsx
├── api/                    # API routes
│   ├── boards/            # Board CRUD operations
│   ├── lists/             # List CRUD operations
│   ├── cards/             # Card CRUD operations
│   ├── comments/          # Comment operations
│   └── activities/         # Activity feed
├── page.tsx               # Landing page
├── not-found.tsx          # 404 page
├── loading.tsx            # Loading component
└── globals.css

components/
├── navbar/                # Navigation components
│   └── Navbar.tsx
├── boards/                # Board-related components
│   ├── BoardCard.tsx
│   ├── CreateBoardForm.tsx
│   └── EditBoardForm.tsx
├── lists/                 # List-related components
│   ├── ListContainer.tsx
│   └── CreateListForm.tsx
├── cards/                 # Card-related components
│   ├── CardItem.tsx
│   ├── CardModal.tsx
│   └── CreateCardForm.tsx
├── activities/            # Activity components
│   └── ActivityFeed.tsx
├── dnd/                   # Drag and drop
│   └── DndProvider.tsx
└── ui/                    # shadcn/ui components
```

## Getting Started

1. **Install Dependencies**
   ```bash
   npm install
   ```

2. **Environment Setup**
   ```bash
   # Copy environment variables
   cp .env.example .env.local
   
   # Add your environment variables:
   # - DATABASE_URL (MongoDB connection string)
   # - NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY
   # - CLERK_SECRET_KEY
   ```

3. **Database Setup**
   ```bash
   # Generate Prisma client
   npx prisma generate
   
   # Push schema to database
   npx prisma db push
   ```

4. **Run Development Server**
   ```bash
   npm run dev
   ```

## API Endpoints

### Boards
- `GET /api/boards` - Get user's boards
- `POST /api/boards` - Create new board
- `GET /api/boards/[boardId]` - Get specific board
- `PUT /api/boards/[boardId]` - Update board
- `DELETE /api/boards/[boardId]` - Delete board

### Lists
- `POST /api/lists` - Create new list
- `PUT /api/lists/[listId]` - Update list
- `DELETE /api/lists/[listId]` - Delete list

### Cards
- `POST /api/cards` - Create new card
- `PUT /api/cards/[cardId]` - Update card
- `DELETE /api/cards/[cardId]` - Delete card

### Comments
- `POST /api/comments` - Add comment to card

### Activities
- `GET /api/activities?boardId=[boardId]` - Get board activities

## Database Schema

The application uses MongoDB with the following main entities:

- **User**: Clerk user integration
- **Board**: Project boards with owner and members
- **List**: Columns within boards
- **Card**: Tasks within lists
- **Comment**: Comments on cards
- **Activity**: Activity log for tracking changes
- **Label**: Card labels (future feature)
- **Checklist**: Card checklists (future feature)

## Key Technologies

- **Framework**: Next.js 15 with App Router
- **Language**: TypeScript
- **Database**: MongoDB with Prisma ORM
- **Authentication**: Clerk
- **State Management**: TanStack Query (React Query)
- **UI**: shadcn/ui + Tailwind CSS
- **Drag & Drop**: @dnd-kit
- **Forms**: React Hook Form + Zod validation
- **Icons**: Lucide React

## Future Enhancements

- [ ] Card labels and colors
- [ ] Checklists within cards
- [ ] File attachments
- [ ] Due dates and reminders
- [ ] Board templates
- [ ] Team collaboration features
- [ ] Advanced filtering and search
- [ ] Board archiving
- [ ] Export/import functionality

## Development Notes

- All routes are protected with Clerk authentication
- Optimistic updates for better UX
- Proper error handling and loading states
- Responsive design for mobile devices
- Type-safe API calls with React Query
- Real-time activity tracking
- Drag-and-drop with visual feedback

This MVP provides a solid foundation for a full-featured productivity application with room for future enhancements and scaling.
