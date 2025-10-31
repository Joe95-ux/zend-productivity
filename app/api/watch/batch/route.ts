import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    let requestBody;
    try {
      const bodyText = await request.text();
      console.log("Raw request body:", bodyText);
      
      if (!bodyText || bodyText.trim() === '') {
        console.error("Empty request body received");
        return NextResponse.json({ error: "Empty request body" }, { status: 400 });
      }
      
      requestBody = JSON.parse(bodyText);
    } catch (jsonError) {
      console.error("Error parsing request JSON:", jsonError);
      return NextResponse.json({ error: "Invalid JSON in request body" }, { status: 400 });
    }

    const { cardIds, listIds, boardId } = requestBody;

    if (!cardIds && !listIds && !boardId) {
      return NextResponse.json({ error: "No items to check" }, { status: 400 });
    }

    // Build the where clause for the watch query
    interface WatchWhereClause {
      userId: string;
      OR?: Array<{ boardId?: string; listId?: { in: string[] }; cardId?: { in: string[] } }>;
    }
    
    const whereClause: WatchWhereClause = {
      userId: user.id
    };

    const orConditions = [];
    
    if (boardId) {
      orConditions.push({ boardId });
    }
    
    if (listIds && listIds.length > 0) {
      orConditions.push({ listId: { in: listIds } });
    }
    
    if (cardIds && cardIds.length > 0) {
      orConditions.push({ cardId: { in: cardIds } });
    }

    if (orConditions.length > 0) {
      whereClause.OR = orConditions;
    }

    // Get all watches for the user
    const watches = await db.watch.findMany({
      where: whereClause,
      select: {
        id: true,
        boardId: true,
        listId: true,
        cardId: true
      }
    });

    // Create a map of watched items
    const watchMap: Record<string, boolean> = {};
    
    watches.forEach(watch => {
      if (watch.boardId) {
        watchMap[`board:${watch.boardId}`] = true;
      }
      if (watch.listId) {
        watchMap[`list:${watch.listId}`] = true;
      }
      if (watch.cardId) {
        watchMap[`card:${watch.cardId}`] = true;
      }
    });

    return NextResponse.json({ watchMap });
  } catch (error) {
    console.error("Error checking batch watch status:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
