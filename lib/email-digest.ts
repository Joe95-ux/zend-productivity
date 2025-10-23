import { db } from "./db";
import { sendEmailNotification } from "./email";

export async function sendDailyDigest() {
  try {
    // Get all users who have daily email frequency
    const users = await db.user.findMany({
      where: {
        emailNotifications: true,
        emailFrequency: "daily"
      },
      select: {
        id: true,
        email: true,
        name: true
      }
    });

    for (const user of users) {
      await sendUserDailyDigest(user);
    }

    console.log(`Sent daily digest to ${users.length} users`);
  } catch (error) {
    console.error("Error sending daily digest:", error);
  }
}

export async function sendWeeklyDigest() {
  try {
    // Get all users who have weekly email frequency
    const users = await db.user.findMany({
      where: {
        emailNotifications: true,
        emailFrequency: "weekly"
      },
      select: {
        id: true,
        email: true,
        name: true
      }
    });

    for (const user of users) {
      await sendUserWeeklyDigest(user);
    }

    console.log(`Sent weekly digest to ${users.length} users`);
  } catch (error) {
    console.error("Error sending weekly digest:", error);
  }
}

async function sendUserDailyDigest(user: { id: string; email: string; name?: string }) {
  try {
    // Get yesterday's notifications for this user
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    yesterday.setHours(0, 0, 0, 0);

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const notifications = await db.notification.findMany({
      where: {
        userId: user.id,
        createdAt: {
          gte: yesterday,
          lt: today
        }
      },
      include: {
        activity: {
          include: {
            user: true,
            board: {
              select: { title: true }
            },
            card: {
              select: { 
                title: true,
                list: {
                  select: { title: true }
                }
              }
            }
          }
        }
      },
      orderBy: { createdAt: "desc" }
    });

    if (notifications.length === 0) {
      return; // No notifications to send
    }

    const subject = `Daily Digest - ${notifications.length} notification${notifications.length > 1 ? 's' : ''}`;
    const html = generateDigestEmail(notifications, "daily");

    await sendEmailNotification({
      to: user.email,
      subject,
      html
    });
  } catch (error) {
    console.error(`Error sending daily digest to ${user.email}:`, error);
  }
}

async function sendUserWeeklyDigest(user: { id: string; email: string; name?: string }) {
  try {
    // Get last week's notifications for this user
    const lastWeek = new Date();
    lastWeek.setDate(lastWeek.getDate() - 7);
    lastWeek.setHours(0, 0, 0, 0);

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const notifications = await db.notification.findMany({
      where: {
        userId: user.id,
        createdAt: {
          gte: lastWeek,
          lt: today
        }
      },
      include: {
        activity: {
          include: {
            user: true,
            board: {
              select: { title: true }
            },
            card: {
              select: { 
                title: true,
                list: {
                  select: { title: true }
                }
              }
            }
          }
        }
      },
      orderBy: { createdAt: "desc" }
    });

    if (notifications.length === 0) {
      return; // No notifications to send
    }

    const subject = `Weekly Digest - ${notifications.length} notification${notifications.length > 1 ? 's' : ''}`;
    const html = generateDigestEmail(notifications, "weekly");

    await sendEmailNotification({
      to: user.email,
      subject,
      html
    });
  } catch (error) {
    console.error(`Error sending weekly digest to ${user.email}:`, error);
  }
}

function generateDigestEmail(notifications: any[], type: "daily" | "weekly"): string {
  const period = type === "daily" ? "yesterday" : "this week";
  const notificationCount = notifications.length;

  // Group notifications by board
  const notificationsByBoard = notifications.reduce((acc, notification) => {
    const boardTitle = notification.activity?.board?.title || "Unknown Board";
    if (!acc[boardTitle]) {
      acc[boardTitle] = [];
    }
    acc[boardTitle].push(notification);
    return acc;
  }, {} as Record<string, any[]>);

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Zend Productivity ${type === "daily" ? "Daily" : "Weekly"} Digest</title>
      <style>
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          line-height: 1.6;
          color: #333;
          max-width: 600px;
          margin: 0 auto;
          padding: 20px;
          background-color: #f8f9fa;
        }
        .container {
          background: white;
          border-radius: 8px;
          padding: 30px;
          box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        }
        .header {
          border-bottom: 1px solid #e9ecef;
          padding-bottom: 20px;
          margin-bottom: 20px;
        }
        .logo {
          font-size: 24px;
          font-weight: bold;
          color: #2563eb;
        }
        .summary {
          background-color: #f1f5f9;
          padding: 20px;
          border-radius: 6px;
          margin: 20px 0;
          text-align: center;
        }
        .board-section {
          margin: 25px 0;
          border: 1px solid #e9ecef;
          border-radius: 6px;
          overflow: hidden;
        }
        .board-header {
          background-color: #f8f9fa;
          padding: 15px;
          font-weight: 600;
          color: #374151;
          border-bottom: 1px solid #e9ecef;
        }
        .notification-item {
          padding: 15px;
          border-bottom: 1px solid #f1f5f9;
        }
        .notification-item:last-child {
          border-bottom: none;
        }
        .notification-message {
          font-size: 14px;
          margin-bottom: 5px;
        }
        .notification-meta {
          font-size: 12px;
          color: #6b7280;
        }
        .footer {
          margin-top: 30px;
          padding-top: 20px;
          border-top: 1px solid #e9ecef;
          font-size: 12px;
          color: #6b7280;
          text-align: center;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <div class="logo">Zend Productivity</div>
        </div>
        
        <div class="summary">
          <h2>Your ${type === "daily" ? "Daily" : "Weekly"} Activity Summary</h2>
          <p>You have <strong>${notificationCount}</strong> notification${notificationCount > 1 ? 's' : ''} from ${period}</p>
        </div>

        ${Object.entries(notificationsByBoard).map(([boardTitle, boardNotifications]) => `
          <div class="board-section">
            <div class="board-header">${boardTitle}</div>
            ${boardNotifications.map(notification => `
              <div class="notification-item">
                <div class="notification-message">${notification.message}</div>
                <div class="notification-meta">
                  ${notification.activity?.user?.name || notification.activity?.user?.email || 'Someone'} • 
                  ${new Date(notification.createdAt).toLocaleString()}
                  ${notification.cardId ? ` • Card: ${notification.activity?.card?.title || 'Unknown'}` : ''}
                </div>
              </div>
            `).join('')}
          </div>
        `).join('')}
        
        <div class="footer">
          <p>You're receiving this because you have email notifications enabled.</p>
          <p>To change your notification preferences, visit your settings in the app.</p>
        </div>
      </div>
    </body>
    </html>
  `;
}
