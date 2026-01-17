import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Seeding demo data...");

  /* ===============================
     SUPER ADMIN
  =============================== */
  const superAdminPassword = await bcrypt.hash("superadmin123", 10);

  const superAdmin = await prisma.user.upsert({
    where: { email: "superadmin@pagarbook.com" },
    update: {},
    create: {
      email: "superadmin@pagarbook.com",
      phone: "+911111111111",
      password: superAdminPassword,
      role: "SUPER_ADMIN",
      status: "ACTIVE",
    },
  });

  console.log("✅ Super Admin:", superAdmin.email);

  /* ===============================
     COMPANIES
  =============================== */
  const companyNames = [
    "TechCorp Solutions",
    "Global Industries",
    "Innovate Labs",
  ];

  const companies = [];
  for (const name of companyNames) {
    const company = await prisma.company.create({
      data: {
        name,
        status: "ACTIVE",
      },
    });
    companies.push(company);
    console.log("✅ Company:", company.name);
  }

  /* ===============================
     ADMINS
  =============================== */
  const adminPassword = await bcrypt.hash("admin123", 10);
  const admins = [];

  for (let i = 0; i < companies.length; i++) {
    const admin = await prisma.user.upsert({
      where: { email: `admin${i + 1}@pagarbook.com` },
      update: {},
      create: {
        email: `admin${i + 1}@pagarbook.com`,
        phone: `+92222222222${i}`,
        password: adminPassword,
        role: "ADMIN",
        status: "ACTIVE",
        companyId: companies[i].id,
      },
    });
    admins.push(admin);
    console.log("✅ Admin:", admin.email);
  }

  /* ===============================
     STAFF
  =============================== */
  const staffPassword = await bcrypt.hash("staff123", 10);
  const staffUsers = [
    {
      email: "staff1@pagarbook.com",
      phone: "+933333333331",
      companyId: companies[0].id,
    },
    {
      email: "staff2@pagarbook.com",
      phone: "+933333333332",
      companyId: companies[0].id,
    },
    {
      email: "staff3@pagarbook.com",
      phone: "+933333333333",
      companyId: companies[1].id,
    },
  ];

  const staffList = [];
  for (const staff of staffUsers) {
    const user = await prisma.user.upsert({
      where: { email: staff.email },
      update: {},
      create: {
        ...staff,
        password: staffPassword,
        role: "STAFF",
        status: "ACTIVE",
      },
    });
    staffList.push(user);
    console.log("✅ Staff:", user.email);
  }

  /* ===============================
     ATTENDANCE + AUDIT
  =============================== */
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  for (const staff of staffList.slice(0, 2)) {
    const attendance = await prisma.attendance.create({
      data: {
        userId: staff.id,
        companyId: staff.companyId!,
        attendanceDate: today,
        punchIn: new Date(today.getTime() + 9 * 60 * 60 * 1000),
        punchOut: new Date(today.getTime() + 17 * 60 * 60 * 1000),
        imageUrl: "https://via.placeholder.com/300x200?text=Attendance+Image",
        status: "APPROVED",
        approvedBy: admins[0].id,
        approvedAt: new Date(),
      },
    });

    console.log("✅ Attendance:", staff.email);

    await prisma.auditLog.create({
      data: {
        userId: staff.id,
        action: "CREATED",
        entity: "ATTENDANCE",
        entityId: attendance.id,
      },
    });

    await prisma.auditLog.create({
      data: {
        userId: admins[0].id,
        action: "APPROVED",
        entity: "ATTENDANCE",
        entityId: attendance.id,
      },
    });
  }

  /* ===============================
     SALARY
  =============================== */
  for (const staff of staffList) {
    const salary = await prisma.salary.create({
      data: {
        userId: staff.id,
        companyId: staff.companyId!,
        month: today.getMonth() + 1,
        year: today.getFullYear(),
        totalDays: 22,
        approvedDays: 20,
        grossAmount: 55000,
        netAmount: 48000,
        type: "MONTHLY",
        status: "PENDING",
      },
    });

    console.log("✅ Salary:", staff.email);
  }

  /* ===============================
     NOTIFICATIONS
  =============================== */
  for (const staff of staffList.slice(0, 2)) {
    await prisma.notification.create({
      data: {
        userId: staff.id,
        companyId: staff.companyId!,
        title: "Welcome to PagarBook",
        message: "Your account has been created successfully.",
        channel: "INAPP",
        status: "SENT",
      },
    });
    console.log("✅ Notification:", staff.email);
  }

  /* ===============================
     PUSH SUBSCRIPTION
  =============================== */
  await prisma.pushSubscription.create({
    data: {
      userId: staffList[0].id,
      endpoint: "https://fcm.googleapis.com/fcm/send/demo",
      p256dh: "demo-p256dh",
      auth: "demo-auth",
    },
  });

  console.log("✅ Push subscription created");

  /* ===============================
     OTP
  =============================== */
  await prisma.otp.create({
    data: {
      phone: staffList[0].phone,
      otp: "123456",
      purpose: "LOGIN",
      expiresAt: new Date(Date.now() + 5 * 60 * 1000),
    },
  });

  console.log("✅ OTP created");

  console.log("\n🎉 SEED COMPLETED SUCCESSFULLY");
  console.log("🔑 LOGIN CREDENTIALS");
  console.log("Super Admin → superadmin@pagarbook.com / superadmin123");
  console.log("Admin → admin1@pagarbook.com / admin123");
  console.log("Staff → staff1@pagarbook.com / staff123");
}

main()
  .catch((e) => {
    console.error("❌ Seed failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
