#!/bin/bash

# Script to add environment variables to Vercel
# If .env.local exists, it will read values from there
# Otherwise, it will prompt for each value

ENV_FILE=".env.local"

if [ -f "$ENV_FILE" ]; then
    echo "Reading environment variables from $ENV_FILE..."
    source "$ENV_FILE"
    
    # Add AWS variables
    echo "Adding AWS_REGION..."
    echo "$AWS_REGION" | vercel env add AWS_REGION production
    echo "$AWS_REGION" | vercel env add AWS_REGION preview
    echo "$AWS_REGION" | vercel env add AWS_REGION development
    
    echo "Adding AWS_ACCESS_KEY_ID..."
    echo "$AWS_ACCESS_KEY_ID" | vercel env add AWS_ACCESS_KEY_ID production
    echo "$AWS_ACCESS_KEY_ID" | vercel env add AWS_ACCESS_KEY_ID preview
    echo "$AWS_ACCESS_KEY_ID" | vercel env add AWS_ACCESS_KEY_ID development
    
    echo "Adding AWS_SECRET_ACCESS_KEY..."
    echo "$AWS_SECRET_ACCESS_KEY" | vercel env add AWS_SECRET_ACCESS_KEY production
    echo "$AWS_SECRET_ACCESS_KEY" | vercel env add AWS_SECRET_ACCESS_KEY preview
    echo "$AWS_SECRET_ACCESS_KEY" | vercel env add AWS_SECRET_ACCESS_KEY development
    
    echo "Adding AWS_S3_BUCKET..."
    echo "$AWS_S3_BUCKET" | vercel env add AWS_S3_BUCKET production
    echo "$AWS_S3_BUCKET" | vercel env add AWS_S3_BUCKET preview
    echo "$AWS_S3_BUCKET" | vercel env add AWS_S3_BUCKET development
    
    echo "Adding AWS_S3_PREFIX..."
    echo "${AWS_S3_PREFIX:-}" | vercel env add AWS_S3_PREFIX production
    echo "${AWS_S3_PREFIX:-}" | vercel env add AWS_S3_PREFIX preview
    echo "${AWS_S3_PREFIX:-}" | vercel env add AWS_S3_PREFIX development
    
    echo "Adding NEXT_PUBLIC_SUPABASE_URL..."
    echo "$NEXT_PUBLIC_SUPABASE_URL" | vercel env add NEXT_PUBLIC_SUPABASE_URL production
    echo "$NEXT_PUBLIC_SUPABASE_URL" | vercel env add NEXT_PUBLIC_SUPABASE_URL preview
    echo "$NEXT_PUBLIC_SUPABASE_URL" | vercel env add NEXT_PUBLIC_SUPABASE_URL development
    
    echo "Adding NEXT_PUBLIC_SUPABASE_ANON_KEY..."
    echo "$NEXT_PUBLIC_SUPABASE_ANON_KEY" | vercel env add NEXT_PUBLIC_SUPABASE_ANON_KEY production
    echo "$NEXT_PUBLIC_SUPABASE_ANON_KEY" | vercel env add NEXT_PUBLIC_SUPABASE_ANON_KEY preview
    echo "$NEXT_PUBLIC_SUPABASE_ANON_KEY" | vercel env add NEXT_PUBLIC_SUPABASE_ANON_KEY development
    
    echo ""
    echo "✅ All environment variables added successfully!"
else
    echo "No .env.local file found."
    echo "Please create .env.local with your credentials, or run the commands manually:"
    echo ""
    echo "vercel env add AWS_REGION production"
    echo "vercel env add AWS_ACCESS_KEY_ID production"
    echo "vercel env add AWS_SECRET_ACCESS_KEY production"
    echo "vercel env add AWS_S3_BUCKET production"
    echo "vercel env add AWS_S3_PREFIX production"
    echo "vercel env add NEXT_PUBLIC_SUPABASE_URL production"
    echo "vercel env add NEXT_PUBLIC_SUPABASE_ANON_KEY production"
    echo ""
    echo "Then repeat for 'preview' and 'development' environments."
fi

echo ""
echo "Verify with: vercel env ls"
