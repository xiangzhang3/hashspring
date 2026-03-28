#!/bin/bash
# HashSpring Deployment Script
# Run this from the hashspring-next directory

set -e

echo "🚀 HashSpring Deployment Script"
echo "================================"

# Step 1: Install dependencies
echo ""
echo "📦 Step 1: Installing dependencies..."
npm install

# Step 2: Build the project
echo ""
echo "🔨 Step 2: Building project..."
npm run build

echo ""
echo "✅ Build successful!"

# Step 3: Initialize git repo
echo ""
echo "📂 Step 3: Setting up Git repository..."
if [ ! -d ".git" ]; then
  git init
  git branch -M main
fi

git add -A
git commit -m "Initial commit: HashSpring crypto media platform" 2>/dev/null || echo "No changes to commit"

# Step 4: Create GitHub repo and push
echo ""
echo "🐙 Step 4: Creating GitHub repository..."
echo ""
echo "If you have GitHub CLI (gh) installed, run:"
echo "  gh repo create hashspring --public --source=. --remote=origin --push"
echo ""
echo "Otherwise, create a repo at https://github.com/new named 'hashspring', then run:"
echo "  git remote add origin https://github.com/YOUR_USERNAME/hashspring.git"
echo "  git push -u origin main"

# Step 5: Deploy to Vercel
echo ""
echo "🔺 Step 5: Deploy to Vercel"
echo ""
echo "Option A - Vercel CLI:"
echo "  npx vercel --prod"
echo ""
echo "Option B - Vercel Dashboard:"
echo "  1. Go to https://vercel.com/new"
echo "  2. Import your GitHub repo 'hashspring'"
echo "  3. Framework Preset: Next.js (auto-detected)"
echo "  4. Click Deploy"
echo ""

# Step 6: Domain setup
echo "🌐 Step 6: Domain Configuration"
echo ""
echo "After deployment, add your custom domain:"
echo "  1. Vercel Dashboard → Project → Settings → Domains"
echo "  2. Add: hashspring.com"
echo "  3. Add DNS records at your domain registrar:"
echo "     A    record: @  → 76.76.21.21"
echo "     CNAME record: www → cname.vercel-dns.com"
echo ""
echo "================================"
echo "🎉 Done! Your site will be live at https://hashspring.com"
