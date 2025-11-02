# Organization Setup Guide

## Quick Start

### 1. Update Prisma Schema

Add the organization models from `prisma/organization-schema-additions.prisma` to your main `schema.prisma`:

- Add `Organization` model
- Add `OrganizationMember` model  
- Add `OrganizationRole` enum
- Update `User` model: add `organizationMemberships OrganizationMember[]`
- Update `Board` model: add optional `organizationId` and `organization` relation

Then run:
```bash
npx prisma generate
npx prisma db push
```

### 2. Enable Organizations in Clerk Dashboard

1. Go to [Clerk Dashboard](https://dashboard.clerk.com)
2. Navigate to **Settings** → **Organizations**
3. Enable **"Organizations"**
4. Set up organization roles:
   - `org:admin` - Full control
   - `org:member` - Can create/edit boards
   - `org:observer` - Read-only access

### 3. Set Up Webhook

1. In Clerk Dashboard, go to **Webhooks**
2. Create a new endpoint: `https://your-domain.com/api/webhooks/clerk`
3. Subscribe to these events:
   - `organization.created`
   - `organizationMembership.created`
   - `organizationMembership.updated`
   - `organizationMembership.deleted`
4. Copy the webhook secret to `.env.local`:
   ```
   CLERK_WEBHOOK_SECRET=whsec_...
   ```

### 4. Install Dependencies (if needed)

```bash
npm install svix
```

### 5. Update Signup Flow (Optional)

After user signs up, you can:
- Automatically redirect to `/onboarding` for organization creation
- Or allow them to skip and create organization later

Update your signup redirect logic in `app/(auth)/(routes)/sign-up/[[...sign-up]]/page.tsx`:

```typescript
// After successful signup, check if user has organizations
// If not, redirect to /onboarding
```

## Features Implemented

✅ **Organization Creation**
- Users can create organizations after signup
- Organizations sync with Clerk Organizations
- Unique slug generation for URLs

✅ **Member Invitations**
- Admins can invite members via email
- Supports multiple invitations at once
- Role assignment (Member/Observer)
- Automatic sync when invited users sign up

✅ **Role-Based Access Control**
- **Admin**: Full control over organization and boards
- **Member**: Can create/edit boards and cards
- **Observer**: Read-only access to boards

✅ **Webhook Integration**
- Syncs Clerk organization events with database
- Automatic membership updates
- Role synchronization

## Usage Examples

### Check User's Role in Organization

```typescript
import { getUserOrgRole } from "@/lib/org-permissions";

const role = await getUserOrgRole(organizationId);
if (role === "ADMIN") {
  // Allow admin actions
}
```

### Check Permissions

```typescript
import { canEditOrgBoards, isOrgAdmin } from "@/lib/org-permissions";

if (await canEditOrgBoards(organizationId)) {
  // User can edit boards
}

if (await isOrgAdmin(organizationId)) {
  // User is admin
}
```

### Create Organization Board

```typescript
// When creating a board, optionally set organizationId
await db.board.create({
  data: {
    title: "Team Board",
    ownerId: user.id,
    organizationId: orgId, // Makes it an org board
    // ... other fields
  }
});
```

### Filter Boards by Organization

```typescript
// Get organization boards
const orgBoards = await db.board.findMany({
  where: {
    organizationId: orgId,
    // Or include user's personal boards too
    OR: [
      { organizationId: orgId },
      { ownerId: user.id, organizationId: null }
    ]
  }
});
```

## API Endpoints

- `GET /api/organizations` - List user's organizations
- `POST /api/organizations` - Create organization
- `GET /api/organizations/[orgId]` - Get organization details
- `POST /api/organizations/[orgId]/invitations` - Invite members
- `GET /api/organizations/[orgId]/members` - List members
- `PUT /api/organizations/[orgId]/members/[userId]` - Update member role
- `DELETE /api/organizations/[orgId]/members/[userId]` - Remove member

## Next Steps

1. **Create Organization Dashboard UI** (`/dashboard/organizations/[orgId]`)
2. **Add Member Management UI** (invite, remove, change roles)
3. **Update Board Creation** to allow organization selection
4. **Add Organization Settings** (name, description, logo)
5. **Implement Organization-Level Billing** (if using subscriptions)

## Notes

- **Organizations are optional** - Users can work with personal boards only
- Users can belong to multiple organizations
- Boards can be personal (no organization) or organization-owned
- Personal boards: `organizationId: null` - owned by individual user
- Organization boards: `organizationId: set` - shared within organization
- Organization membership requires invitation acceptance
- Webhook syncs ensure data consistency between Clerk and your database
- Users can create organizations anytime from dashboard, not just during onboarding

