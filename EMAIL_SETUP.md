# Email Notifications Setup

This guide explains how to set up email notifications for the Zend Productivity app.

## Prerequisites

1. **Resend Account**: Sign up at [resend.com](https://resend.com)
2. **Domain Setup**: Configure your domain in Resend (optional but recommended)

## Environment Variables

Add these environment variables to your `.env.local` file:

```bash
# Email Service
RESEND_API_KEY=your_resend_api_key_here

# App URL (for email links)
NEXT_PUBLIC_APP_URL=http://localhost:3000

# Cron Secret (for scheduled digest emails)
CRON_SECRET=your_secure_random_string_here
```

## Setup Steps

### 1. Get Resend API Key

1. Go to [resend.com](https://resend.com) and sign up
2. Navigate to API Keys in your dashboard
3. Create a new API key
4. Copy the API key and add it to your `.env.local` file

### 2. Configure Domain (Optional but Recommended)

1. In Resend dashboard, go to "Domains"
2. Add your domain (e.g., `yourdomain.com`)
3. Follow the DNS setup instructions
4. Update your email "from" address in `lib/email.ts`:

```typescript
from: 'Zend Productivity <notifications@yourdomain.com>'
```

### 3. Database Migration

Run the database migration to add email preferences:

```bash
npx prisma db push
```

### 4. Test Email Notifications

1. Start your development server: `npm run dev`
2. Go to `/settings` in your app
3. Configure your email preferences
4. Watch a card, list, or board
5. Perform an action (add comment, complete card, etc.)
6. Check your email for notifications

## Email Notification Types

### Immediate Notifications
- Sent instantly when watched items are updated
- Includes full context and action details
- Best for active users who want real-time updates

### Daily Digest
- Sent once per day with all notifications from the previous day
- Grouped by board for easy reading
- Good for users who don't want to be overwhelmed

### Weekly Digest
- Sent once per week with all notifications from the previous week
- Comprehensive summary of all activity
- Perfect for users who want to stay informed but not overwhelmed

## Cron Jobs (Production)

For production, set up cron jobs to send digest emails:

### Daily Digest (9 AM UTC)
```bash
curl -X POST https://yourdomain.com/api/cron/digest \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer your_cron_secret" \
  -d '{"type": "daily"}'
```

### Weekly Digest (Monday 9 AM UTC)
```bash
curl -X POST https://yourdomain.com/api/cron/digest \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer your_cron_secret" \
  -d '{"type": "weekly"}'
```

## Email Templates

The system includes beautiful HTML email templates for:

- **Immediate Notifications**: Real-time updates with full context
- **Daily Digest**: Summary of yesterday's activity
- **Weekly Digest**: Comprehensive weekly summary

All emails are:
- Mobile-responsive
- Branded with your app colors
- Include unsubscribe information
- Provide direct links back to the app

## User Email Preferences

Users can control their email notifications through the settings page:

1. **Enable/Disable**: Toggle email notifications on/off
2. **Frequency**: Choose between immediate, daily, or weekly
3. **Per-User Control**: Each user can set their own preferences

## Troubleshooting

### Emails Not Sending
1. Check your Resend API key is correct
2. Verify your domain is properly configured in Resend
3. Check the server logs for error messages
4. Ensure `NEXT_PUBLIC_APP_URL` is set correctly

### Users Not Receiving Emails
1. Check user's email preferences in the database
2. Verify the user has `emailNotifications: true`
3. Check if emails are going to spam folder
4. Test with a simple email first

### Digest Emails Not Working
1. Verify the cron job is running
2. Check the `CRON_SECRET` environment variable
3. Ensure the cron job URL is accessible
4. Check server logs for errors

## Security Considerations

1. **API Key Security**: Never commit your Resend API key to version control
2. **Cron Secret**: Use a strong, random string for `CRON_SECRET`
3. **Rate Limiting**: Resend has rate limits, monitor your usage
4. **Email Validation**: Always validate email addresses before sending

## Monitoring

Monitor your email delivery:

1. **Resend Dashboard**: Check delivery rates and bounces
2. **Server Logs**: Monitor for email sending errors
3. **User Feedback**: Ask users if they're receiving emails
4. **Analytics**: Track email open rates and click-through rates

## Cost Considerations

- **Resend Pricing**: Check current pricing at resend.com
- **Volume Limits**: Monitor your email volume
- **Optimization**: Consider digest emails to reduce volume
- **User Preferences**: Allow users to control frequency

## Support

If you need help with email setup:

1. Check the Resend documentation
2. Review the server logs for errors
3. Test with a simple email first
4. Verify all environment variables are set correctly
