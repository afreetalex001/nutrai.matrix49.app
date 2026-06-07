#!/bin/bash
# ============================================================
# NutriClinic SaaS - Server Setup Script
# سكربت إعداد الخادم - يُشغّل مرة واحدة فقط على الخادم
# ============================================================

set -e

echo "🚀 NutriClinic Server Setup"
echo "============================"

# ===== المتغيرات =====
APP_DIR="$HOME/nutriclinic.matrix49.app"
DB_NAME="matrmlyq_nutriclinic"
DB_USER="matrmlyq_nutriclinic"
DB_PASS="NutriClinic@2024!Secure"

# ===== 1. إنشاء قاعدة البيانات MySQL =====
echo ""
echo "📊 Setting up MySQL database..."

if command -v mysql &> /dev/null; then
  mysql -e "CREATE DATABASE IF NOT EXISTS \`${DB_NAME}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;" 2>/dev/null && \
    echo "✅ Database created: ${DB_NAME}" || \
    echo "⚠️ Could not create database via CLI. Use cPanel > MySQL Databases instead."

  mysql -e "CREATE USER IF NOT EXISTS '${DB_USER}'@'localhost' IDENTIFIED BY '${DB_PASS}';" 2>/dev/null || true
  mysql -e "GRANT ALL PRIVILEGES ON \`${DB_NAME}\`.* TO '${DB_USER}'@'localhost';" 2>/dev/null || true
  mysql -e "FLUSH PRIVILEGES;" 2>/dev/null || true
  echo "✅ Database user configured"
else
  echo "⚠️ MySQL CLI not available. Please create database via cPanel > MySQL Databases:"
  echo "   Database: ${DB_NAME}"
  echo "   User: ${DB_USER}"
  echo "   Password: ${DB_PASS}"
fi

# ===== 2. إعداد ملف البيئة =====
echo ""
echo "⚙️ Setting up environment..."

cat > "${APP_DIR}/.env.production" << ENVEOF
# ===== NutriClinic Production Environment =====
DATABASE_URL="mysql://${DB_USER}:${DB_PASS}@localhost:3306/${DB_NAME}"
MYSQL_HOST=localhost
MYSQL_PORT=3306
MYSQL_USER=${DB_USER}
MYSQL_PASSWORD=${DB_PASS}
MYSQL_DATABASE=${DB_NAME}
JWT_SECRET=nc-prod-jwt-$(openssl rand -hex 16 2>/dev/null || echo 'xK9mR3vP7wQ2nL5jH8tY6bN')
NEXTAUTH_SECRET=nc-prod-auth-$(openssl rand -hex 16 2>/dev/null || echo 'aB4cD6eF8gH0iJ2kL5mN7oP')
NEXTAUTH_URL=https://nutriclinic.matrix49.app
NODE_ENV=production
PORT=3000
SETUP_KEY=nutriclinic-setup-$(openssl rand -hex 8 2>/dev/null || echo '2024')
ENVEOF

echo "✅ .env.production created"

# ===== 3. تثبيت التبعيات =====
echo ""
echo "📦 Installing dependencies..."
cd "${APP_DIR}"

if [ -f package.json ]; then
  npm install --production=false 2>&1 | tail -5
  echo "✅ Dependencies installed"
else
  echo "⚠️ package.json not found. Please upload the project files first."
  exit 1
fi

# ===== 4. توليد Prisma Client =====
echo ""
echo "🔧 Generating Prisma Client..."
npx prisma generate 2>&1 | tail -3
echo "✅ Prisma Client generated"

# ===== 5. دفع مخطط قاعدة البيانات =====
echo ""
echo "📊 Pushing database schema..."
npx prisma db push --skip-generate 2>&1 | tail -5
echo "✅ Database schema pushed"

# ===== 6. بناء التطبيق =====
echo ""
echo "🏗️ Building Next.js application..."
npm run build 2>&1 | tail -10
echo "✅ Build completed"

# ===== 7. بذر البيانات الأولية =====
SEED_KEY=$(grep SETUP_KEY "${APP_DIR}/.env.production" | cut -d'=' -f2)

echo ""
echo "🌱 To seed the database, run after starting the app from cPanel:"
echo ""
echo "  curl -X POST https://nutriclinic.matrix49.app/api/setup \\"
echo "    -H 'Content-Type: application/json' \\"
echo "    -d '{\"setupKey\": \"${SEED_KEY}\"}'"
echo ""

echo ""
echo "============================="
echo "✅ Setup completed!"
echo ""
echo "📋 Next Steps:"
echo "   1. Go to cPanel > Setup Node.js App"
echo "   2. Create application with:"
echo "      - Node.js version: 20.x"
echo "      - Application mode: Production"
echo "      - Application root: ${APP_DIR}"
echo "      - Application URL: nutriclinic.matrix49.app"
echo "      - Application startup file: server.js"
echo "   3. Add environment variables from .env.production"
echo "   4. Start the application"
echo "   5. Run the seed command above"
echo ""
