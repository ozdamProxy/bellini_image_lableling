# Username Display Update

## Issue
The admin dashboard was showing user IDs (like `user_mja0k3wd_m4sz0v4`) instead of actual names (like "Cenk").

## Solution
Added a `labelers` table to store the mapping between user IDs and user names.

## Setup Steps

### 1. Run the SQL Migration

Go to your Supabase SQL Editor and run the script in `supabase-add-username.sql`:

```sql
-- This creates the labelers table and function to track user names
```

### 2. How It Works

- When a user enters their name for the first time, it's saved in the `labelers` table
- Every time they claim images, their name is updated in the database
- The admin dashboard now fetches and displays user names instead of IDs

### 3. What Changed

**Files Updated:**
- `src/app/api/claim/route.ts` - Now sends userName to database
- `src/components/LabelingTab.tsx` - Includes userName when claiming
- `src/app/api/admin/labelers/route.ts` - Fetches and maps user names
- `src/components/AdminTab.tsx` - Displays userName instead of userId

### 4. Testing

1. Run the SQL migration in Supabase
2. Refresh your app
3. Claim some images (your name "Cenk" will be saved)
4. Go to the Admin tab
5. You should now see "Cenk" as the name instead of "user_mja0k3wd_m4sz0v4"

### 5. For Existing Users

If you already have active claims before running this migration:
- The first time you claim new images, your name will be saved
- The admin dashboard will start showing your name for all future claims

## Database Schema

The new `labelers` table:
```sql
CREATE TABLE labelers (
  user_id TEXT PRIMARY KEY,
  user_name TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_seen_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

This table automatically updates whenever a user claims images, keeping the name mapping fresh.
