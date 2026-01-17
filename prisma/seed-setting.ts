import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function seedSystemSettings() {
  console.log("Seeding system settings...");

  const systemSettings = [
    // Platform Settings
    {
      category: "platform",
      key: "platformName",
      value: "payrollBook",
      description: "Name of the platform",
    },
    {
      category: "platform",
      key: "platformVersion",
      value: "1.0.0",
      description: "Current platform version",
    },
    {
      category: "platform",
      key: "platformDescription",
      value: "Your local marketplace for fresh groceries and daily essentials",
      description: "Platform description",
    },
    {
      category: "platform",
      key: "supportEmail",
      value: "support@townkart.com",
      description: "Support email address",
    },
    {
      category: "platform",
      key: "supportPhone",
      value: "+91-1234567890",
      description: "Support phone number",
    },
    {
      category: "platform",
      key: "maintenanceMode",
      value: false,
      description: "Platform maintenance mode",
    },
    {
      category: "platform",
      key: "defaultLanguage",
      value: "en",
      description: "Default platform language",
    },
    {
      category: "platform",
      key: "defaultCurrency",
      value: "INR",
      description: "Default currency",
    },
    {
      category: "platform",
      key: "timezone",
      value: "Asia/Kolkata",
      description: "Default timezone",
    },

    {
      category: "security",
      key: "sessionTimeout",
      value: 30,
      description: "Session timeout in minutes",
    },
    {
      category: "security",
      key: "maxLoginAttempts",
      value: 5,
      description: "Maximum login attempts before lockout",
    },
    {
      category: "security",
      key: "requireTwoFactor",
      value: false,
      description: "Require 2FA for admin accounts",
    },
    {
      category: "security",
      key: "ipWhitelisting",
      value: false,
      description: "Enable IP whitelisting for admin access",
    },
    {
      category: "security",
      key: "loginNotifications",
      value: true,
      description: "Send alerts for suspicious login attempts",
    },

    // Notification Settings
    {
      category: "notifications",
      key: "emailOrderNotifications",
      value: true,
      description: "Send email notifications for orders",
    },
    {
      category: "notifications",
      key: "emailDeliveryAlerts",
      value: true,
      description: "Send delivery status email alerts",
    },
    {
      category: "notifications",
      key: "marketingEmails",
      value: false,
      description: "Send promotional emails to users",
    },

    // Feature Toggles
    {
      category: "features",
      key: "wishlistEnabled",
      value: true,
      description: "Enable wishlist functionality",
    },
    {
      category: "features",
      key: "productReviewsEnabled",
      value: true,
      description: "Enable product reviews",
    },
    {
      category: "features",
      key: "locationServicesEnabled",
      value: true,
      description: "Enable location-based services",
    },
    {
      category: "features",
      key: "merchantAnalyticsEnabled",
      value: true,
      description: "Enable merchant analytics dashboard",
    },
    {
      category: "features",
      key: "bulkUploadEnabled",
      value: true,
      description: "Enable bulk product upload",
    },
  ];

  for (const setting of systemSettings) {
    await prisma.systemSetting.upsert({
      where: {
        category_key: {
          category: setting.category,
          key: setting.key,
        },
      },
      update: {
        value: JSON.stringify(setting.value),
        description: setting.description,
        updatedAt: new Date(),
      },
      create: {
        category: setting.category,
        key: setting.key,
        value: JSON.stringify(setting.value),
        description: setting.description,
      },
    });
  }

  console.log("System settings seeded successfully!");
}

export default seedSystemSettings;

// Run if called directly
if (require.main === module) {
  seedSystemSettings()
    .catch((e) => {
      console.error(e);
      process.exit(1);
    })
    .finally(async () => {
      await prisma.$disconnect();
    });
}
