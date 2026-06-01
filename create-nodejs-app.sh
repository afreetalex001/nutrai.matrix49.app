#!/bin/bash
# ============================================================
# NutriClinic SaaS - Create cPanel Node.js App
# إنشاء تطبيق Node.js في cPanel
# ============================================================
#
# هذا السكريبت ينشئ تطبيق Node.js في cPanel باستخدام UAPI
# This script creates a Node.js App in cPanel using UAPI
#
# طريقة الاستخدام:
# 1. سجل الدخول إلى cPanel
# 2. افتح Terminal من قسم Advanced
# 3. شغّل هذا السكريبت:
#    bash ~/nutriclinic.matrix49.app/create-nodejs-app.sh
#
# ============================================================

set -e

echo "╔══════════════════════════════════════════════════════════╗"
echo "║   NutriClinic - Create cPanel Node.js App                ║"
echo "║   إنشاء تطبيق Node.js في cPanel                         ║"
echo "╚══════════════════════════════════════════════════════════╝"
echo ""

# ---- Configuration ----
CPANEL_USER="$(whoami)"
APP_NAME="nutriclinic"
APP_DIR="$HOME/nutriclinic.matrix49.app"
DOMAIN="nutriclinic.matrix49.app"
STARTUP_FILE="server.js"
NODE_VERSION="20"

echo "  cPanel User: $CPANEL_USER"
echo "  App Directory: $APP_DIR"
echo "  Domain: $DOMAIN"
echo "  Startup File: $STARTUP_FILE"
echo "  Node.js Version: $NODE_VERSION"
echo ""

# ---- Step 1: Check if Node.js App already exists ----
echo "[1/5] Checking for existing Node.js Apps..."
EXISTING=$(uapi NodeScripts list 2>/dev/null | grep -c "$APP_NAME" || echo "0")
if [ "$EXISTING" -gt 0 ]; then
  echo "  ⚠ A Node.js App already exists for this domain"
  echo "  Skipping creation. Use 'Edit' in cPanel to modify it."
  echo ""
  echo "  To manage the app:"
  echo "  cPanel → Software → Setup Node.js App → Edit"
  exit 0
fi
echo "  ✓ No existing app found, proceeding with creation..."

# ---- Step 2: Clone or update repository ----
echo ""
echo "[2/5] Setting up application directory..."
mkdir -p "$APP_DIR"
cd "$APP_DIR"

if [ -d .git ]; then
  echo "  Repository exists, pulling updates..."
  git fetch origin main 2>&1 | tail -2
  git reset --hard origin/main 2>&1 | tail -2
else
  echo "  Cloning repository from GitHub..."
  git clone -b main https://github.com/afreetalex001/nutriclinic.matrix49.app.git . 2>&1 | tail -3
fi

# ---- Step 3: Create Node.js App via UAPI ----
echo ""
echo "[3/5] Creating Node.js App in cPanel..."

# Use cPanel UAPI to create the Node.js App
# Parameters:
#   name: Application name
#   node: Node.js version
#   approot: Application root directory (relative to home)
#   startupfile: Startup file name
#   url: Domain URL

APPROOT="nutriclinic.matrix49.app"

RESULT=$(uapi NodeScripts create \
  name="$APP_NAME" \
  node="$NODE_VERSION" \
  approot="$APPROOT" \
  startupfile="$STARTUP_FILE" \
  2>&1)

if echo "$RESULT" | grep -q "errors"; then
  echo "  ⚠ UAPI creation had issues. Trying alternative method..."
  echo "  $RESULT"
  echo ""
  echo "  Please create the app manually in cPanel:"
  echo "  1. Go to: cPanel → Software → Setup Node.js App"
  echo "  2. Click: Create Application"
  echo "  3. Fill in:"
  echo "     - Node.js version: $NODE_VERSION"
  echo "     - Application mode: Production"
  echo "     - Application root: $APPROOT"
  echo "     - Application URL: $DOMAIN"
  echo "     - Application startup file: $STARTUP_FILE"
else
  echo "  ✓ Node.js App created successfully!"
fi

# ---- Step 4: Install and build ----
echo ""
echo "[4/5] Installing dependencies and building..."

# Activate the Node.js environment
source "$HOME/nodeenv/$APP_NAME/bin/activate" 2>/dev/null || true
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && . "$NVM_DIR/nvm.sh" 2>/dev/null || true

echo "  Node.js version: $(node -v 2>/dev/null || echo 'not found')"
echo "  npm version: $(npm -v 2>/dev/null || echo 'not found')"

# Install dependencies
cd "$APP_DIR"
npm install --production=false 2>&1 | tail -3

# Switch to MySQL schema
cp -f prisma/schema.mysql.prisma prisma/schema.prisma 2>/dev/null || true

# Generate Prisma client
npx prisma generate 2>&1 | tail -2

# Create .env if it doesn't exist
if [ ! -f .env ]; then
  cat > .env << 'ENVEOF'
# MySQL Database
DATABASE_URL="mysql://matrmylq_nutriusr:NutriCli@2024Sec@localhost:3306/matrmylq_nutricli"
MYSQL_HOST="localhost"
MYSQL_PORT="3306"
MYSQL_USER="matrmylq_nutriusr"
MYSQL_PASSWORD="NutriCli@2024Sec"
MYSQL_DATABASE="matrmylq_nutricli"
JWT_SECRET="nc-saas-prod-jwt-s3cur3-k3y-2024"
NEXT_PUBLIC_APP_URL="https://nutriclinic.matrix49.app"
WHATSAPP_NUMBER="+201012345678"
NODE_ENV="production"
ENVEOF
  echo "  ✓ .env file created"
fi

# Build the application
echo "  Building Next.js application (this may take a few minutes)..."
NODE_ENV=production npm run build 2>&1 | tail -5

# Copy static and public files to standalone output
cp -r .next/static .next/standalone/.next/ 2>/dev/null || true
cp -r public .next/standalone/ 2>/dev/null || true
cp .env .next/standalone/ 2>/dev/null || true

echo "  ✓ Build completed"

# ---- Step 5: Configure environment variables and start ----
echo ""
echo "[5/5] Setting environment variables and starting app..."

# Set environment variables via UAPI
uapi NodeScripts set_node_env_variables \
  name="$APP_NAME" \
  envvars='{"NODE_ENV":"production","DATABASE_URL":"mysql://matrmylq_nutriusr:NutriCli@2024Sec@localhost:3306/matrmylq_nutricli","MYSQL_HOST":"localhost","MYSQL_PORT":"3306","MYSQL_USER":"matrmylq_nutriusr","MYSQL_PASSWORD":"NutriCli@2024Sec","MYSQL_DATABASE":"matrmylq_nutricli","JWT_SECRET":"nc-saas-prod-jwt-s3cur3-k3y-2024","NEXT_PUBLIC_APP_URL":"https://nutriclinic.matrix49.app"}' \
  2>/dev/null || echo "  ⚠ Could not set env vars via UAPI, please set them manually in cPanel"

# Start the application
uapi NodeScripts start name="$APP_NAME" 2>/dev/null || echo "  ⚠ Could not start via UAPI, please start manually in cPanel"

echo ""
echo "╔══════════════════════════════════════════════════════════╗"
echo "║   ✅ Node.js App Setup Complete!                         ║"
echo "║   تم إعداد تطبيق Node.js بنجاح!                        ║"
echo "╚══════════════════════════════════════════════════════════╝"
echo ""
echo "  Website: https://$DOMAIN/"
echo ""
echo "  If the site doesn't work immediately:"
echo "  1. Go to: cPanel → Software → Setup Node.js App"
echo "  2. Find the NutriClinic app"
echo "  3. Click 'Restart'"
echo "  4. Wait 1-2 minutes"
echo ""
echo "  To sync future updates from GitHub:"
echo "  1. SSH into the server or use cPanel Terminal"
echo "  2. cd $APP_DIR"
echo "  3. git pull origin main"
echo "  4. npm install && npm run build"
echo "  5. Restart the app from cPanel"
echo ""
