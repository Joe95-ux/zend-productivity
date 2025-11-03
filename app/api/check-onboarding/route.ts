import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const clerkId = searchParams.get('clerkId')

  if (!clerkId) {
    return NextResponse.json({ needsOnboarding: false }, { status: 400 })
  }

  try {
    const user = await db.user.findUnique({
      where: { clerkId },
      include: {
        organizationMemberships: {
          where: {
            joinedAt: { not: null },
          },
        },
        boards: {
          take: 1,
        },
      },
    })

    if (!user) {
      return NextResponse.json({ needsOnboarding: true })
    }

    const hasOrganizations = user.organizationMemberships.length > 0
    const hasBoards = user.boards.length > 0
    const needsOnboarding = !hasOrganizations && !hasBoards

    return NextResponse.json({ needsOnboarding })
  } catch (error) {
    console.error("Error checking onboarding status:", error)
    return NextResponse.json({ needsOnboarding: false }, { status: 500 })
  }
}