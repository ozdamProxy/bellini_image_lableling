#!/bin/bash

echo "=== Force Redeploy to Vercel ==="
echo ""
echo "This will trigger a new deployment to clear any cache issues"
echo ""

# Commit any uncommitted changes
if [ -n "$(git status --porcelain)" ]; then
  echo "📝 Committing changes..."
  git add .
  git commit -m "Fix pagination and add debug endpoints"
fi

echo "🚀 Pushing to trigger deployment..."
git push

echo ""
echo "⏳ Deployment started..."
echo "📊 Monitor at: https://vercel.com/ozdamarcenks-projects/image-labeling-app"
echo ""
echo "After deployment completes, test:"
echo "  curl https://image-labeling-app-nine.vercel.app/api/images?limit=1"
