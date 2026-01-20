# Image Labeling App with S3 and Supabase

A professional web application for labeling and organizing images stored in AWS S3, with metadata tracking in Supabase. Perfect for preparing training data for machine learning models.

## Features

### Core Functionality
- **S3 Integration**: Pull images directly from AWS S3 buckets
- **Gallery View**: Browse all images with filtering options
- **Labeling Interface**: Efficiently label images with keyboard shortcuts
- **Review System**: Review labeled and unlabeled images separately
- **Training Data Management**: Download filtered images and track training status
- **Statistics Dashboard**: Real-time progress tracking and distribution
- **Duplicate Prevention**: Mark images as "trained" to avoid reusing them

### Key Benefits
- No file movement needed - images stay in S3
- Track which images have been used for training
- Download only new, untrained images
- Filter downloads by label (Pass, Faulty, Maybe)
- Production-ready for Vercel deployment
- Persistent metadata storage with Supabase

## Tech Stack

- **Frontend**: Next.js 14 (App Router), TypeScript, Tailwind CSS
- **Image Storage**: AWS S3
- **Database**: Supabase (PostgreSQL)
- **APIs**: Next.js API Routes
- **Deployment**: Vercel-ready

## Quick Start

### Prerequisites

- Node.js 18+
- AWS Account with S3 bucket containing images
- Supabase Account (free tier works)

### Installation

1. **Clone and install dependencies**:
```bash
cd image-labeling-app
npm install
```

2. **Set up Supabase**:
   - Create a project at [supabase.com](https://supabase.com)
   - Run the SQL schema from [supabase-schema.sql](supabase-schema.sql)

3. **Configure environment variables**:
```bash
cp .env.local.example .env.local
```

Edit `.env.local` with your credentials:
```env
# AWS S3
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=your_access_key
AWS_SECRET_ACCESS_KEY=your_secret_key
AWS_S3_BUCKET=your-bucket-name
AWS_S3_PREFIX=path/to/images/

# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
```

4. **Run the development server**:
```bash
npm run dev
```

5. **Sync your S3 images**:
   - Open [http://localhost:3000](http://localhost:3000)
   - Click "Sync S3" button to import images from S3

## Detailed Setup

For complete setup instructions including AWS S3 configuration, Supabase setup, and Vercel deployment, see **[SETUP.md](SETUP.md)**.

## Usage

### Tab 1: Gallery
- View all images from S3
- Filter by label (All, Pass, Faulty, Maybe, Unlabeled)
- Real-time statistics
- Click "Sync S3" to import new images

### Tab 2: Label Images
- Focus mode for labeling unlabeled images
- Keyboard shortcuts:
  - `1` = Pass
  - `2` = Maybe
  - `3` = Faulty
  - Arrow keys = Navigate
- Progress tracking with completion percentage

### Tab 3: Review
- View labeled vs unlabeled images
- Statistics dashboard
- Quick overview of labeling progress

### Tab 4: Training Data
- **Download images for training**:
  - All untrained labeled images
  - Filter by label (Pass/Faulty/Maybe only)
  - Download as ZIP file
- **Mark as trained**:
  - Select images used in training
  - Mark them to prevent duplicate training data
  - Bulk selection support

## Workflow Example

### For Initial Labeling:
1. Upload images to your S3 bucket
2. Click "Sync S3" in the app
3. Go to "Label Images" tab
4. Label images (keyboard shortcuts recommended)
5. Review your work in "Review" tab

### For Model Training:
1. Go to "Training Data" tab
2. Click "Download All Untrained" or filter by label
3. Train your model with the downloaded images
4. Return to app, select the trained images
5. Click "Mark as Trained (N)" button
6. Next time, only new labeled images will be available

### For Adding More Images:
1. Upload new images to S3
2. Click "Sync S3" button
3. New images appear as "unlabeled"
4. Continue labeling workflow

## Database Schema

The Supabase database tracks:
- Image filename and S3 location
- Label (pass/faulty/maybe/unlabeled)
- Training status (trained/untrained)
- Timestamps (created, labeled, trained)

See [supabase-schema.sql](supabase-schema.sql) for the complete schema.

## API Endpoints

- `GET /api/images` - Fetch images (with optional label filter)
- `POST /api/label` - Update image label
- `GET /api/download` - Download filtered images as ZIP
- `POST /api/mark-trained` - Mark images as trained
- `POST /api/sync` - Sync new images from S3

## Deployment

### Deploy to Vercel

1. Push your code to GitHub
2. Import project in [Vercel](https://vercel.com)
3. Add environment variables (from `.env.local`)
4. Deploy

The app is fully production-ready and will work seamlessly on Vercel with S3 and Supabase.

## Project Structure

```
image-labeling-app/
├── src/
│   ├── app/
│   │   ├── api/          # API routes
│   │   │   ├── images/   # Fetch images
│   │   │   ├── label/    # Label images
│   │   │   ├── download/ # Download ZIP
│   │   │   ├── mark-trained/ # Mark as trained
│   │   │   └── sync/     # Sync from S3
│   │   ├── page.tsx      # Main page with tabs
│   │   └── globals.css   # Global styles
│   ├── components/       # React components
│   │   ├── GalleryTab.tsx
│   │   ├── LabelingTab.tsx
│   │   ├── ReviewTab.tsx
│   │   ├── TrainingTab.tsx
│   │   ├── ImageCard.tsx
│   │   ├── LabelButton.tsx
│   │   └── DownloadButton.tsx
│   ├── lib/              # Utilities
│   │   ├── s3.ts         # S3 integration
│   │   ├── supabase.ts   # Supabase client
│   │   └── download.ts   # ZIP creation
│   └── types/
│       └── image.ts      # TypeScript types
├── supabase-schema.sql   # Database schema
├── SETUP.md             # Detailed setup guide
└── package.json
```

## Security Notes

- Never commit `.env.local` to version control
- Use IAM roles with minimal S3 permissions
- Supabase Row Level Security (RLS) is enabled
- Consider adding authentication for production
- Rotate AWS credentials regularly

## Troubleshooting

### Images not loading
- Verify AWS credentials in `.env.local`
- Check S3 bucket permissions (IAM user needs read access)
- Click "Sync S3" to ensure images are in database

### Supabase errors
- Verify URL and anon key in `.env.local`
- Check if SQL schema was run successfully
- View logs in Supabase dashboard

### Download not working
- Check browser console for errors
- Verify S3 access permissions
- Ensure images exist in database

## Advanced Features

### Adding Authentication
Consider adding Supabase Auth for multi-user support:
```typescript
import { createClient } from '@supabase/supabase-js'
// Enable auth and update RLS policies
```

### Custom Label Categories
Edit `src/types/image.ts` and update the database schema:
```typescript
export type Label = 'pass' | 'fail' | 'review' | 'unlabeled';
```

### Batch Operations
The Training Data tab supports bulk selection and operations.

## Contributing

Feel free to customize this application for your specific use case:
- Add more label categories
- Implement image annotations
- Add export to specific ML formats
- Integrate with ML pipelines

## License

MIT

---

**Need Help?** See [SETUP.md](SETUP.md) for detailed setup instructions.
