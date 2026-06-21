-- ============================================================
-- NutriClinic SaaS - Production Database Schema (MySQL / cPanel)
-- Pure MySQL DDL — Replacement for prisma/schema.prisma
-- ============================================================
-- هذا الملف يُنشئ جميع الجداول والعلاقات والفهارس.
-- يُشغّل عبر: mysql -u USER -p DATABASE < prisma/schema.sql
-- أو من سكربت: npm run db:init
-- ============================================================

SET FOREIGN_KEY_CHECKS = 0;

-- ============================================================
-- 1. User — المستخدمين (admin / doctor)
-- ============================================================
CREATE TABLE IF NOT EXISTS `User` (
  `id` VARCHAR(24) NOT NULL PRIMARY KEY,
  `email` VARCHAR(255) NOT NULL UNIQUE,
  `password` VARCHAR(255) NOT NULL,
  `name` VARCHAR(255) NOT NULL,
  `phone` VARCHAR(50) NULL,
  `role` VARCHAR(20) NOT NULL DEFAULT 'doctor',
  `isActive` TINYINT(1) NOT NULL DEFAULT 0,
  `avatar` TEXT NULL,
  `specialization` TEXT NULL,
  `clinicName` TEXT NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- 2. SubscriptionPlan — خطط الاشتراك
-- ============================================================
CREATE TABLE IF NOT EXISTS `SubscriptionPlan` (
  `id` VARCHAR(24) NOT NULL PRIMARY KEY,
  `name` VARCHAR(50) NOT NULL,
  `nameAr` VARCHAR(100) NOT NULL,
  `price` DOUBLE NOT NULL,
  `currency` VARCHAR(10) NOT NULL DEFAULT 'EGP',
  `durationDays` INT NOT NULL,
  `features` TEXT NOT NULL,
  `isActive` TINYINT(1) NOT NULL DEFAULT 1,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- 3. Subscription — اشتراكات المستخدمين
-- ============================================================
CREATE TABLE IF NOT EXISTS `Subscription` (
  `id` VARCHAR(24) NOT NULL PRIMARY KEY,
  `userId` VARCHAR(24) NOT NULL UNIQUE,
  `planId` VARCHAR(24) NOT NULL,
  `status` VARCHAR(20) NOT NULL DEFAULT 'pending',
  `startDate` DATETIME(3) NULL,
  `endDate` DATETIME(3) NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  CONSTRAINT `FK_Subscription_user` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE,
  CONSTRAINT `FK_Subscription_plan` FOREIGN KEY (`planId`) REFERENCES `SubscriptionPlan`(`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- 4. Patient — المرضى
-- ============================================================
CREATE TABLE IF NOT EXISTS `Patient` (
  `id` VARCHAR(24) NOT NULL PRIMARY KEY,
  `doctorId` VARCHAR(24) NOT NULL,
  `name` VARCHAR(255) NOT NULL,
  `email` VARCHAR(255) NULL,
  `phone` VARCHAR(50) NULL,
  `gender` VARCHAR(10) NULL,
  `dateOfBirth` DATETIME(3) NULL,
  `age` INT NULL,
  `height` DOUBLE NULL,
  `weight` DOUBLE NULL,
  `activityLevel` VARCHAR(20) NULL,
  `goal` VARCHAR(30) NULL,
  `medicalNotes` TEXT NULL,
  `inBodyData` TEXT NULL,
  `labReports` TEXT NULL,
  `aiSummary` TEXT NULL,
  `aiSummaryAt` DATETIME(3) NULL,
  `caloriesTarget` DOUBLE NULL,
  `proteinTarget` DOUBLE NULL,
  `carbsTarget` DOUBLE NULL,
  `fatsTarget` DOUBLE NULL,
  `waterTarget` DOUBLE NULL,
  `isActive` TINYINT(1) NOT NULL DEFAULT 1,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  INDEX `IDX_Patient_doctorId` (`doctorId`),
  CONSTRAINT `FK_Patient_doctor` FOREIGN KEY (`doctorId`) REFERENCES `User`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- 5. PatientShareToken — توكينات وصول المريض للبوابة
-- ============================================================
CREATE TABLE IF NOT EXISTS `PatientShareToken` (
  `id` VARCHAR(24) NOT NULL PRIMARY KEY,
  `token` VARCHAR(64) NOT NULL UNIQUE,
  `patientId` VARCHAR(24) NOT NULL,
  `createdById` VARCHAR(24) NOT NULL,
  `expiresAt` DATETIME(3) NOT NULL,
  `canViewPlans` TINYINT(1) NOT NULL DEFAULT 1,
  `canSubmitWeight` TINYINT(1) NOT NULL DEFAULT 1,
  `canSubmitNote` TINYINT(1) NOT NULL DEFAULT 1,
  `isRevoked` TINYINT(1) NOT NULL DEFAULT 0,
  `lastAccessedAt` DATETIME(3) NULL,
  `accessCount` INT NOT NULL DEFAULT 0,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  INDEX `IDX_PatientShareToken_patientId` (`patientId`),
  INDEX `IDX_PatientShareToken_expiresAt` (`expiresAt`),
  CONSTRAINT `FK_PatientShareToken_patient` FOREIGN KEY (`patientId`) REFERENCES `Patient`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- 6. PatientSelfReport — التقارير الذاتية من المريض
-- ============================================================
CREATE TABLE IF NOT EXISTS `PatientSelfReport` (
  `id` VARCHAR(24) NOT NULL PRIMARY KEY,
  `patientId` VARCHAR(24) NOT NULL,
  `tokenId` VARCHAR(24) NULL,
  `type` VARCHAR(20) NOT NULL,
  `weight` DOUBLE NULL,
  `bodyFat` DOUBLE NULL,
  `note` TEXT NULL,
  `isRead` TINYINT(1) NOT NULL DEFAULT 0,
  `readAt` DATETIME(3) NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  INDEX `IDX_PatientSelfReport_patientId` (`patientId`),
  INDEX `IDX_PatientSelfReport_isRead` (`isRead`),
  CONSTRAINT `FK_PatientSelfReport_patient` FOREIGN KEY (`patientId`) REFERENCES `Patient`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- 7. Visit — الزيارات
-- ============================================================
CREATE TABLE IF NOT EXISTS `Visit` (
  `id` VARCHAR(24) NOT NULL PRIMARY KEY,
  `patientId` VARCHAR(24) NOT NULL,
  `weight` DOUBLE NULL,
  `height` DOUBLE NULL,
  `bodyFat` DOUBLE NULL,
  `muscleMass` DOUBLE NULL,
  `waterPercentage` DOUBLE NULL,
  `bmi` DOUBLE NULL,
  `bmr` DOUBLE NULL,
  `tdee` DOUBLE NULL,
  `notes` TEXT NULL,
  `visitDate` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  INDEX `IDX_Visit_patientId` (`patientId`),
  CONSTRAINT `FK_Visit_patient` FOREIGN KEY (`patientId`) REFERENCES `Patient`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- 8. NutritionPlan — خطط التغذية
-- ============================================================
CREATE TABLE IF NOT EXISTS `NutritionPlan` (
  `id` VARCHAR(24) NOT NULL PRIMARY KEY,
  `patientId` VARCHAR(24) NOT NULL,
  `doctorId` VARCHAR(24) NOT NULL,
  `name` VARCHAR(255) NOT NULL,
  `description` TEXT NULL,
  `calories` DOUBLE NOT NULL,
  `protein` DOUBLE NOT NULL,
  `carbs` DOUBLE NOT NULL,
  `fats` DOUBLE NOT NULL,
  `water` DOUBLE NULL,
  `meals` TEXT NOT NULL,
  `structuredPlan` TEXT NULL,
  `status` VARCHAR(20) NOT NULL DEFAULT 'draft',
  `weekNumber` INT NULL,
  `isAdaptive` TINYINT(1) NOT NULL DEFAULT 0,
  `adaptiveFromVisit` VARCHAR(24) NULL,
  `isActive` TINYINT(1) NOT NULL DEFAULT 1,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  INDEX `IDX_NutritionPlan_patientId` (`patientId`),
  INDEX `IDX_NutritionPlan_doctorId` (`doctorId`),
  CONSTRAINT `FK_NutritionPlan_patient` FOREIGN KEY (`patientId`) REFERENCES `Patient`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- 9. ExercisePlan — خطط التمارين
-- ============================================================
CREATE TABLE IF NOT EXISTS `ExercisePlan` (
  `id` VARCHAR(24) NOT NULL PRIMARY KEY,
  `patientId` VARCHAR(24) NOT NULL,
  `doctorId` VARCHAR(24) NOT NULL,
  `name` VARCHAR(255) NOT NULL,
  `description` TEXT NULL,
  `schedule` TEXT NOT NULL,
  `structuredPlan` TEXT NULL,
  `status` VARCHAR(20) NOT NULL DEFAULT 'draft',
  `weekNumber` INT NULL,
  `isAdaptive` TINYINT(1) NOT NULL DEFAULT 0,
  `adaptiveFromVisit` VARCHAR(24) NULL,
  `isActive` TINYINT(1) NOT NULL DEFAULT 1,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  INDEX `IDX_ExercisePlan_patientId` (`patientId`),
  INDEX `IDX_ExercisePlan_doctorId` (`doctorId`),
  CONSTRAINT `FK_ExercisePlan_patient` FOREIGN KEY (`patientId`) REFERENCES `Patient`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- 10. FoodItem — قاعدة بيانات الأطعمة
-- ============================================================
CREATE TABLE IF NOT EXISTS `FoodItem` (
  `id` VARCHAR(24) NOT NULL PRIMARY KEY,
  `nameAr` VARCHAR(150) NOT NULL,
  `nameEn` VARCHAR(150) NULL,
  `category` VARCHAR(30) NOT NULL,
  `caloriesPer100` DOUBLE NOT NULL,
  `proteinPer100` DOUBLE NOT NULL,
  `carbsPer100` DOUBLE NOT NULL,
  `fatsPer100` DOUBLE NOT NULL,
  `fiberPer100` DOUBLE NULL,
  `sugarPer100` DOUBLE NULL,
  `servingUnits` TEXT NULL,
  `notes` TEXT NULL,
  `isVegetarian` TINYINT(1) NOT NULL DEFAULT 0,
  `isVegan` TINYINT(1) NOT NULL DEFAULT 0,
  `isGlutenFree` TINYINT(1) NOT NULL DEFAULT 0,
  `isHalal` TINYINT(1) NOT NULL DEFAULT 1,
  `isCustom` TINYINT(1) NOT NULL DEFAULT 0,
  `createdById` VARCHAR(24) NULL,
  `isActive` TINYINT(1) NOT NULL DEFAULT 1,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  INDEX `IDX_FoodItem_category` (`category`),
  INDEX `IDX_FoodItem_nameAr` (`nameAr`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- 11. AiProvider — مزودي الذكاء الاصطناعي
-- ============================================================
CREATE TABLE IF NOT EXISTS `AiProvider` (
  `id` VARCHAR(24) NOT NULL PRIMARY KEY,
  `name` VARCHAR(50) NOT NULL,
  `displayName` VARCHAR(100) NOT NULL,
  `baseUrl` TEXT NULL,
  `configJson` LONGTEXT NULL,
  `isCustom` TINYINT(1) NOT NULL DEFAULT 0,
  `isDeleted` TINYINT(1) NOT NULL DEFAULT 0,
  `deletedAt` DATETIME(3) NULL,
  `isActive` TINYINT(1) NOT NULL DEFAULT 1,
  `priority` INT NOT NULL DEFAULT 0,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- 12. AiApiKey — مفاتيح API للمزودين
-- ============================================================
CREATE TABLE IF NOT EXISTS `AiApiKey` (
  `id` VARCHAR(24) NOT NULL PRIMARY KEY,
  `providerId` VARCHAR(24) NOT NULL,
  `apiKey` TEXT NOT NULL,
  `model` VARCHAR(100) NOT NULL,
  `isActive` TINYINT(1) NOT NULL DEFAULT 1,
  `quotaLimit` INT NULL,
  `quotaUsed` INT NOT NULL DEFAULT 0,
  `quotaResetAt` DATETIME(3) NULL,
  `lastError` TEXT NULL,
  `lastErrorAt` DATETIME(3) NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  CONSTRAINT `FK_AiApiKey_provider` FOREIGN KEY (`providerId`) REFERENCES `AiProvider`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- 13. AiUsageLog — سجل استخدام الـ AI
-- ============================================================
CREATE TABLE IF NOT EXISTS `AiUsageLog` (
  `id` VARCHAR(24) NOT NULL PRIMARY KEY,
  `apiKeyId` VARCHAR(24) NULL,
  `providerId` VARCHAR(24) NOT NULL,
  `userId` VARCHAR(24) NOT NULL,
  `requestType` VARCHAR(30) NOT NULL,
  `tokensUsed` INT NOT NULL DEFAULT 0,
  `isSuccess` TINYINT(1) NOT NULL,
  `errorMessage` TEXT NULL,
  `responseTime` INT NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  INDEX `IDX_AiUsageLog_apiKeyId` (`apiKeyId`),
  INDEX `IDX_AiUsageLog_providerId` (`providerId`),
  INDEX `IDX_AiUsageLog_userId` (`userId`),
  INDEX `IDX_AiUsageLog_createdAt` (`createdAt`),
  CONSTRAINT `FK_AiUsageLog_apiKey` FOREIGN KEY (`apiKeyId`) REFERENCES `AiApiKey`(`id`) ON DELETE SET NULL,
  CONSTRAINT `FK_AiUsageLog_provider` FOREIGN KEY (`providerId`) REFERENCES `AiProvider`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- 14. AiConversation — محادثات الذكاء الاصطناعي
-- ============================================================
CREATE TABLE IF NOT EXISTS `AiConversation` (
  `id` VARCHAR(24) NOT NULL PRIMARY KEY,
  `userId` VARCHAR(24) NOT NULL,
  `title` VARCHAR(255) NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  INDEX `IDX_AiConversation_userId` (`userId`),
  CONSTRAINT `FK_AiConversation_user` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- 15. AiMessage — رسائل المحادثات
-- ============================================================
CREATE TABLE IF NOT EXISTS `AiMessage` (
  `id` VARCHAR(24) NOT NULL PRIMARY KEY,
  `conversationId` VARCHAR(24) NOT NULL,
  `role` VARCHAR(20) NOT NULL,
  `content` TEXT NOT NULL,
  `providerUsed` VARCHAR(100) NULL,
  `tokensUsed` INT NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  INDEX `IDX_AiMessage_conversationId` (`conversationId`),
  CONSTRAINT `FK_AiMessage_conversation` FOREIGN KEY (`conversationId`) REFERENCES `AiConversation`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- 16. CmsContent — محتوى CMS
-- ============================================================
CREATE TABLE IF NOT EXISTS `CmsContent` (
  `id` VARCHAR(24) NOT NULL PRIMARY KEY,
  `key` VARCHAR(255) NOT NULL UNIQUE,
  `value` TEXT NOT NULL,
  `valueAr` TEXT NULL,
  `type` VARCHAR(20) NOT NULL DEFAULT 'text',
  `page` VARCHAR(50) NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- 17. LandingPageSection — أقسام الصفحة الرئيسية
-- ============================================================
CREATE TABLE IF NOT EXISTS `LandingPageSection` (
  `id` VARCHAR(24) NOT NULL PRIMARY KEY,
  `sectionKey` VARCHAR(50) NOT NULL UNIQUE,
  `title` VARCHAR(255) NOT NULL,
  `titleAr` VARCHAR(255) NULL,
  `subtitle` VARCHAR(500) NULL,
  `subtitleAr` VARCHAR(500) NULL,
  `content` TEXT NULL,
  `contentAr` TEXT NULL,
  `imageUrl` TEXT NULL,
  `isVisible` TINYINT(1) NOT NULL DEFAULT 1,
  `sortOrder` INT NOT NULL DEFAULT 0,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- 18. LandingPageItem — عناصر أقسام الصفحة الرئيسية
-- ============================================================
CREATE TABLE IF NOT EXISTS `LandingPageItem` (
  `id` VARCHAR(24) NOT NULL PRIMARY KEY,
  `sectionKey` VARCHAR(50) NOT NULL,
  `title` VARCHAR(255) NOT NULL,
  `titleAr` VARCHAR(255) NULL,
  `description` TEXT NULL,
  `descriptionAr` TEXT NULL,
  `imageUrl` TEXT NULL,
  `iconName` VARCHAR(50) NULL,
  `linkUrl` VARCHAR(500) NULL,
  `sortOrder` INT NOT NULL DEFAULT 0,
  `isVisible` TINYINT(1) NOT NULL DEFAULT 1,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  INDEX `IDX_LandingPageItem_sectionKey` (`sectionKey`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- 19. SystemSettings — إعدادات النظام
-- ============================================================
CREATE TABLE IF NOT EXISTS `SystemSettings` (
  `id` VARCHAR(24) NOT NULL PRIMARY KEY,
  `key` VARCHAR(255) NOT NULL UNIQUE,
  `value` TEXT NOT NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- ============================================================
-- 20. SiteVisitor — زوار الموقع الفريدون
-- ============================================================
CREATE TABLE IF NOT EXISTS `SiteVisitor` (
  `id` VARCHAR(24) NOT NULL PRIMARY KEY,
  `visitorId` VARCHAR(100) NOT NULL UNIQUE,
  `ipHash` CHAR(64) NULL,
  `userAgent` VARCHAR(500) NULL,
  `firstSeenAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `lastSeenAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `lastPath` VARCHAR(500) NULL,
  `referrer` VARCHAR(500) NULL,
  `visitCount` INT NOT NULL DEFAULT 1,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  INDEX `IDX_SiteVisitor_lastSeenAt` (`lastSeenAt`),
  INDEX `IDX_SiteVisitor_firstSeenAt` (`firstSeenAt`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- 21. SystemErrorLog — سجل أخطاء المنصة
-- ============================================================
CREATE TABLE IF NOT EXISTS `SystemErrorLog` (
  `id` VARCHAR(24) NOT NULL PRIMARY KEY,
  `level` VARCHAR(20) NOT NULL DEFAULT 'error',
  `source` VARCHAR(120) NOT NULL,
  `message` TEXT NOT NULL,
  `stack` LONGTEXT NULL,
  `explanation` TEXT NULL,
  `path` VARCHAR(500) NULL,
  `method` VARCHAR(10) NULL,
  `userId` VARCHAR(24) NULL,
  `userRole` VARCHAR(30) NULL,
  `ipHash` CHAR(64) NULL,
  `userAgent` VARCHAR(500) NULL,
  `metadata` JSON NULL,
  `isResolved` TINYINT(1) NOT NULL DEFAULT 0,
  `resolvedAt` DATETIME(3) NULL,
  `resolvedById` VARCHAR(24) NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  INDEX `IDX_SystemErrorLog_createdAt` (`createdAt`),
  INDEX `IDX_SystemErrorLog_source` (`source`),
  INDEX `IDX_SystemErrorLog_isResolved` (`isResolved`),
  INDEX `IDX_SystemErrorLog_userId` (`userId`),
  CONSTRAINT `FK_SystemErrorLog_user` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

SET FOREIGN_KEY_CHECKS = 1;

-- ============================================================
-- نهاية المخطط
-- ============================================================
