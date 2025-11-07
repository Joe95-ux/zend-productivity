import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { url, type, filename } = body;

    if (!url) {
      return NextResponse.json({ error: "URL is required" }, { status: 400 });
    }

    // Find or create a storage board for the user
    let storageBoard = await db.board.findFirst({
      where: {
        ownerId: user.id,
        title: "My Files Storage",
        workspaceId: null,
        projectId: null
      }
    });

    if (!storageBoard) {
      // Create storage board
      storageBoard = await db.board.create({
        data: {
          title: "My Files Storage",
          ownerId: user.id,
          description: "Storage for files uploaded directly to Your Files"
        }
      });

      // Create a default list for storage
      await db.list.create({
        data: {
          title: "Files",
          boardId: storageBoard.id,
          position: 0
        }
      });
    }

    // Get or create a storage card
    const storageList = await db.list.findFirst({
      where: {
        boardId: storageBoard.id,
        title: "Files"
      }
    });

    if (!storageList) {
      return NextResponse.json(
        { error: "Storage list not found" },
        { status: 500 }
      );
    }

    let storageCard = await db.card.findFirst({
      where: {
        listId: storageList.id,
        title: "Storage"
      }
    });

    if (!storageCard) {
      // Get the current max position in the list
      const maxPositionCard = await db.card.findFirst({
        where: { listId: storageList.id },
        orderBy: { position: "desc" },
        select: { position: true }
      });
      const nextPosition = maxPositionCard ? maxPositionCard.position + 1 : 0;

      storageCard = await db.card.create({
        data: {
          title: "Storage",
          listId: storageList.id,
          position: nextPosition
        }
      });
    }

    // Create the attachment
    const attachment = await db.attachment.create({
      data: {
        url,
        type: type || 'file',
        filename: filename || null,
        cardId: storageCard.id
      },
      include: {
        card: {
          select: {
            id: true,
            title: true,
            list: {
              select: {
                id: true,
                title: true,
                board: {
                  select: {
                    id: true,
                    title: true
                  }
                }
              }
            }
          }
        }
      }
    });

    return NextResponse.json(attachment, { status: 201 });
  } catch (error) {
    console.error("Error uploading file to storage:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

