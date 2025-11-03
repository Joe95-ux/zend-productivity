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
    console.log("Creating notifications for watchers:", {
      notificationData,
      excludeUserId
    });

    // Debug: Check if there are any watchers in the database at all
    const totalWatchers = await db.watch.count();
    console.log("Total watchers in database:", totalWatchers);

    // Find all users watching the board (include all watchers, we'll filter by preference later)
    const boardWatchers = await db.watch.findMany({
      where: {
        boardId: notificationData.boardId
      },
      select: { userId: true }
    });
    
    console.log("Board watchers found:", boardWatchers.length);
    console.log("Board ID being searched:", notificationData.boardId);

    // Find all users watching the card (if applicable)
    const cardWatchers = notificationData.cardId ? await db.watch.findMany({
      where: {
        cardId: notificationData.cardId
      },
      select: { userId: true }
    }) : [];
    
    console.log("Card watchers found:", cardWatchers.length);
    console.log("Card ID being searched:", notificationData.cardId);

    // Find all users watching the list (if we have a card)
    let listWatchers: { userId: string }[] = [];
    if (notificationData.cardId) {
      // First get the card's listId
      const card = await db.card.findUnique({
        where: { id: notificationData.cardId },
        select: { listId: true }
      });
      
      if (card?.listId) {
        listWatchers = await db.watch.findMany({
          where: {
            listId: card.listId
          },
          select: { userId: true }
        });
      }
    }
    
    console.log("List watchers found:", listWatchers.length);

    // Combine all watchers and remove duplicates
    const allWatchers = new Set([
      ...boardWatchers.map(w => w.userId),
      ...cardWatchers.map(w => w.userId),
      ...listWatchers.map(w => w.userId)
    ]);
    
    console.log("Total unique watchers:", allWatchers.size);

    // Get user details for ALL watchers (for in-app notifications)
    const allWatcherUsers = await db.user.findMany({
      where: {
        id: { in: Array.from(allWatchers) }
      },
      select: {
        id: true,
        email: true,
        name: true,
        emailFrequency: true,
        notifyOwnActions: true,
        emailNotifications: true
      }
    });

    // Get user details for email notifications (only those with email enabled)
    const emailWatcherUsers = allWatcherUsers.filter(user => user.emailNotifications);

    // Create notifications for all watchers, respecting user preferences
    const notificationsToCreate = [];
    
    for (const userId of allWatchers) {
      const isOwnAction = userId === excludeUserId;
      const user = allWatcherUsers.find(u => u.id === userId);
      
      // Only create notification if user wants to be notified for their own actions
      // or if it's not their own action
      if (user && (user.notifyOwnActions || !isOwnAction)) {
        notificationsToCreate.push({
          userId,
          type: notificationData.type,
          title: notificationData.title,
          message: notificationData.message,
          boardId: notificationData.boardId,
          cardId: notificationData.cardId,
          activityId: notificationData.activityId,
          isRead: false
        });
      }
    }

    console.log("Notifications to create:", notificationsToCreate.length);
    
    if (notificationsToCreate.length > 0) {
      await db.notification.createMany({
        data: notificationsToCreate
      });
      console.log("Created notifications successfully");
    } else {
      console.log("No notifications to create");
    }

    // Send email notifications for users who have them enabled
    await sendEmailNotificationsToWatchers(
      emailWatcherUsers,
      notificationData,
      excludeUserId
    );

    return notificationsToCreate.length;
  } catch (error) {
    console.error("Error creating notifications for watchers:", error);
    return 0;
  }
}

async function sendEmailNotificationsToWatchers(
  watcherUsers: Array<{
    id: string;
    email: string;
    name?: string | null;
    emailFrequency: string;
    notifyOwnActions: boolean;
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
  // Filter based on user preference for own actions
  const immediateUsers = watcherUsers.filter(user => {
    const isOwnAction = user.id === excludeUserId;
    const shouldNotify = user.emailFrequency === "immediate" && 
      (user.notifyOwnActions || !isOwnAction);
    return shouldNotify;
  });

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
