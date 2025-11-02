# Organization Implementation with Clerk

## Overview
This document outlines the implementation of organization functionality with Clerk, including:
- Organization creation after user signup
- Optional member invitations
- Role-based access control (Admin, Member, Observer)

## Architecture

### Database Schema Changes

Add these models to `prisma/schema.prisma`:

```prisma
model Organization {
  id          String   @id @default(auto()) @map("_id") @db.ObjectId
  clerkOrgId  String   @unique // Clerk Organization ID
  name        String
  slug        String   @unique // URL-friendly identifier
  description String?
  logoUrl     String?
  boards      Board[]
  members     OrganizationMember[]
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  
  @@index([slug])
  @@index([clerkOrgId])
}

enum OrganizationRole {
  ADMIN
  MEMBER
  OBSERVER
}

model OrganizationMember {
  id             String           @id @default(auto()) @map("_id") @db.ObjectId
  organizationId String           @db.ObjectId
  organization   Organization      @relation(fields: [organizationId], references: [id])
  userId         String           @db.ObjectId
  user           User              @relation(fields: [userId], references: [id])
  role           OrganizationRole @default(MEMBER)
  invitedBy      String?          @db.ObjectId // User ID who sent the invitation
  invitedAt      DateTime?        // When invitation was sent
  joinedAt       DateTime?        // When user accepted invitation
  clerkOrgMemberId String?        @unique // Clerk Organization Membership ID
  createdAt      DateTime         @default(now())
  updatedAt      DateTime         @updatedAt
  
  @@unique([organizationId, userId])
  @@index([organizationId])
  @@index([userId])
  @@index([role])
}

// Update User model to include organizations
model User {
  // ... existing fields ...
  organizationMemberships OrganizationMember[]
}

// Update Board model to optionally belong to an organization
model Board {
  // ... existing fields ...
  organizationId String?        @db.ObjectId
  organization   Organization?   @relation(fields: [organizationId], references: [id])
  // Boards can be personal (organizationId = null) or organization-owned
}
```

### Clerk Setup

1. **Enable Organizations in Clerk Dashboard**:
   - Go to Clerk Dashboard → Settings → Organizations
   - Enable "Organizations"
   - Set up organization roles: `org:admin`, `org:member`, `org:observer`

2. **Update Clerk Configuration**:
   ```typescript
   // In your Clerk component configuration
   <ClerkProvider>
     <OrganizationProvider>
       {/* Your app */}
     </OrganizationProvider>
   </ClerkProvider>
   ```

## Implementation Steps

### Step 1: Update Prisma Schema
- Add Organization and OrganizationMember models
- Update User and Board models to include organization relations
- Run `npx prisma generate` and `npx prisma db push`

### Step 2: Create Onboarding Flow

The onboarding flow is **optional**. After user signs up:
- They can choose **Personal Account** (skip organization creation)
- Or choose to **Create Organization** (for team collaboration)
- If they choose Personal Account, they go straight to dashboard
- If they choose Organization, they:
  1. Enter organization name
  2. Optionally invite members via email
  3. Set their role (default: Admin for creator)

Users can create organizations later from the dashboard - it's not required at signup.

### Step 3: Create API Routes

- `POST /api/organizations` - Create organization
- `GET /api/organizations` - List user's organizations
- `POST /api/organizations/[orgId]/invitations` - Invite members
- `GET /api/organizations/[orgId]/members` - List members
- `PUT /api/organizations/[orgId]/members/[userId]` - Update member role
- `DELETE /api/organizations/[orgId]/members/[userId]` - Remove member
- `DELETE /api/organizations/[orgId]` - Delete organization (admin only)

### Step 4: Webhook Handler

Create `/api/webhooks/clerk` to sync:
- Organization creation/deletion
- Organization membership changes
- User roles updates

### Step 5: Permission Helpers

Create utility functions to check:
- If user is organization admin
- If user can view/edit organization boards
- If user has specific role

### Step 6: Update Board Logic

- Boards can be personal (ownerId only) or organization-owned
- Organization members can access organization boards based on role
- Filter boards by organization

## Role Permissions

### ADMIN
- Create/edit/delete organization
- Invite/remove members
- Change member roles
- Create/edit/delete organization boards
- Full access to all organization boards

### MEMBER
- View organization boards
- Create/edit/delete cards in boards (if board allows)
- Comment on cards
- Cannot delete organization or change settings

### OBSERVER
- View organization boards (read-only)
- Cannot create/edit/delete anything
- Can watch boards/cards for notifications

## File Structure

```
app/
  onboarding/
    page.tsx              # Organization creation flow
  dashboard/
    organizations/
      [orgId]/
        page.tsx          # Organization dashboard
        settings/
          page.tsx        # Organization settings (admin only)
        members/
          page.tsx        # Manage members
api/
  organizations/
    route.ts              # List/create organizations
    [orgId]/
      route.ts            # Get/update/delete organization
      members/
        route.ts          # List members
        [userId]/
          route.ts        # Update/remove member
      invitations/
        route.ts          # Send invitations
  webhooks/
    clerk/
      route.ts            # Sync Clerk events
lib/
  org-permissions.ts      # Permission checking utilities
components/
  organizations/
    CreateOrgModal.tsx
    InviteMemberModal.tsx
    MemberList.tsx
    RoleBadge.tsx
```

