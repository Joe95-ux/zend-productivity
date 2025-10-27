import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";;
import { db } from "@/lib/db";

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { title, cardId, items } = await request.json();

    if (!title || !cardId) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    // Verify the card exists and user has access
    const card = await db.card.findFirst({
      where: {
        id: cardId
      },
      include: {
        list: {
          include: {
            board: {
              include: {
                members: true
              }
            }
          }
        }
      }
    });

    if (!card) {
      return NextResponse.json({ error: "Card not found" }, { status: 404 });
    }

    // Check if user has access to the board
    const hasAccess = card.list?.board?.ownerId === user.id || 
      card.list?.board?.members?.some(member => member.userId === user.id);

    if (!hasAccess) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    // Create the new checklist
    const newChecklist = await db.checklist.create({
      data: {
        title,
        cardId,
        items: {
          create: items?.map((item: { content: string; isCompleted?: boolean }, index: number) => ({
            content: item.content,
            isCompleted: item.isCompleted || false,
            position: index
          })) || []
        }
      },
      include: {
        items: true
      }
    });

    return NextResponse.json(newChecklist);
  } catch (error) {
    console.error("Error creating checklist:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}