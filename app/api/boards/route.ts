import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";

export async function GET() {
  try {
    console.log("GET /api/boards: Starting request");
    const user = await getCurrentUser();
    console.log("GET /api/boards: getCurrentUser result:", user ? "user found" : "no user");
    
    if (!user) {
      console.log("GET /api/boards: Returning 401 - no user");
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const boards = await db.board.findMany({
      where: {
        OR: [
          { ownerId: user.id },
          { members: { some: { userId: user.id } } }
        ]
      },
      include: {
        owner: true,
        members: {
          include: {
            user: true
          }
        },
        lists: {
          orderBy: { position: "asc" },
          include: {
            cards: {
              orderBy: { position: "asc" }
            }
          }
        }
      },
      orderBy: { updatedAt: "desc" }
    });

    return NextResponse.json(boards);
  } catch (error) {
    console.error("Error fetching boards:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { title, description } = body;

    if (!title) {
      return NextResponse.json({ error: "Title is required" }, { status: 400 });
    }

    // Create the board first
    const board = await db.board.create({
      data: {
        title,
        description,
        ownerId: user.id
      },
      include: {
        owner: true,
        members: {
          include: {
            user: true
          }
        },
        lists: {
          orderBy: { position: "asc" }
        }
      }
    });

    // Check if default lists already exist, if not create them
    const existingLists = await db.list.findMany({
      where: { boardId: board.id }
    });

    if (existingLists.length === 0) {
      await db.list.createMany({
        data: [
          { title: "Todo", position: 0, boardId: board.id },
          { title: "In Progress", position: 1, boardId: board.id },
          { title: "Done", position: 2, boardId: board.id }
        ]
      });
    }

    // Fetch the board with updated lists
    const updatedBoard = await db.board.findUnique({
      where: { id: board.id },
      include: {
        owner: true,
        members: {
          include: {
            user: true
          }
        },
        lists: {
          orderBy: { position: "asc" }
        }
      }
    });

    return NextResponse.json(updatedBoard, { status: 201 });
  } catch (error) {
    console.error("Error creating board:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
