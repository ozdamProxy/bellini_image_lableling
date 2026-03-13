#!/bin/bash

# Vercel Environment Variables Setup Script
# This script outputs the exact environment variables you need to set in Vercel

echo "=========================================="
echo "  Vercel Environment Variables Setup"
echo "=========================================="
echo ""
echo "Copy these to your Vercel Project Dashboard:"
echo "  Settings → Environment Variables → Add New"
echo ""
echo "----------------------------------------"
echo "AWS Configuration"
echo "----------------------------------------"
echo "AWS_REGION=eu-central-1"
echo "AWS_ACCESS_KEY_ID=AKIAUL5ZG2NM2C3TRIVB"
echo "AWS_SECRET_ACCESS_KEY=<your-secret-key>"
echo "AWS_S3_BUCKET=cfbwine"
echo ""
echo "----------------------------------------"
echo "Supabase Configuration"
echo "----------------------------------------"
echo "NEXT_PUBLIC_SUPABASE_URL=https://yflddcltgblxgicudjii.supabase.co"
echo "NEXT_PUBLIC_SUPABASE_ANON_KEY=<your-supabase-key>"
echo ""
echo "----------------------------------------"
echo "Optional: Force Public URLs"
echo "----------------------------------------"
echo "USE_PUBLIC_S3_URLS=true"
echo ""
echo "=========================================="
echo "  Next Steps"
echo "=========================================="
echo ""
echo "1. Go to your Vercel project dashboard"
echo "2. Add all the environment variables above"
echo "3. Redeploy your application"
echo "4. Test: https://your-app.vercel.app/api/debug/s3-test"
echo ""
echo "=========================================="
echo "  AWS S3 Setup (Optional but Recommended)"
echo "=========================================="
echo ""
echo "If images still don't load, configure your S3 bucket:"
echo ""
echo "1. AWS S3 Console → Bucket: cfbwine"
echo "2. Permissions → Bucket Policy → Add:"
echo ""
echo '{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "PublicReadGetObject",
      "Effect": "Allow",
      "Principal": "*",
      "Action": "s3:GetObject",
      "Resource": "arn:aws:s3:::cfbwine/*"
    }
  ]
}'
echo ""
echo "3. Permissions → CORS Configuration → Add:"
echo ""
echo '[
  {
    "AllowedHeaders": ["*"],
    "AllowedMethods": ["GET", "HEAD"],
    "AllowedOrigins": ["*"],
    "ExposeHeaders": ["ETag"]
  }
]'
echo ""
echo "=========================================="
