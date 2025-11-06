# Vercel Deployment Configuration Guide

This guide covers all the configuration needed to deploy your Zend Productivity app on Vercel.

## Required Environment Variables

Add these environment variables in your Vercel dashboard under **Settings → Environment Variables**:

### 1. Database (MongoDB)
```
DATABASE_URL=your_mongodb_connection_string_here
```
**Note**: Get your MongoDB connection string from MongoDB Atlas. Format: `mongodb+srv://username:password@cluster.mongodb.net/database-name?retryWrites=true&w=majority`

### 2. Clerk Authentication
```
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=your_clerk_publishable_key_here
CLERK_SECRET_KEY=your_clerk_secret_key_here
```
**Note**: Get these from Clerk Dashboard → API Keys

### 3. Clerk Webhook Secret
```
CLERK_WEBHOOK_SECRET=your_clerk_webhook_secret_here
```
**Note**: Get this from Clerk Dashboard → Webhooks → Your webhook → Signing Secret

### 4. App URL (Production)
```
NEXT_PUBLIC_APP_URL=https://your-app.vercel.app
```

### 5. Email Service (Resend) - Optional
```
RESEND_API_KEY=your_resend_api_key_here
RESEND_DOMAIN=yourdomain.com
```
**Note**: 
- Get `RESEND_API_KEY` from Resend Dashboard → API Keys
- `RESEND_DOMAIN` is optional - if set, emails will be sent from `notifications@yourdomain.com`
- If not set, emails will default to Resend's domain (`onboarding@resend.dev`)

### 6. Cron Secret (for scheduled emails) - Optional
```
CRON_SECRET=your-secure-random-string-here
```

## Setup Steps

### 1. Add Environment Variables in Vercel

1. Go to your Vercel project dashboard
2. Navigate to **Settings → Environment Variables**
3. Add each variable above for:
   - **Production**
   - **Preview** (optional, can use same values)
   - **Development** (optional)

### 2. Configure Clerk Webhook

1. In Clerk Dashboard → **Webhooks**
2. Create/Update webhook endpoint:
   - **URL**: `https://your-app.vercel.app/api/webhooks/clerk`
3. Subscribe to these events:
   - `organization.created`
   - `organizationMembership.created`
   - `organizationMembership.updated`
   - `organizationMembership.deleted`
4. Copy the **Signing Secret** and add it as `CLERK_WEBHOOK_SECRET` in Vercel

### 3. Configure Vercel Cron Jobs (Optional - for email digests)

If you're using scheduled email digests:

1. Go to **Vercel Dashboard → Settings → Cron Jobs**
2. Add a new cron job:
   - **Path**: `/api/cron/digest`
   - **Schedule**: `0 9 * * *` (9 AM daily) or `0 9 * * 1` (9 AM every Monday for weekly)
   - **Authorization**: Use your `CRON_SECRET` value

Or add to `vercel.json`:
```json
{
  "crons": [
    {
      "path": "/api/cron/digest",
      "schedule": "0 9 * * *"
    }
  ]
}
```

### 4. Build Settings

Your `package.json` already has the correct build command:
```json
"build": "prisma generate && next build"
```

Vercel will automatically:
- Run `prisma generate` during build
- Generate Prisma Client
- Build your Next.js app

### 5. Database Connection

**Important**: Ensure your MongoDB Atlas cluster:
- Allows connections from anywhere (0.0.0.0/0) or add Vercel IPs
- Has proper authentication enabled
- Uses a connection string with `retryWrites=true&w=majority`

### 6. Deploy

1. Push your code to GitHub/GitLab/Bitbucket
2. Connect your repository to Vercel
3. Vercel will automatically:
   - Detect Next.js
   - Install dependencies
   - Run the build command
   - Deploy

## Post-Deployment Checklist

- [ ] Verify all environment variables are set
- [ ] Test authentication flow (sign up/sign in)
- [ ] Test organization creation
- [ ] Verify Clerk webhook is receiving events
- [ ] Test API routes (`/api/organizations`, etc.)
- [ ] Check Vercel function logs for any errors
- [ ] Test email notifications (if enabled)

## Troubleshooting

### Build Fails with Prisma Error
- Ensure `DATABASE_URL` is set correctly
- Check that MongoDB connection string is valid
- Verify Prisma schema is correct

### 405 Method Not Allowed Errors
- Restart deployment after adding environment variables
- Clear Vercel build cache
- Ensure route handlers are exported correctly

### Webhook Not Working
- Verify `CLERK_WEBHOOK_SECRET` matches Clerk dashboard
- Check webhook URL is correct (use production URL)
- Review Vercel function logs for webhook errors

### Database Connection Issues
- Check MongoDB Atlas network access settings
- Verify connection string format
- Ensure database user has proper permissions

## Performance Optimization

The `vercel.json` file includes:
- Extended function timeouts for webhooks (30s)
- Extended timeout for cron jobs (60s)
- Optimized region (iad1 - US East)

You can adjust these based on your needs.

## Additional Notes

- Vercel automatically handles Next.js App Router
- API routes are serverless functions
- Static assets are automatically optimized
- Edge functions can be configured for better performance

