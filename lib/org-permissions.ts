import { db } from "./db";
import { getCurrentUser } from "./auth";

export type OrganizationRole = "ADMIN" | "MEMBER" | "OBSERVER";

/**
 * Check if user is admin of an organization
 */
export async function isOrgAdmin(
  organizationId: string,
  userId?: string
): Promise<boolean> {
  if (!userId) {
    const user = await getCurrentUser();
    if (!user) return false;
    userId = user.id;
  }

  const membership = await db.organizationMember.findUnique({
    where: {
      organizationId_userId: {
        organizationId,
        userId,
      },
    },
  });

  return membership?.role === "ADMIN";
}

/**
 * Check if user is member of an organization
 */
export async function isOrgMember(
  organizationId: string,
  userId?: string
): Promise<boolean> {
  if (!userId) {
    const user = await getCurrentUser();
    if (!user) return false;
    userId = user.id;
  }

  const membership = await db.organizationMember.findUnique({
    where: {
      organizationId_userId: {
        organizationId,
        userId,
      },
    },
  });

  return !!membership && !!membership.joinedAt; // Must have accepted invitation
}

/**
 * Get user's role in an organization
 */
export async function getUserOrgRole(
  organizationId: string,
  userId?: string
): Promise<OrganizationRole | null> {
  if (!userId) {
    const user = await getCurrentUser();
    if (!user) return null;
    userId = user.id;
  }

  const membership = await db.organizationMember.findUnique({
    where: {
      organizationId_userId: {
        organizationId,
        userId,
      },
    },
  });

  return membership?.role || null;
}

/**
 * Check if user can edit organization settings
 */
export async function canEditOrgSettings(
  organizationId: string
): Promise<boolean> {
  return isOrgAdmin(organizationId);
}

/**
 * Check if user can view organization boards
 */
export async function canViewOrgBoards(
  organizationId: string
): Promise<boolean> {
  return isOrgMember(organizationId);
}

/**
 * Check if user can create boards in organization
 */
export async function canCreateOrgBoards(
  organizationId: string
): Promise<boolean> {
  const role = await getUserOrgRole(organizationId);
  return role === "ADMIN" || role === "MEMBER";
}

/**
 * Check if user can edit boards in organization
 */
export async function canEditOrgBoards(
  organizationId: string
): Promise<boolean> {
  const role = await getUserOrgRole(organizationId);
  return role === "ADMIN" || role === "MEMBER";
}

/**
 * Check if user can delete boards in organization
 */
export async function canDeleteOrgBoards(
  organizationId: string
): Promise<boolean> {
  return isOrgAdmin(organizationId);
}

