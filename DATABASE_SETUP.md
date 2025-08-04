# Supabase Database Setup Guide

This guide will walk you through setting up the Supabase database for the Clipper application.

## Prerequisites

1. Create a Supabase account at [https://supabase.com](https://supabase.com)
2. Create a new project in your Supabase dashboard

## Step 1: Get Your Project Credentials

1. Go to your Supabase project dashboard
2. Navigate to **Settings** → **API**
3. Copy the following values:
   - **Project URL** (e.g., `https://your-project.supabase.co`)
   - **Anon public key** (starts with `eyJ...`)

## Step 2: Update Environment Variables

1. Open your `.env.local` file
2. Replace the placeholder values with your actual Supabase credentials:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_actual_anon_key_here
```

## Step 3: Run the Database Schema

1. In your Supabase dashboard, go to **SQL Editor**
2. Copy the entire contents of `database/schema.sql`
3. Paste it into the SQL Editor
4. Click **Run** to execute the schema

This will create:
- All database tables (podcasts, episodes, clips)
- Row Level Security (RLS) policies
- Indexes for performance
- Triggers for automatic timestamps
- Sample data for testing

**Note**: The `users` table is not created as we use Supabase's built-in `auth.users` table.

## Step 4: Configure Authentication

1. Go to **Authentication** → **Settings** in your Supabase dashboard
2. Configure the following settings:

### Site URL
Set your site URL (for development, use `http://localhost:3000`)

### Redirect URLs
Add these redirect URLs:
- `http://localhost:3000/auth/callback`
- `http://localhost:3000/dashboard`

### Email Templates (Optional)
Customize the email templates for:
- Confirm signup
- Reset password
- Magic link

## Step 5: Enable Email Authentication

1. Go to **Authentication** → **Providers**
2. Ensure **Email** provider is enabled
3. Configure any additional providers if needed (Google, GitHub, etc.)

## Step 6: Test the Setup

1. Start your development server: `npm run dev`
2. Visit `http://localhost:3000`
3. Try to sign up with a new account
4. Verify that the user is created in the `auth.users` table

## Database Schema Overview

### Tables

#### `auth.users` (Built-in Supabase table)
- Managed by Supabase Auth
- Stores user authentication data
- Automatically created when user signs up

#### `podcasts`
- Stores podcast metadata
- Public read access, authenticated write access
- Includes RSS feed URL and episode count

#### `episodes`
- Individual podcast episodes
- Linked to podcasts via foreign key
- Includes audio URL and transcript

#### `clips`
- User-generated clips from episodes
- User-specific access (RLS policies)
- References `auth.users` via foreign key
- Includes timestamps and transcript

### Row Level Security (RLS)

The schema includes comprehensive RLS policies:

- **Podcasts**: Public read, authenticated write
- **Episodes**: Public read, authenticated write
- **Clips**: User-specific access only (references `auth.users`)

### Indexes

Performance indexes are created for:
- Podcast feed URLs
- Episode relationships
- Clip user relationships
- Timestamp-based queries

## Troubleshooting

### Common Issues

1. **"Missing Supabase environment variables"**
   - Check that your `.env.local` file has the correct values
   - Restart your development server

2. **"Invalid JWT" errors**
   - Verify your anon key is correct
   - Check that your project URL is correct

3. **RLS policy errors**
   - Ensure all tables have RLS enabled
   - Check that policies are correctly applied

4. **User profile not created**
   - Users are automatically created in `auth.users` when they sign up
   - No custom user table is needed

### Getting Help

- Check the [Supabase documentation](https://supabase.com/docs)
- Review the [Supabase community forum](https://github.com/supabase/supabase/discussions)
- Check the application logs for detailed error messages

## Next Steps

After setting up the database:

1. **Generate TypeScript types** from your Supabase dashboard
2. **Update the types** in `lib/supabase.ts` with the generated types
3. **Test the authentication flow** thoroughly
4. **Implement additional features** like podcast RSS parsing

## Security Notes

- Never commit your `.env.local` file to version control
- Use environment variables for all sensitive data
- Regularly rotate your API keys
- Monitor your Supabase usage and billing
- The built-in `auth.users` table is automatically secured by Supabase 