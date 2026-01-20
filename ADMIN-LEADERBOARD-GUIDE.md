# Admin Dashboard & Leaderboard

## New Features Added

### 1. Password-Protected Admin Dashboard

The Admin tab is now protected by a password to ensure only authorized users can access administrative functions.

**Admin Password:** `Proksi123`

#### Features:
- View all active labelers with their statistics
- See currently claimed images for each user
- Unclaim stuck images if users are not working on them
- Monitor total labeled images per user
- View breakdown by label type (Pass, Faulty, Maybe)
- Track last activity timestamps
- Auto-refresh every 10 seconds

#### How to Access:
1. Go to the **Admin** tab (👥 icon)
2. Enter the password: `Proksi123`
3. Click "Access Admin Dashboard"
4. You'll stay logged in until you click "Logout"

### 2. Public Leaderboard

A public leaderboard showing top performers based on total images labeled.

#### Features:
- Ranked by total images labeled
- Top 3 performers highlighted with medals (🥇🥈🥉)
- Shows breakdown: Pass, Faulty, Maybe counts
- Displays last activity date
- Mobile responsive design
- Auto-refresh every 30 seconds

#### No Password Required
The leaderboard is publicly accessible to motivate and gamify the labeling process.

## Navigation

The app now has 6 tabs:
1. **Gallery** 🖼️ - Browse all images
2. **Label Images** 🏷️ - Claim and label images
3. **Review** 📊 - Review labeled vs unlabeled
4. **Training Data** 🤖 - Download and manage training data
5. **Leaderboard** 🏆 - See top performers (public)
6. **Admin** 👥 - Manage users and claims (password protected)

## Files Created/Updated

### New Files:
- `src/lib/adminAuth.ts` - Admin authentication utility
- `src/components/LeaderboardTab.tsx` - Leaderboard component
- `src/app/api/leaderboard/route.ts` - Leaderboard API endpoint

### Updated Files:
- `src/components/AdminTab.tsx` - Added password protection and logout
- `src/app/page.tsx` - Added Leaderboard tab to navigation

## Security Notes

### Admin Password Storage
The password is currently stored in the frontend code (`src/lib/adminAuth.ts`). This provides basic protection against casual users but is not cryptographically secure. For production use, consider:

1. Environment variable approach:
   ```typescript
   const ADMIN_PASSWORD = process.env.NEXT_PUBLIC_ADMIN_PASSWORD;
   ```

2. Server-side validation with sessions/JWT
3. More robust authentication system (OAuth, etc.)

### Current Implementation
- Password: `Proksi123` (stored in localStorage after first login)
- Session persists until logout
- No server-side validation (client-side only)

## Usage Tips

### For Admins:
- Monitor the Admin dashboard to see who's actively working
- Use "Unclaim All" button if someone claims images but doesn't finish them
- Check claim expiration times - expired claims are marked in red
- Use "Logout" button to clear your session

### For Labelers:
- Check the Leaderboard to see how you rank
- Compete with teammates to label more images
- Aim for the top 3 to get medal recognition
- Use "Switch User" button to log out and log back in with a different name
  - Button appears on the "Ready to label!" screen
  - Also appears in the top progress bar while labeling
  - Allows multiple people to use the same device/browser

## Future Enhancements

Potential improvements:
- Add filtering/sorting to leaderboard (by date range, label type)
- Show labeling speed (images per hour)
- Team-based leaderboards
- Weekly/monthly leaderboard resets
- Achievement badges
- Export leaderboard as CSV
