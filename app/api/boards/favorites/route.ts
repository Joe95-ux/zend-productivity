import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";

// GET /api/boards/favorites - Get all favorite boards for current user
export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const favorites = await db.favoriteBoard.findMany({
      where: {
        userId: user.id,
      },
      select: {
        boardId: true,
      },
    });

    return NextResponse.json(favorites);
  } catch (error) {
    console.error("Error fetching favorite boards:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

