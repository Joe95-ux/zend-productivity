import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

/**
 * Get the default "from" email address
 * Uses RESEND_DOMAIN from .env if set, otherwise uses Resend's default domain
 */
function getDefaultFromEmail(): string {
  const domain = process.env.RESEND_DOMAIN;
  if (domain) {
    return `Zend Productivity <notifications@${domain}>`;
  }
  // Resend's default domain for testing/development
  return 'Zend Productivity <onboarding@resend.dev>';
}

export interface EmailNotificationData {
  to: string;
  subject: string;
  html: string;
  from?: string;
}

export async function sendEmailNotification(data: EmailNotificationData) {
  try {
    if (!process.env.RESEND_API_KEY) {
      console.warn('RESEND_API_KEY not configured, skipping email notification');
      return { success: false, error: 'Email service not configured' };
    }

    const result = await resend.emails.send({
      from: data.from || getDefaultFromEmail(),
      to: [data.to],
      subject: data.subject,
      html: data.html,
    });

    console.log('Email sent successfully:', result);
    return { success: true, data: result };
  } catch (error) {
    console.error('Error sending email notification:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

export async function sendWatchNotification(
  userEmail: string,
  notificationType: string,
  notificationData: {
    title: string;
    message: string;
    boardTitle?: string;
    cardTitle?: string;
    listTitle?: string;
    actionBy?: string;
    actionUrl?: string;
  }
) {
  const subject = getEmailSubject(notificationType, notificationData);
  const html = generateEmailTemplate(notificationType, notificationData);

  return await sendEmailNotification({
    to: userEmail,
    subject,
    html,
  });
}

interface NotificationData {
  title: string;
  message: string;
  cardTitle?: string;
  listTitle?: string;
  boardTitle?: string;
  actionBy?: string;
  actionUrl?: string;
}

function getEmailSubject(notificationType: string, data: NotificationData): string {
  const baseSubject = 'Zend Productivity Notification';
  
  switch (notificationType) {
    case 'added_comment':
      return `${baseSubject}: New comment on "${data.cardTitle}"`;
    case 'completed_card':
      return `${baseSubject}: Card completed - "${data.cardTitle}"`;
    case 'updated_card':
      return `${baseSubject}: Card updated - "${data.cardTitle}"`;
    case 'deleted_card':
      return `${baseSubject}: Card deleted - "${data.cardTitle}"`;
    case 'deleted_list':
      return `${baseSubject}: List deleted - "${data.listTitle}"`;
    case 'created_card':
      return `${baseSubject}: New card created - "${data.cardTitle}"`;
    case 'moved_card':
      return `${baseSubject}: Card moved - "${data.cardTitle}"`;
    default:
      return `${baseSubject}: ${data.title}`;
  }
}

function generateEmailTemplate(notificationType: string, data: NotificationData): string {
  const actionBy = data.actionBy || 'Someone';
  const boardTitle = data.boardTitle || 'Board';
  const cardTitle = data.cardTitle || '';
  const listTitle = data.listTitle || '';
  
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Zend Productivity Notification</title>
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
        .notification-content {
          margin: 20px 0;
        }
        .action-by {
          color: #6b7280;
          font-size: 14px;
          margin-bottom: 10px;
        }
        .message {
          font-size: 16px;
          margin: 15px 0;
          padding: 15px;
          background-color: #f8f9fa;
          border-radius: 6px;
          border-left: 4px solid #2563eb;
        }
        .context {
          background-color: #f1f5f9;
          padding: 15px;
          border-radius: 6px;
          margin: 15px 0;
          font-size: 14px;
        }
        .context-item {
          margin: 5px 0;
        }
        .context-label {
          font-weight: 600;
          color: #374151;
        }
        .footer {
          margin-top: 30px;
          padding-top: 20px;
          border-top: 1px solid #e9ecef;
          font-size: 12px;
          color: #6b7280;
          text-align: center;
        }
        .button {
          display: inline-block;
          background-color: #2563eb;
          color: white;
          padding: 12px 24px;
          text-decoration: none;
          border-radius: 6px;
          font-weight: 500;
          margin: 15px 0;
        }
        .button:hover {
          background-color: #1d4ed8;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <div class="logo">Zend Productivity</div>
        </div>
        
        <div class="notification-content">
          <div class="action-by">${actionBy} ${getActionText(notificationType)}</div>
          
          <div class="message">
            ${data.message}
          </div>
          
          <div class="context">
            <div class="context-item">
              <span class="context-label">Board:</span> ${boardTitle}
            </div>
            ${listTitle ? `<div class="context-item"><span class="context-label">List:</span> ${listTitle}</div>` : ''}
            ${cardTitle ? `<div class="context-item"><span class="context-label">Card:</span> ${cardTitle}</div>` : ''}
          </div>
          
          ${data.actionUrl ? `<a href="${data.actionUrl}" class="button">View in Zend Productivity</a>` : ''}
        </div>
        
        <div class="footer">
          <p>You're receiving this because you're watching this item in Zend Productivity.</p>
          <p>To stop receiving notifications, unwatch this item in the app.</p>
        </div>
      </div>
    </body>
    </html>
  `;
}

function getActionText(notificationType: string): string {
  switch (notificationType) {
    case 'added_comment':
      return 'commented on a card';
    case 'completed_card':
      return 'completed a card';
    case 'updated_card':
      return 'updated a card';
    case 'deleted_card':
      return 'deleted a card';
    case 'deleted_list':
      return 'deleted a list';
    case 'created_card':
      return 'created a card';
    case 'moved_card':
      return 'moved a card';
    default:
      return 'performed an action';
  }
}
