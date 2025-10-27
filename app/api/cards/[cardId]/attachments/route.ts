import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ cardId: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }

    const { cardId } = await params;

    // Verify the user has access to the card
    const card = await db.card.findFirst({
      where: {
        id: cardId,
        list: {
          board: {
            OR: [
              { ownerId: user.id },
              { members: { some: { userId: user.id } } }
            ]
          }
        }
      }
    });

    if (!card) {
      return NextResponse.json({ error: "Card not found or unauthorized" }, { status: 404 });
    }

    // Get all attachments for this card
    const attachments = await db.attachment.findMany({
      where: { cardId },
      orderBy: { createdAt: 'desc' }
    });

    return NextResponse.json(attachments);
  } catch (error) {
    console.error("Error fetching attachments:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ cardId: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }

    const { cardId } = await params;
    const body = await request.json();
    const { url, type } = body;

    if (!url) {
      return NextResponse.json({ error: "URL is required" }, { status: 400 });
    }

    // Verify the user has access to the card
    const card = await db.card.findFirst({
      where: {
        id: cardId,
        list: {
          board: {
            OR: [
              { ownerId: user.id },
              { members: { some: { userId: user.id } } }
            ]
          }
        }
      }
    });

    if (!card) {
      return NextResponse.json({ error: "Card not found or unauthorized" }, { status: 404 });
    }

    // Create the attachment
    const attachment = await db.attachment.create({
      data: {
        url,
        type: type || 'image',
        cardId
      }
    });

    return NextResponse.json(attachment);
  } catch (error) {
    console.error("Error creating attachment:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
