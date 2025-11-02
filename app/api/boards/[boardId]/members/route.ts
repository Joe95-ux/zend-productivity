import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";

// GET /api/boards/[boardId]/members - Get all board members
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ boardId: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { boardId } = await params;

    // Check if user has access to the board
    const board = await db.board.findFirst({
      where: {
        id: boardId,
        OR: [
          { ownerId: user.id },
          { members: { some: { userId: user.id } } },
        ],
      },
      include: {
        owner: {
          select: {
            id: true,
            name: true,
            email: true,
            avatarUrl: true,
            clerkId: true,
          },
        },
      },
    });

    if (!board) {
      return NextResponse.json(
        { error: "Board not found or unauthorized" },
        { status: 404 }
      );
    }

    // Get all members including owner
    const members = await db.member.findMany({
      where: { boardId },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            avatarUrl: true,
            clerkId: true,
          },
        },
      },
    });

    // Format response: include owner as admin and other members
    const ownerMember = {
      id: `owner-${board.ownerId}`,
      user: {
        id: board.owner.id,
        name: board.owner.name,
        email: board.owner.email,
        avatarUrl: board.owner.avatarUrl,
        clerkId: board.owner.clerkId,
      },
      role: "admin" as const,
    };

    const formattedMembers = members.map((member) => ({
      id: member.id,
      user: member.user,
      role: member.role as "admin" | "member",
    }));

    // Owner first, then other members
    const allMembers = [ownerMember, ...formattedMembers];

    return NextResponse.json(allMembers);
  } catch (error) {
    console.error("Error fetching board members:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// POST /api/boards/[boardId]/members - Invite a member to the board
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ boardId: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { boardId } = await params;
    const { email, role = "member" } = await request.json();

    if (!email || typeof email !== "string") {
      return NextResponse.json(
        { error: "Email is required" },
        { status: 400 }
      );
    }

    // Check if user is owner or admin of the board
    const board = await db.board.findFirst({
      where: {
        id: boardId,
        OR: [
          { ownerId: user.id },
          {
            members: {
              some: {
                userId: user.id,
                role: "admin",
              },
            },
          },
        ],
      },
      include: {
        owner: true,
      },
    });

    if (!board) {
      return NextResponse.json(
        { error: "Board not found or unauthorized" },
        { status: 404 }
      );
    }

    // Find user by email
    const targetUser = await db.user.findUnique({
      where: { email: email.trim().toLowerCase() },
    });

    if (!targetUser) {
      return NextResponse.json(
        { error: "User with this email not found" },
        { status: 404 }
      );
    }

    // Check if user is already a member
    const existingMember = await db.member.findFirst({
      where: {
        boardId,
        userId: targetUser.id,
      },
    });

    if (existingMember) {
      return NextResponse.json(
        { error: "User is already a member of this board" },
        { status: 400 }
      );
    }

    // Check if user is the owner
    if (board.ownerId === targetUser.id) {
      return NextResponse.json(
        { error: "User is already the owner of this board" },
        { status: 400 }
      );
    }

    // Create member
    const member = await db.member.create({
      data: {
        boardId,
        userId: targetUser.id,
        role: role === "admin" ? "admin" : "member",
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            avatarUrl: true,
            clerkId: true,
          },
        },
      },
    });

    return NextResponse.json({
      id: member.id,
      user: member.user,
      role: member.role as "admin" | "member",
    });
  } catch (error) {
    console.error("Error inviting member:", error);
    
    // Handle Prisma unique constraint errors
    if (error && typeof error === "object" && "code" in error && error.code === "P2002") {
      return NextResponse.json(
        { error: "User is already a member" },
        { status: 409 }
      );
    }

    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    );
  }
}

