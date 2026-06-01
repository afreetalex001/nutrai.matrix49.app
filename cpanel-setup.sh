#!/bin/bash
# ============================================================
# NutriClinic SaaS - cPanel Node.js App Setup Script
# سكريبت إعداد تطبيق Node.js في cPanel
# ============================================================
#
# طريقة الاستخدام:
# 1. سجل الدخول إلى cPanel
# 2. افتح Terminal من قسم Advanced
# 3. انسخ والصق هذا السكريبت أو شغله:
#    bash ~/nutriclinic.matrix49.app/cpanel-setup.sh
#
# ============================================================

set -e

echo "╔══════════════════════════════════════════════════════════╗"
echo "║   NutriClinic SaaS - cPanel Node.js App Setup           ║"
echo "║   سكريبت إعداد تطبيق نيوتري كلينيك في cPanel           ║"
echo "╚══════════════════════════════════════════════════════════╝"
echo ""

# ---- Configuration ----
APP_NAME="nutriclinic"
APP_DIR="$HOME/nutriclinic.matrix49.app"
REPO_URL="https://github.com/afreetalex001/nutriclinic.matrix49.app.git"
BRANCH="main"
NODE_VERSION="20"

echo "[1/9] Checking environment..."
echo "  Home: $HOME"
echo "  User: $(whoami)"
echo "  OS: $(uname -s)"

# Check if Node.js is available
if command -v node &> /dev/null; then
  echo "  Node.js: $(node -v)"
else
  echo "  ⚠ Node.js not found in PATH"
  echo "  Attempting to activate Node.js environment..."
  # Try to find and activate cPanel Node.js environment
  for nodeenv in "$HOME/nodeenv"/*/bin/activate "$HOME/virtualenv"/*/bin/activate; do
    if [ -f "$nodeenv" ]; then
      source "$nodeenv" 2>/dev/null && echo "  ✓ Activated: $nodeenv" && break
    fi
  done
fi

echo ""
echo "[2/9] Setting up application directory..."
mkdir -p "$APP_DIR"
cd "$APP_DIR"
echo "  Working directory: $(pwd)"

echo ""
echo "[3/9] Pulling latest code from GitHub..."
if [ -d .git ]; then
  echo "  Repository exists, pulling updates..."
  git fetch origin "$BRANCH" 2>&1 || true
  git reset --hard "origin/$BRANCH" 2>&1 || true
else
  echo "  Cloning repository..."
  rm -rf "$APP_DIR"/* 2>/dev/null || true
  rm -rf "$APP_DIR"/.* 2>/dev/null || true
  git clone -b "$BRANCH" "$REPO_URL" . 2>&1 || {
    echo "  ⚠ Git clone failed. Trying with cached credentials..."
    git clone -b "$BRANCH" "$REPO_URL" . 2>&1
  }
fi

echo ""
echo "[4/9] Switching to MySQL schema..."
if [ -f prisma/schema.mysql.prisma ]; then
  cp -f prisma/schema.mysql.prisma prisma/schema.prisma
  echo "  ✓ MySQL schema activated"
else
  echo "  ⚠ MySQL schema not found"
fi

echo ""
echo "[5/9] Creating production environment file..."
if [ ! -f .env ] || [ ! -f .env.production ]; then
  cat > .env << 'ENVEOF'
# ============================================================
# NutriClinic SaaS - Production Environment
# ============================================================

# MySQL Database
DATABASE_URL="mysql://matrmylq_nutriusr:NutriCli@2024Sec@localhost:3306/matrmylq_nutricli"

# MySQL Connection (for mysql2 module)
MYSQL_HOST="localhost"
MYSQL_PORT="3306"
MYSQL_USER="matrmylq_nutriusr"
MYSQL_PASSWORD="NutriCli@2024Sec"
MYSQL_DATABASE="matrmylq_nutricli"

# JWT Secret - CHANGE THIS!
JWT_SECRET="nc-saas-prod-jwt-s3cur3-k3y-2024"

# App URL
NEXT_PUBLIC_APP_URL="https://nutriclinic.matrix49.app"

# WhatsApp Number for activation
WHATSAPP_NUMBER="+201012345678"

# Node Environment
NODE_ENV="production"
ENVEOF
  echo "  ✓ .env file created"
else
  echo "  ✓ .env file already exists"
fi

echo ""
echo "[6/9] Installing dependencies..."
echo "  This may take a few minutes..."
npm install --production=false 2>&1 | tail -5

echo ""
echo "[7/9] Generating Prisma client and building application..."
npx prisma generate 2>&1 | tail -2

echo "  Building Next.js application..."
echo "  This may take several minutes..."
NODE_ENV=production npm run build 2>&1 | tail -10

echo ""
echo "[8/9] Setting up production files..."
# Copy static and public files to standalone output
cp -r .next/static .next/standalone/.next/ 2>/dev/null || true
cp -r public .next/standalone/ 2>/dev/null || true
cp .env .next/standalone/ 2>/dev/null || true

# Create tmp directory for Passenger restart
mkdir -p tmp

echo "  ✓ Production files configured"

echo ""
echo "[9/9] Finalizing setup..."
echo ""
echo "╔══════════════════════════════════════════════════════════╗"
echo "║   ✅ Setup completed successfully!                       ║"
echo "║   تم الإعداد بنجاح!                                     ║"
echo "╚══════════════════════════════════════════════════════════╝"
echo ""
echo "  الآن قم بإنشاء تطبيق Node.js في cPanel:"
echo "  Now create the Node.js App in cPanel:"
echo ""
echo "  1. اذهب إلى: cPanel → Software → Setup Node.js App"
echo "  2. اضغط: Create Application"
echo "  3. املأ البيانات التالية:"
echo "     - Node.js version: 20.x"
echo "     - Application mode: Production"
echo "     - Application root: $APP_DIR"
echo "     - Application URL: nutriclinic.matrix49.app"
echo "     - Application startup file: server.js"
echo "  4. أضف متغيرات البيئة (Environment Variables):"
echo "     - NODE_ENV = production"
echo "     - DATABASE_URL = mysql://matrmylq_nutriusr:NutriCli@2024Sec@localhost:3306/matrmylq_nutricli"
echo "     - MYSQL_HOST = localhost"
echo "     - MYSQL_PORT = 3306"
echo "     - MYSQL_USER = matrmylq_nutriusr"
echo "     - MYSQL_PASSWORD = NutriCli@2024Sec"
echo "     - MYSQL_DATABASE = matrmylq_nutricli"
echo "     - JWT_SECRET = nc-saas-prod-jwt-s3cur3-k3y-2024"
echo "     - NEXT_PUBLIC_APP_URL = https://nutriclinic.matrix49.app"
echo "  5. اضغط: Create"
echo "  6. اضغط: Start"
echo ""
echo "  Website: https://nutriclinic.matrix49.app/"
echo ""
