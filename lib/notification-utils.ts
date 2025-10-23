import { db } from "./db";
import { sendWatchNotification } from "./email";

export interface NotificationData {
  type: string;
  title: string;
  message: string;
  boardId?: string;
  cardId?: string;
  activityId?: string;
}

export async function createNotificationForWatchers(
  notificationData: NotificationData,
  excludeUserId?: string
) {
  try {
    // Find all users watching the board
    const boardWatchers = await db.watch.findMany({
      where: {
        boardId: notificationData.boardId,
        userId: excludeUserId ? { not: excludeUserId } : undefined
      },
      select: { userId: true }
    });

    // Find all users watching the card (if applicable)
    const cardWatchers = notificationData.cardId ? await db.watch.findMany({
      where: {
        cardId: notificationData.cardId,
        userId: excludeUserId ? { not: excludeUserId } : undefined
      },
      select: { userId: true }
    }) : [];

    // Find all users watching the list (if we have a card)
    const listWatchers = notificationData.cardId ? await db.watch.findMany({
      where: {
        listId: {
          in: await db.card.findUnique({
            where: { id: notificationData.cardId },
            select: { listId: true }
          }).then(card => card ? [card.listId] : [])
        },
        userId: excludeUserId ? { not: excludeUserId } : undefined
      },
      select: { userId: true }
    }) : [];

    // Combine all watchers and remove duplicates
    const allWatchers = new Set([
      ...boardWatchers.map(w => w.userId),
      ...cardWatchers.map(w => w.userId),
      ...listWatchers.map(w => w.userId)
    ]);

    // Get user details for email notifications
    const watcherUsers = await db.user.findMany({
      where: {
        id: { in: Array.from(allWatchers) },
        emailNotifications: true
      },
      select: {
        id: true,
        email: true,
        name: true,
        emailFrequency: true
      }
    });

    // Create notifications for all watchers
    const notifications = Array.from(allWatchers).map(userId => ({
      userId,
      type: notificationData.type,
      title: notificationData.title,
      message: notificationData.message,
      boardId: notificationData.boardId,
      cardId: notificationData.cardId,
      activityId: notificationData.activityId,
      isRead: false
    }));

    if (notifications.length > 0) {
      await db.notification.createMany({
        data: notifications
      });
    }

    // Send email notifications for users who have them enabled
    await sendEmailNotificationsToWatchers(
      watcherUsers,
      notificationData,
      excludeUserId
    );

    return notifications.length;
  } catch (error) {
    console.error("Error creating notifications for watchers:", error);
    return 0;
  }
}

async function sendEmailNotificationsToWatchers(
  watcherUsers: Array<{
    id: string;
    email: string;
    name?: string;
    emailFrequency: string;
  }>,
  notificationData: NotificationData,
  excludeUserId?: string
) {
  // Get additional context for email
  const board = await db.board.findUnique({
    where: { id: notificationData.boardId },
    select: { title: true }
  });

  const card = notificationData.cardId ? await db.card.findUnique({
    where: { id: notificationData.cardId },
    select: { 
      title: true,
      list: {
        select: {
          title: true
        }
      }
    }
  }) : null;

  const actionUser = excludeUserId ? await db.user.findUnique({
    where: { id: excludeUserId },
    select: { name: true, email: true }
  }) : null;

  // Send emails to users with immediate notifications
  const immediateUsers = watcherUsers.filter(user => 
    user.emailFrequency === "immediate" && user.id !== excludeUserId
  );

  for (const user of immediateUsers) {
    try {
      await sendWatchNotification(
        user.email,
        notificationData.type,
        {
          title: notificationData.title,
          message: notificationData.message,
          boardTitle: board?.title,
          cardTitle: card?.title,
          listTitle: card?.list?.title,
          actionBy: actionUser?.name || actionUser?.email || 'Someone',
          actionUrl: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/boards/${notificationData.boardId}`
        }
      );
    } catch (error) {
      console.error(`Error sending email to ${user.email}:`, error);
    }
  }
}

export async function createActivityWithNotifications(
  activityData: {
    type: string;
    message: string;
    boardId: string;
    cardId?: string;
    userId: string;
  }
) {
  try {
    // Create the activity
    const activity = await db.activity.create({
      data: {
        type: activityData.type,
        message: activityData.message,
        boardId: activityData.boardId,
        cardId: activityData.cardId,
        userId: activityData.userId
      }
    });

    // Create notifications for watchers
    const notificationCount = await createNotificationForWatchers({
      type: activityData.type,
      title: getNotificationTitle(activityData.type),
      message: activityData.message,
      boardId: activityData.boardId,
      cardId: activityData.cardId,
      activityId: activity.id
    }, activityData.userId);

    return { activity, notificationCount };
  } catch (error) {
    console.error("Error creating activity with notifications:", error);
    throw error;
  }
}

function getNotificationTitle(activityType: string): string {
  const titleMap: Record<string, string> = {
    "created_card": "New Card Created",
    "moved_card": "Card Moved",
    "updated_card": "Card Updated",
    "completed_card": "Card Completed",
    "added_comment": "New Comment",
    "added_member": "New Member Added",
    "created_list": "New List Created",
    "archived_card": "Card Archived",
    "due_date_changed": "Due Date Changed"
  };

  return titleMap[activityType] || "Board Activity";
}
