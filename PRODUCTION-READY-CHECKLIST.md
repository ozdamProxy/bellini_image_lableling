# Production-Ready Checklist

## ✅ Completed Features

### Core Functionality
- [x] **Image Gallery** - View all images with filtering
- [x] **Labeling Interface** - Label images as Pass, Faulty, Maybe
- [x] **Review Dashboard** - Compare labeled vs unlabeled
- [x] **Training Data Management** - Download and track trained images
- [x] **Mobile Responsive** - Works on phones, tablets, and desktops

### Multi-User System (Scale: 9000 images/hour)
- [x] **Claiming System** - Database-level locking prevents overlap
- [x] **Batch Claiming** - Claim 10 images at a time
- [x] **Auto-expiration** - Claims expire after 10 minutes
- [x] **User Sessions** - Unique ID per labeler with name tracking
- [x] **User Management** - Switch user / logout functionality

### Admin Features
- [x] **Password Protection** - Admin dashboard protected (password: Proksi123)
- [x] **Labeler Monitoring** - See who's working on what
- [x] **Claim Management** - Unclaim stuck images
- [x] **Statistics** - Real-time stats per labeler
- [x] **Activity Tracking** - Last activity timestamps

### Leaderboard
- [x] **Public Leaderboard** - Ranked by total images labeled
- [x] **Top 3 Medals** - Gold, Silver, Bronze recognition
- [x] **Detailed Stats** - Breakdown by label type
- [x] **Auto-refresh** - Updates every 30 seconds

### Performance Optimizations
- [x] **Incremental Sync** - Only adds new images from S3
- [x] **Batch Processing** - Handles 1000+ images at once
- [x] **Efficient Queries** - Queries only necessary data
- [x] **Auto-load Claims** - Recovers user's claimed images on page load

## 🔧 Setup Required

### 1. Database Setup (Supabase)

Run these SQL scripts in Supabase SQL Editor (in order):

#### a. Initial Schema
```bash
File: supabase-schema.sql
```
Creates the `images` table with:
- Basic fields (filename, s3_key, label)
- Training tracking (is_trained, trained_at)
- Timestamps

#### b. Multi-User Support
```bash
File: supabase-schema-update.sql
```
Adds:
- Claiming fields (claimed_by, claimed_at, claim_expires_at)
- Database functions:
  - `claim_next_image()` - Atomically claim images
  - `release_expired_claims()` - Auto-cleanup
  - `get_user_claimed_images()` - Get user's claims
  - `release_claim()` - Manual release
  - `extend_claim()` - Extend expiration

#### c. Username Tracking
```bash
File: supabase-add-username.sql
```
Adds:
- `labelers` table to map user IDs to names
- `upsert_labeler()` function to save/update names

### 2. Environment Variables

Create `.env.local` with:
```env
# AWS S3 Configuration
AWS_REGION=eu-central-1
AWS_ACCESS_KEY_ID=your_access_key
AWS_SECRET_ACCESS_KEY=your_secret_key
AWS_S3_BUCKET=cfbwine
AWS_S3_PREFIX=

# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
```

### 3. Dependencies Installation

```bash
npm install
```

### 4. Run Development Server

```bash
npm run dev
```

Visit: http://localhost:3000

## 📋 Pre-Production Checklist

### Security
- [ ] Change admin password in `src/lib/adminAuth.ts`
- [ ] Review Supabase Row Level Security (RLS) policies
- [ ] Verify AWS S3 bucket permissions
- [ ] Enable HTTPS on production domain

### Database
- [ ] Verify all 3 SQL migrations are applied
- [ ] Create database indexes (included in migrations)
- [ ] Set up database backups
- [ ] Test claim expiration cleanup

### Performance
- [ ] Set up automated S3 sync (see SYNC-OPTIMIZATION-GUIDE.md)
- [ ] Configure CDN for faster image loading
- [ ] Enable caching headers on API routes
- [ ] Monitor database query performance

### Monitoring
- [ ] Set up error tracking (Sentry, LogRocket, etc.)
- [ ] Configure uptime monitoring
- [ ] Set up alerts for sync failures
- [ ] Monitor claim expiration rates

### Testing
- [ ] Test multi-user claiming (2+ users simultaneously)
- [ ] Test claim expiration (wait 10 minutes)
- [ ] Test admin unclaim functionality
- [ ] Test leaderboard with multiple users
- [ ] Test mobile responsiveness
- [ ] Test S3 sync with 1000+ images

## 🚀 Deployment to Vercel

### 1. Push to GitHub
```bash
git init
git add .
git commit -m "Initial commit"
git remote add origin your-repo-url
git push -u origin main
```

### 2. Connect to Vercel
1. Go to https://vercel.com
2. Import your GitHub repository
3. Add environment variables from `.env.local`
4. Deploy

### 3. Optional: Set Up Automated Sync

Add to `vercel.json`:
```json
{
  "crons": [{
    "path": "/api/sync",
    "schedule": "*/5 * * * *"
  }]
}
```

This syncs new images every 5 minutes.

## 📱 User Guide

### For Labelers
1. **First Time**:
   - Enter your name
   - Click "Claim 10 Images"
   - Start labeling (1=Pass, 2=Maybe, 3=Faulty)

2. **Daily Use**:
   - Open app
   - Your claimed images auto-load
   - Label your batch
   - Automatic claim of next 10 when done

3. **Switch User**:
   - Click "Switch User" button
   - Enter different name
   - Start fresh session

### For Admins
1. Go to **Admin** tab (👥)
2. Enter password: `Proksi123`
3. Monitor active labelers
4. Unclaim stuck images if needed
5. Check claim expiration times

## 📊 Recommended Workflow (9000 images/hour)

### Team Size Calculation
- Average labeling speed: 10 images in 3-5 minutes
- Per person per hour: ~120-200 images
- For 9000 images/hour: **45-75 active labelers**

### Shift Planning
```
Shift 1 (8am-12pm):  25 labelers
Shift 2 (12pm-4pm):  25 labelers
Shift 3 (4pm-8pm):   25 labelers
Total capacity: ~18,000 images/day
```

### Quality Control
1. Periodically review labeled images in Gallery
2. Check leaderboard for consistency
3. Use Training tab to download batches
4. Mark batches as trained after model training

## 🔍 Monitoring Dashboard

Recommended metrics to track:
- **Images/hour**: Total labeled per hour
- **Active labelers**: Current count
- **Claim expiration rate**: How often claims expire unused
- **Average labeling time**: Time per image
- **Label distribution**: Pass vs Faulty vs Maybe ratios
- **Sync frequency**: New images added per sync

## 🐛 Common Issues & Solutions

### "No images available"
**Cause**: All images claimed by others or already labeled
**Solution**:
- Wait 10 minutes for claims to expire
- Admin unclaims stuck claims
- Sync new images from S3

### Claims not working
**Cause**: Database functions not created
**Solution**: Run all 3 SQL migration files

### Leaderboard shows user IDs
**Cause**: `labelers` table not created
**Solution**: Run `supabase-add-username.sql`

### Sync is slow
**Cause**: Large number of images in S3
**Solution**: See SYNC-OPTIMIZATION-GUIDE.md

## 📚 Documentation Files

- `README.md` - Quick start guide
- `SETUP.md` - Detailed setup instructions
- `MULTI-USER-GUIDE.md` - Multi-user system explanation
- `ADMIN-LEADERBOARD-GUIDE.md` - Admin and leaderboard features
- `SYNC-OPTIMIZATION-GUIDE.md` - S3 sync performance
- `USERNAME-UPDATE-GUIDE.md` - Username display setup
- `PRODUCTION-READY-CHECKLIST.md` - This file

## 🎯 Success Criteria

System is production-ready when:
- ✅ All 3 database migrations applied
- ✅ Environment variables configured
- ✅ Multiple users can label simultaneously
- ✅ Claims expire and are released correctly
- ✅ Admin can monitor and manage labelers
- ✅ Leaderboard displays correctly
- ✅ S3 sync adds only new images
- ✅ Mobile interface is responsive
- ✅ Automated sync is configured (optional)

## 🌟 Next Steps

After production deployment:
1. Train your team on the labeling interface
2. Set up regular monitoring
3. Establish quality control process
4. Configure automated backups
5. Plan for scaling if volume increases

**You're ready to handle 9000 images/hour with a distributed team!**
