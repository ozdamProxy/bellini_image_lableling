# Vercel Deployment Guide - Image Loading Issues

## 🔍 Diagnostic Steps

### 1. Check Environment Variables on Vercel

Go to your Vercel project dashboard:
1. Settings → Environment Variables
2. Ensure these are set for **Production** (not just Preview):
   ```
   AWS_REGION=eu-central-1
   AWS_ACCESS_KEY_ID=AKIAUL5ZG2NM2C3TRIVB
   AWS_SECRET_ACCESS_KEY=your_secret_key
   AWS_S3_BUCKET=cfbwine
   NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_key
   ```

### 2. Test S3 Connection

After redeploying, visit:
```
https://your-app.vercel.app/api/debug/s3-test
```

This will show:
- ✅ Environment variables status
- ✅ S3 connection test
- ✅ Sample presigned URL

### 3. Common Issues & Solutions

---

## 🎯 **Solution 1: Use Public S3 URLs (Recommended for Images)**

**Best for:** Images that don't require strict access control

**Pros:**
- ✅ No expiration
- ✅ Faster (no signing overhead)
- ✅ Works everywhere
- ✅ CDN-friendly

**Steps:**

### A. Make your S3 bucket public (or use CloudFront)

1. Go to AWS S3 Console → Bucket `cfbwine`
2. Permissions → Bucket Policy
3. Add this policy:

```json
{
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
}
```

4. Also enable:
   - Block Public Access → Off (for bucket)
   - CORS Configuration (see below)

### B. Configure CORS

Go to Permissions → CORS Configuration:

```json
[
  {
    "AllowedHeaders": ["*"],
    "AllowedMethods": ["GET", "HEAD"],
    "AllowedOrigins": ["*"],
    "ExposeHeaders": ["ETag"]
  }
]
```

### C. Update the code to use public URLs

Create `src/lib/s3-public.ts`:

```typescript
export function getPublicS3Url(bucket: string, key: string): string {
  const region = process.env.AWS_REGION || 'eu-central-1';
  return `https://${bucket}.s3.${region}.amazonaws.com/${key}`;
}
```

Then update image display to use public URLs instead of presigned URLs.

---

## 🎯 **Solution 2: Fix Presigned URLs (Current Approach)**

**Best for:** Private images that need access control

**Issues to fix:**

### A. S3 Bucket CORS Configuration

Go to AWS S3 Console → Bucket `cfbwine` → Permissions → CORS:

```json
[
  {
    "AllowedHeaders": [
      "*"
    ],
    "AllowedMethods": [
      "GET",
      "HEAD"
    ],
    "AllowedOrigins": [
      "*"
    ],
    "ExposeHeaders": [
      "ETag",
      "x-amz-request-id"
    ]
  }
]
```

### B. Increase Presigned URL Expiration

In `src/lib/s3.ts`, change line 87:

```typescript
// OLD: 1 hour
const url = await getSignedUrl(client, command, { expiresIn: 3600 });

// NEW: 24 hours
const url = await getSignedUrl(client, command, { expiresIn: 86400 });
```

### C. Check S3 Bucket Block Public Access

Go to Permissions → Block Public Access:
- **Block all public access** → **Off** (if using presigned URLs)

---

## 🎯 **Solution 3: Use CloudFront CDN (Best Performance)**

**Best for:** High-traffic apps, global distribution

**Setup:**

1. Create CloudFront Distribution
2. Origin: S3 bucket `cfbwine`
3. Origin Access Control: Yes
4. Cache behavior: Cache all GET requests
5. Update code to use CloudFront URL

---

## 🧪 Testing Checklist

After making changes:

- [ ] Environment variables set in Vercel
- [ ] Redeployed to Vercel
- [ ] Test `/api/debug/s3-test` endpoint
- [ ] Check browser console for CORS errors
- [ ] Check Network tab for failed image loads
- [ ] Verify presigned URLs are being generated
- [ ] Try accessing presigned URL directly in browser

---

## 🚨 Quick Fix for Right Now

**If you need images working immediately:**

1. Make S3 bucket public (Solution 1A)
2. Add public URL function
3. Use this helper in components:

```typescript
// Add to components that need images
const getImageUrl = (s3Key: string) => {
  // Use presigned URLs for now, but have public fallback
  if (process.env.NODE_ENV === 'production') {
    // Use direct S3 URL in production
    const bucket = process.env.AWS_S3_BUCKET!;
    const region = process.env.AWS_REGION!;
    return `https://${bucket}.s3.${region}.amazonaws.com/${s3Key}`;
  }
  // Use presigned URLs in development
  return presignedUrl;
};
```

---

## 📝 Environment Variables Template

Copy these to Vercel:

```
AWS_REGION=eu-central-1
AWS_ACCESS_KEY_ID=AKIAUL5ZG2NM2C3TRIVB
AWS_SECRET_ACCESS_KEY=your_actual_secret
AWS_S3_BUCKET=cfbwine
AWS_S3_PREFIX=

NEXT_PUBLIC_SUPABASE_URL=https://yflddcltgblxgicudjii.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_actual_supabase_key
```

---

## 🔧 Debug Commands

```bash
# Test locally
curl http://localhost:3000/api/debug/s3-test

# Test production
curl https://your-app.vercel.app/api/debug/s3-test
```
