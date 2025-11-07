import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";

// POST /api/storage/your-files/[fileId]/favorite - Add file to favorites
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ fileId: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { fileId } = await params;

    // Check if attachment exists and user has access
    const attachment = await db.attachment.findFirst({
      where: {
        id: fileId,
        card: {
          OR: [
            {
              list: {
                board: {
                  ownerId: user.id
                }
              }
            },
            {
              list: {
                board: {
                  members: {
                    some: {
                      userId: user.id
                    }
                  }
                }
              }
            }
          ]
        }
      }
    });

    if (!attachment) {
      return NextResponse.json({ error: "File not found or unauthorized" }, { status: 404 });
    }

    // Check if favorite already exists
    const existingFavorite = await db.favoriteAttachment.findUnique({
      where: {
        userId_attachmentId: {
          userId: user.id,
          attachmentId: fileId
        }
      }
    });

    if (existingFavorite) {
      return NextResponse.json({ error: "File is already favorited" }, { status: 409 });
    }

    // Create the favorite
    const favorite = await db.favoriteAttachment.create({
      data: {
        userId: user.id,
        attachmentId: fileId
      },
      include: {
        attachment: {
          select: {
            id: true,
            filename: true
          }
        }
      }
    });

    return NextResponse.json(favorite, { status: 201 });
  } catch (error) {
    console.error("Error adding file to favorites:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// DELETE /api/storage/your-files/[fileId]/favorite - Remove file from favorites
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ fileId: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { fileId } = await params;

    // Check if favorite exists
    const favorite = await db.favoriteAttachment.findUnique({
      where: {
        userId_attachmentId: {
          userId: user.id,
          attachmentId: fileId
        }
      }
    });

    if (!favorite) {
      return NextResponse.json({ error: "File is not favorited" }, { status: 404 });
    }

    // Delete the favorite
    await db.favoriteAttachment.delete({
      where: {
        id: favorite.id
      }
    });

    return NextResponse.json({ message: "File removed from favorites" }, { status: 200 });
  } catch (error) {
    console.error("Error removing file from favorites:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// GET /api/storage/your-files/[fileId]/favorite - Check if file is favorited
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ fileId: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { fileId } = await params;

    // Check if favorite exists
    const favorite = await db.favoriteAttachment.findUnique({
      where: {
        userId_attachmentId: {
          userId: user.id,
          attachmentId: fileId
        }
      }
    });

    return NextResponse.json({ isFavorite: !!favorite }, { status: 200 });
  } catch (error) {
    console.error("Error checking favorite status:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

