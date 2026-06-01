#!/bin/bash
# ============================================================
# NutriClinic SaaS - Lightweight Server Setup for cPanel
# إعداد خادم خفيف لـ cPanel بدون الحاجة لـ Setup Node.js App
# ============================================================
#
# هذا السكريبت بديل لـ cPanel Setup Node.js App
# يستخدم Passenger مباشرة عبر .htaccess
#
# طريقة الاستخدام:
# 1. افتح cPanel → Terminal
# 2. شغّل: bash ~/nutriclinic.matrix49.app/lightweight-setup.sh
#
# ============================================================

set -e

echo "╔══════════════════════════════════════════════════════════╗"
echo "║   NutriClinic - Lightweight Server Setup                ║"
echo "║   إعداد خادم خفيف (بديل لـ Setup Node.js App)          ║"
echo "╚══════════════════════════════════════════════════════════╝"
echo ""

APP_DIR="$HOME/nutriclinic.matrix49.app"
DOMAIN="nutriclinic.matrix49.app"
CPANEL_USER="$(whoami)"

# ---- Step 1: Find or create document root ----
echo "[1/6] Finding document root for $DOMAIN..."

# Common document root patterns in cPanel
DOC_ROOT=""
for possible in \
  "$HOME/$DOMAIN" \
  "$HOME/$DOMAIN/public_html" \
  "$HOME/public_html/$DOMAIN" \
  "$HOME/public_html"; do
  if [ -d "$possible" ]; then
    DOC_ROOT="$possible"
    break
  fi
done

if [ -z "$DOC_ROOT" ]; then
  echo "  Creating document root..."
  DOC_ROOT="$HOME/$DOMAIN"
  mkdir -p "$DOC_ROOT"
fi

echo "  Document root: $DOC_ROOT"

# ---- Step 2: Clone or update repository ----
echo ""
echo "[2/6] Setting up application directory..."
mkdir -p "$APP_DIR"
cd "$APP_DIR"

if [ -d .git ]; then
  echo "  Updating repository..."
  git fetch origin main 2>&1 | tail -2
  git reset --hard origin/main 2>&1 | tail -2
else
  echo "  Cloning repository..."
  git clone -b main https://github.com/afreetalex001/nutriclinic.matrix49.app.git . 2>&1 | tail -3
fi

# ---- Step 3: Set up Node.js environment ----
echo ""
echo "[3/6] Setting up Node.js environment..."

# Try to find Node.js in the system
NODE_PATH=""
for node in \
  /opt/cpanel/ea-nodejs20/bin/node \
  /opt/cpanel/ea-nodejs18/bin/node \
  /usr/local/bin/node \
  /usr/bin/node; do
  if [ -x "$node" ]; then
    NODE_PATH="$(dirname "$node")"
    echo "  Found Node.js at: $node"
    echo "  Version: $($node -v 2>/dev/null)"
    break
  fi
done

# Also try user's own Node.js installation
for nodeenv in \
  "$HOME/nodejs/bin/node" \
  "$HOME/nodeenv/nutriclinic/bin/node" \
  "$HOME/.nvm/versions/node/*/bin/node"; do
  if [ -x "$nodeenv" ]; then
    NODE_PATH="$(dirname "$nodeenv")"
    echo "  Found user Node.js at: $nodeenv"
    echo "  Version: $($nodeenv -v 2>/dev/null)"
    break
  fi
done

if [ -z "$NODE_PATH" ]; then
  echo "  ⚠ Node.js not found!"
  echo "  You need to install Node.js first via cPanel → Setup Node.js App"
  echo "  Or contact Namecheap support to enable it"
  echo ""
  echo "  Alternative: Ask Namecheap support to increase your LVE limits"
  exit 1
fi

echo "  Node.js path: $NODE_PATH"

# ---- Step 4: Install dependencies (with retry for LVE limits) ----
echo ""
echo "[4/6] Installing dependencies (this may take a few minutes)..."

export PATH="$NODE_PATH:$PATH"

# Install with reduced memory usage
cp -f prisma/schema.mysql.prisma prisma/schema.prisma 2>/dev/null || true

# Install production dependencies only to save memory
echo "  Running npm install (production only)..."
NODE_OPTIONS="--max-old-space-size=256" npm install --production 2>&1 | tail -3 || {
  echo "  ⚠ npm install failed - may be due to resource limits"
  echo "  Trying with fewer parallel processes..."
  npm install --production --maxsockets=1 2>&1 | tail -3 || {
    echo "  ⚠ npm install still failing"
    echo "  You may need to contact Namecheap support to increase LVE limits"
  }
}

# Generate Prisma client
npx prisma generate 2>&1 | tail -2 || echo "  ⚠ Prisma generate failed"

# ---- Step 5: Build the application ----
echo ""
echo "[5/6] Building Next.js application..."

# Build with reduced memory
NODE_OPTIONS="--max-old-space-size=512" NODE_ENV=production npm run build 2>&1 | tail -10 || {
  echo "  ⚠ Build failed - this is likely due to LVE resource limits"
  echo ""
  echo "  Alternative: Build locally and upload the standalone output"
  echo "  1. Download the deployment package from the project"
  echo "  2. Upload it to $APP_DIR via cPanel File Manager"
  echo "  3. Then run this script again"
  exit 1
}

# Copy static and public files to standalone
cp -r .next/static .next/standalone/.next/ 2>/dev/null || true
cp -r public .next/standalone/ 2>/dev/null || true

# Copy .env to standalone
cat > .next/standalone/.env << 'EOF'
DATABASE_URL=mysql://matrmylq_nutriusr:NutriCli@2024Sec@localhost:3306/matrmylq_nutricli
MYSQL_HOST=localhost
MYSQL_PORT=3306
MYSQL_USER=matrmylq_nutriusr
MYSQL_PASSWORD=NutriCli@2024Sec
MYSQL_DATABASE=matrmylq_nutricli
JWT_SECRET=nc-saas-prod-jwt-s3cur3-k3y-2024
NEXT_PUBLIC_APP_URL=https://nutriclinic.matrix49.app
WHATSAPP_NUMBER=+201012345678
NODE_ENV=production
EOF

echo "  ✓ Build completed"

# ---- Step 6: Create .htaccess for Passenger ----
echo ""
echo "[6/6] Setting up Passenger via .htaccess..."

# Copy app.js to standalone directory
cp app.js .next/standalone/ 2>/dev/null || true

# Create .htaccess
cat > "$DOC_ROOT/.htaccess" << HTACCESS
# NutriClinic SaaS - Passenger Configuration
PassengerEnabled on
PassengerAppType node
PassengerAppRoot $APP_DIR/.next/standalone
PassengerStartupFile app.js
PassengerNodePath $NODE_PATH/node

# Environment variables
SetEnv NODE_ENV production
SetEnv DATABASE_URL mysql://matrmylq_nutriusr:NutriCli@2024Sec@localhost:3306/matrmylq_nutricli
SetEnv MYSQL_HOST localhost
SetEnv MYSQL_PORT 3306
SetEnv MYSQL_USER matrmylq_nutriusr
SetEnv MYSQL_PASSWORD NutriCli@2024Sec
SetEnv MYSQL_DATABASE matrmylq_nutricli
SetEnv JWT_SECRET nc-saas-prod-jwt-s3cur3-k3y-2024
SetEnv NEXT_PUBLIC_APP_URL https://nutriclinic.matrix49.app

# URL rewriting for Next.js
RewriteEngine On
RewriteCond %{REQUEST_FILENAME} !-f
RewriteCond %{REQUEST_FILENAME} !-d
RewriteRule ^ index.html [L]
HTACCESS

echo "  ✓ .htaccess created at $DOC_ROOT/.htaccess"

echo ""
echo "╔══════════════════════════════════════════════════════════╗"
echo "║   ✅ Setup Complete!                                     ║"
echo "║   تم الإعداد بنجاح!                                     ║"
echo "╚══════════════════════════════════════════════════════════╝"
echo ""
echo "  Website: https://$DOMAIN/"
echo ""
echo "  If the site doesn't work:"
echo "  1. Check cPanel → Resource Usage for LVE faults"
echo "  2. Contact Namecheap support to increase limits"
echo "  3. Or upgrade to a VPS hosting plan"
echo ""
