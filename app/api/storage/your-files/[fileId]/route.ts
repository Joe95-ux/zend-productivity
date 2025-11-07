import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";

// PATCH /api/storage/your-files/[fileId] - Update file (filename)
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ fileId: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { fileId } = await params;
    const body = await request.json();
    const { filename } = body;

    if (!filename || !filename.trim()) {
      return NextResponse.json({ error: "Filename is required" }, { status: 400 });
    }

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

    // Update the filename
    const updated = await db.attachment.update({
      where: { id: fileId },
      data: { filename: filename.trim() },
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

    return NextResponse.json(updated, { status: 200 });
  } catch (error) {
    console.error("Error updating file:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// DELETE /api/storage/your-files/[fileId] - Delete file
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

    // Delete the attachment
    await db.attachment.delete({
      where: { id: fileId }
    });

    return NextResponse.json({ message: "File deleted successfully" }, { status: 200 });
  } catch (error) {
    console.error("Error deleting file:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

