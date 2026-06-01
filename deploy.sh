#!/bin/bash
# ============================================================
# NutriClinic SaaS - Deployment Script for cPanel Terminal
# سكريبت نشر تطبيق NutriClinic على استضافة Namecheap
# ============================================================
# 
# طريقة الاستخدام:
# 1. سجل الدخول إلى cPanel
# 2. افتح Terminal من قسم Advanced
# 3. انسخ والصق هذا السكريبت أو شغله:
#    bash ~/nutriclinic.matrix49.app/deploy.sh
#
# ============================================================

set -e

echo "╔══════════════════════════════════════════════════╗"
echo "║   NutriClinic SaaS - Deployment Script          ║"
echo "║   سكريبت نشر تطبيق نيوتري كلينيك               ║"
echo "╚══════════════════════════════════════════════════╝"

# Configuration
APP_DIR="$HOME/nutriclinic"
REPO_URL="https://github.com/afreetalex001/nutriclinic.matrix49.app.git"
BRANCH="main"

echo ""
echo "[1/8] Checking Node.js environment..."
source "$HOME/nodeenv/nutriclinic/bin/activate" 2>/dev/null || true
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && . "$NVM_DIR/nvm.sh" 2>/dev/null || true

NODE_VER=$(node -v 2>/dev/null || echo "not found")
NPM_VER=$(npm -v 2>/dev/null || echo "not found")
echo "  Node.js: $NODE_VER"
echo "  npm: $NPM_VER"

if [ "$NODE_VER" = "not found" ]; then
  echo "  ⚠ Node.js not found! Please set up Node.js in cPanel first."
  echo "  Go to: cPanel → Software → Setup Node.js App"
  exit 1
fi

echo ""
echo "[2/8] Setting up application directory..."
mkdir -p "$APP_DIR"
cd "$APP_DIR"

echo ""
echo "[3/8] Pulling latest code from GitHub..."
if [ -d .git ]; then
  echo "  Repository exists, pulling updates..."
  git fetch origin "$BRANCH"
  git reset --hard "origin/$BRANCH"
else
  echo "  Cloning repository..."
  rm -rf "$APP_DIR"/*
  git clone -b "$BRANCH" "$REPO_URL" .
fi

echo ""
echo "[4/8] Switching to MySQL schema..."
cp -f prisma/schema.mysql.prisma prisma/schema.prisma 2>/dev/null || true

echo ""
echo "[5/8] Installing dependencies..."
npm install --production=false 2>&1 | tail -3

echo ""
echo "[6/8] Generating Prisma client and building application..."
npx prisma generate 2>&1 | tail -2

echo "  Building Next.js application (this may take a few minutes)..."
NODE_ENV=production npm run build 2>&1 | tail -5

echo ""
echo "[7/8] Setting up production files..."
# Copy static and public files to standalone output
cp -r .next/static .next/standalone/.next/ 2>/dev/null || true
cp -r public .next/standalone/ 2>/dev/null || true

# Create .env file (update these values if needed)
if [ -f .env.production ]; then
  cp .env.production .next/standalone/.env
  echo "  ✓ Production environment file copied"
else
  echo "  ⚠ No .env.production file found!"
fi

# Update the app directory for Passenger/cPanel
rm -rf "$APP_DIR/app" 2>/dev/null || true
cp -r .next/standalone "$APP_DIR/app" 2>/dev/null || true

echo ""
echo "[8/8] Restarting Node.js application..."
# Restart Passenger by touching restart.txt
mkdir -p "$APP_DIR/tmp"
touch "$APP_DIR/tmp/restart.txt"

# Also try cPanel Node.js app restart
if command -v ea-nodejs18 &> /dev/null; then
  ea-nodejs18 restart "$APP_DIR" 2>/dev/null || true
fi

echo ""
echo "╔══════════════════════════════════════════════════╗"
echo "║   ✅ Deployment completed successfully!          ║"
echo "║   تم النشر بنجاح!                                ║"
echo "╚══════════════════════════════════════════════════╝"
echo ""
echo "  Website: https://nutriclinic.matrix49.app/"
echo ""
echo "  If the site doesn't update immediately:"
echo "  1. Go to cPanel → Software → Setup Node.js App"
echo "  2. Find the NutriClinic app and click 'Restart'"
echo "  3. Wait 1-2 minutes for the changes to take effect"
echo ""
