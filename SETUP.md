# Setup Guide: Image Labeling App with S3 and Supabase

This guide will help you set up the image labeling application with AWS S3 for image storage and Supabase for metadata tracking.

## Prerequisites

- Node.js 18 or higher
- AWS Account with S3 access
- Supabase Account (free tier works)
- Images uploaded to S3

## Step 1: Set Up AWS S3

### 1.1 Upload Your Images to S3

1. Go to [AWS S3 Console](https://s3.console.aws.amazon.com/)
2. Create a bucket or use an existing one
3. Upload your images to a folder (e.g., `images/unlabeled/`)

### 1.2 Create IAM User for API Access

1. Go to [IAM Console](https://console.aws.amazon.com/iam/)
2. Click "Users" → "Add users"
3. User name: `image-labeling-app`
4. Select "Access key - Programmatic access"
5. Attach policy: `AmazonS3ReadOnlyAccess` (or create custom policy)
6. Save the **Access Key ID** and **Secret Access Key**

### 1.3 Configure S3 Bucket CORS (if accessing from browser)

Add this CORS configuration to your S3 bucket:

```json
[
  {
    "AllowedHeaders": ["*"],
    "AllowedMethods": ["GET", "HEAD"],
    "AllowedOrigins": ["*"],
    "ExposeHeaders": []
  }
]
```

## Step 2: Set Up Supabase

### 2.1 Create a Supabase Project

1. Go to [Supabase Dashboard](https://app.supabase.com/)
2. Click "New Project"
3. Enter project details and create

### 2.2 Run the Database Schema

1. In your Supabase project, go to **SQL Editor**
2. Copy the contents of `supabase-schema.sql` from this project
3. Paste and click "Run"

This will create:
- `images` table for storing metadata
- Indexes for performance
- `image_stats` view for statistics
- Row Level Security policies

### 2.3 Get Your Supabase Credentials

1. Go to **Project Settings** → **API**
2. Copy:
   - **Project URL** (e.g., `https://xxxxx.supabase.co`)
   - **anon public** key

## Step 3: Configure the Application

### 3.1 Install Dependencies

```bash
cd image-labeling-app
npm install
```

### 3.2 Create Environment Variables

Copy the example file:

```bash
cp .env.local.example .env.local
```

Edit `.env.local` with your credentials:

```env
# AWS S3 Configuration
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=AKIAIOSFODNN7EXAMPLE
AWS_SECRET_ACCESS_KEY=wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY
AWS_S3_BUCKET=my-image-bucket
AWS_S3_PREFIX=images/

# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**Notes:**
- `AWS_S3_PREFIX`: The folder path in your S3 bucket (optional, can be empty)
- Make sure `.env.local` is in `.gitignore` (it already is)

## Step 4: Test Locally

### 4.1 Start the Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

### 4.2 Sync Images from S3

1. Click the **"Sync S3"** button in the header
2. This will scan your S3 bucket and add new images to the database
3. All images will be marked as "unlabeled" initially

### 4.3 Test the Features

1. **Gallery Tab**: View all images with statistics
2. **Label Images Tab**: Start labeling images
3. **Review Tab**: See labeled vs unlabeled images
4. **Training Data Tab**: Download labeled images and mark as trained

## Step 5: Deploy to Vercel

### 5.1 Push to GitHub

```bash
git init
git add .
git commit -m "Initial commit"
git remote add origin https://github.com/yourusername/image-labeling-app.git
git push -u origin main
```

### 5.2 Deploy on Vercel

1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Click "New Project"
3. Import your GitHub repository
4. Add Environment Variables:
   - Add all variables from your `.env.local` file
   - Go to **Settings** → **Environment Variables**
5. Click "Deploy"

### 5.3 Verify Deployment

Once deployed, test all features:
- Sync images from S3
- Label some images
- Download labeled images
- Mark images as trained

## Features Overview

### 1. Gallery Tab
- View all images from S3
- Filter by label (Pass, Faulty, Maybe, Unlabeled)
- See real-time statistics
- Automatically syncs with database

### 2. Label Images Tab
- View unlabeled images one at a time
- Use keyboard shortcuts:
  - `1` = Pass
  - `2` = Maybe
  - `3` = Faulty
  - Arrow keys = Navigate
- Progress tracking

### 3. Review Tab
- View labeled vs unlabeled images
- Statistics dashboard
- Quick overview of your work

### 4. Training Data Tab
- Download labeled images for training
- Filter downloads by label
- Download only untrained images
- Mark images as "trained" to avoid duplicates
- Bulk selection and marking

## Usage Workflow

### For Image Labeling:
1. Upload images to S3
2. Click "Sync S3" in the app
3. Go to "Label Images" tab
4. Label images using buttons or keyboard shortcuts
5. Review your work in "Review" tab

### For Model Training:
1. Go to "Training Data" tab
2. Download labeled, untrained images:
   - Download all untrained images, OR
   - Download specific labels only (Pass/Faulty/Maybe)
3. Train your model with the downloaded images
4. After training, select the trained images
5. Click "Mark as Trained" to prevent duplicate training

## Troubleshooting

### Images Not Showing

1. Check AWS credentials in `.env.local`
2. Verify S3 bucket permissions
3. Check browser console for errors
4. Try clicking "Sync S3" again

### Supabase Errors

1. Verify Supabase URL and anon key
2. Check if schema was run correctly
3. View Supabase logs in dashboard
4. Ensure RLS policies are active

### CORS Errors

Add CORS configuration to your S3 bucket (see Step 1.3)

### Deployment Issues

1. Verify all environment variables are set in Vercel
2. Check Vercel deployment logs
3. Ensure Supabase allows connections from Vercel

## Security Notes

- Never commit `.env.local` to git
- Use IAM roles with minimal permissions
- Supabase RLS policies are enabled by default
- Consider adding authentication for production use
- Rotate AWS credentials regularly

## Advanced Configuration

### Custom S3 Endpoint (for S3-compatible services)

Add to `.env.local`:
```env
AWS_ENDPOINT=https://your-s3-compatible-endpoint.com
```

### Limit Image Types

Edit `src/lib/s3.ts` and modify the `imageExtensions` array.

### Change Label Categories

Edit `src/types/image.ts` and update the `Label` type and database schema.

## Support

For issues or questions:
1. Check the logs in browser console
2. Check Vercel deployment logs
3. Check Supabase logs
4. Review this setup guide

## Next Steps

Consider adding:
- User authentication (Supabase Auth)
- Multiple users/teams
- Image annotations (bounding boxes)
- Export to specific ML formats
- Automated quality checks
- Batch operations
