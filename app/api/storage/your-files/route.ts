import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { Prisma } from "@prisma/client";

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search") || "";
    const type = searchParams.get("type") || "all"; // "all", "images", "documents", "other"
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "50");
    const skip = (page - 1) * limit;

    // Get all cards where user has access (owner or member)
    const userCards = await db.card.findMany({
      where: {
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
          },
          {
            list: {
              board: {
                workspace: {
                  OR: [
                    { ownerId: user.id },
                    {
                      members: {
                        some: {
                          userId: user.id
                        }
                      }
                    },
                    {
                      organization: {
                        members: {
                          some: {
                            userId: user.id
                          }
                        }
                      }
                    }
                  ]
                }
              }
            }
          }
        ]
      },
      select: {
        id: true
      }
    });

    const cardIds = userCards.map(card => card.id);

    if (cardIds.length === 0) {
      return NextResponse.json({
        files: [],
        total: 0,
        page,
        limit,
        totalPages: 0
      });
    }

    // Build type filter
    let typeFilter: Prisma.AttachmentWhereInput = {};
    if (type === "images") {
      typeFilter = {
        OR: [
          { type: { startsWith: "image/" } },
          { type: "image" },
          { url: { contains: ".jpg" } },
          { url: { contains: ".jpeg" } },
          { url: { contains: ".png" } },
          { url: { contains: ".gif" } },
          { url: { contains: ".webp" } },
          { url: { contains: ".svg" } }
        ]
      };
    } else if (type === "documents") {
      typeFilter = {
        OR: [
          { type: { startsWith: "application/" } },
          { filename: { contains: ".pdf" } },
          { filename: { contains: ".doc" } },
          { filename: { contains: ".docx" } },
          { filename: { contains: ".xls" } },
          { filename: { contains: ".xlsx" } },
          { filename: { contains: ".ppt" } },
          { filename: { contains: ".pptx" } },
          { filename: { contains: ".txt" } }
        ]
      };
    } else if (type === "other") {
      // Exclude images and documents - show everything else
      // This is a simplified approach - in production you might want more sophisticated filtering
      typeFilter = {
        AND: [
          {
            NOT: {
              OR: [
                { type: { startsWith: "image/" } },
                { type: "image" }
              ]
            }
          },
          {
            NOT: {
              OR: [
                { type: { startsWith: "application/pdf" } },
                { filename: { contains: ".pdf" } },
                { filename: { contains: ".doc" } },
                { filename: { contains: ".docx" } },
                { filename: { contains: ".xls" } },
                { filename: { contains: ".xlsx" } },
                { filename: { contains: ".ppt" } },
                { filename: { contains: ".pptx" } }
              ]
            }
          }
        ]
      };
    }

    // Build search filter
    let searchFilter: Prisma.AttachmentWhereInput = {};
    if (search) {
      searchFilter = {
        OR: [
          { filename: { contains: search, mode: "insensitive" } },
          { url: { contains: search, mode: "insensitive" } }
        ]
      };
    }

    // Get attachments with pagination
    const [attachments, total] = await Promise.all([
      db.attachment.findMany({
        where: {
          cardId: { in: cardIds },
          ...typeFilter,
          ...searchFilter
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
        },
        orderBy: { createdAt: "desc" },
        skip,
        take: limit
      }),
      db.attachment.count({
        where: {
          cardId: { in: cardIds },
          ...typeFilter,
          ...searchFilter
        }
      })
    ]);

    return NextResponse.json({
      files: attachments,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit)
    });
  } catch (error) {
    console.error("Error fetching user files:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

