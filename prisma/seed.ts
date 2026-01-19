import {
  PrismaClient,
  Role,
  AttendanceStatus,
  SalaryType,
  AccountStatus,
} from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

// Utility functions
function getRandomElement<T>(array: T[]): T {
  return array[Math.floor(Math.random() * array.length)];
}

function getRandomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function addDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

function addHours(date: Date, hours: number): Date {
  const result = new Date(date);
  result.setHours(result.getHours() + hours);
  return result;
}

async function deleteAllDataInDB() {
  console.log("🧹 Clearing existing data...");
  await prisma.auditLog.deleteMany();
  await prisma.salaryBreakdown.deleteMany();
  await prisma.salary.deleteMany();
  await prisma.correctionRequest.deleteMany();
  await prisma.attendance.deleteMany();
  await prisma.shiftConfiguration.deleteMany();
  await prisma.notification.deleteMany();
  await prisma.pushSubscription.deleteMany();
  await prisma.otp.deleteMany();
  await prisma.companyInvitation.deleteMany();
  await prisma.user.deleteMany();
  await prisma.company.deleteMany();
  await prisma.systemSetting.deleteMany();
}

async function main() {
  console.log("🌱 Seeding comprehensive production-like data...");

  // Clear existing data in correct order

  if (process.env.CLEARDATA) {
    await deleteAllDataInDB();
  }
  /* ===============================
     SUPER ADMIN
  =============================== */
  console.log("👑 Creating Super Admin...");
  const superAdminPassword = await bcrypt.hash("superadmin123", 10);

  const superAdmin = await prisma.user.create({
    data: {
      email: "superadmin@pagarbook.com",
      phone: "+911111111111",
      password: superAdminPassword,
      role: "SUPER_ADMIN",
      status: "ACTIVE",
      firstName: "Super",
      lastName: "Admin",
      onboardingCompleted: true,
    },
  });

  console.log("✅ Super Admin created:", superAdmin.email);

  /* ===============================
     COMPANIES (15 companies)
  =============================== */
  console.log("🏢 Creating Companies...");
  const companyData = [
    { name: "TechCorp Solutions", industry: "Technology", size: "Large" },
    { name: "Global Industries", industry: "Manufacturing", size: "Large" },
    { name: "Innovate Labs", industry: "Research", size: "Medium" },
    { name: "Digital Dynamics", industry: "IT Services", size: "Large" },
    { name: "Metro Logistics", industry: "Transportation", size: "Medium" },
    { name: "HealthFirst Medical", industry: "Healthcare", size: "Large" },
    { name: "EduSmart Academy", industry: "Education", size: "Medium" },
    { name: "FinanceFlow Corp", industry: "Finance", size: "Large" },
    { name: "RetailMax Stores", industry: "Retail", size: "Large" },
    { name: "GreenEnergy Solutions", industry: "Energy", size: "Medium" },
    { name: "Creative Studios", industry: "Media", size: "Small" },
    {
      name: "BuildRight Construction",
      industry: "Construction",
      size: "Medium",
    },
    { name: "FoodieChain Restaurants", industry: "Hospitality", size: "Large" },
    { name: "AutoTech Motors", industry: "Automotive", size: "Large" },
    { name: "CloudSync Systems", industry: "Cloud Services", size: "Medium" },
  ];

  const companies = [];
  for (const data of companyData) {
    const company = await prisma.company.create({
      data: {
        name: data.name,
        description: `${data.name} - A leading ${data.industry} company`,
        status: "ACTIVE",
        shiftStartTime: "09:00",
        shiftEndTime: "18:00",
        gracePeriodMinutes: 15,
        minWorkingHours: 4.0,
        maxDailyHours: 12.0,
        autoPunchOutBufferMinutes: 30,
        locationLat: 28.6139 + (Math.random() - 0.5) * 2, // Delhi area
        locationLng: 77.209 + (Math.random() - 0.5) * 2,
        locationRadius: 100.0,
        overtimeThresholdHours: 2.0,
        nightPunchInWindowHours: 2.0,
        defaultSalaryType: getRandomElement([
          "MONTHLY",
          "HOURLY",
          "DAILY",
        ] as SalaryType[]),
        overtimeMultiplier: 1.5,
        enableLatePenalty: true,
        latePenaltyPerMinute: 2.0,
        enableAbsentPenalty: true,
        halfDayThresholdHours: 4.0,
        absentPenaltyPerDay: 500.0,
        pfPercentage: 12.0,
        esiPercentage: 0.75,
      },
    });
    companies.push(company);
  }
  console.log(`✅ Created ${companies.length} companies`);

  /* ===============================
     USERS (Admins, Managers, Accountants, Staff)
  =============================== */
  console.log("👥 Creating Users...");
  const adminPassword = await bcrypt.hash("admin123", 10);
  const managerPassword = await bcrypt.hash("manager123", 10);
  const accountantPassword = await bcrypt.hash("accountant123", 10);
  const staffPassword = await bcrypt.hash("staff123", 10);

  const users = [];
  const admins = [];
  const managers = [];
  const accountants = [];
  const staff = [];

  // Create users for each company
  for (let i = 0; i < companies.length; i++) {
    const company = companies[i];

    // 1 Admin per company
    const admin = await prisma.user.create({
      data: {
        email: `admin${i + 1}@${company.name.toLowerCase().replace(/\s+/g, "")}.com`,
        phone: `+91${9000000000 + i}`,
        password: adminPassword,
        role: "ADMIN",
        status: "ACTIVE",
        companyId: company.id,
        firstName: `Admin${i + 1}`,
        lastName: company.name.split(" ")[0],
        onboardingCompleted: true,
        baseSalary: 80000,
        salaryType: "MONTHLY",
        workingDays: 26,
        pfEsiApplicable: true,
        joiningDate: addDays(new Date(), -365),
      },
    });
    admins.push(admin);
    users.push(admin);

    // 2-3 Managers per company
    const managerCount = getRandomInt(2, 3);
    for (let j = 0; j < managerCount; j++) {
      const manager = await prisma.user.create({
        data: {
          email: `manager${j + 1}.company${i + 1}@${company.name.toLowerCase().replace(/\s+/g, "")}.com`,
          phone: `+91${9100000000 + i * 10 + j}`,
          password: managerPassword,
          role: "MANAGER",
          status: "ACTIVE",
          companyId: company.id,
          firstName: `Manager${j + 1}`,
          lastName: `Company${i + 1}`,
          onboardingCompleted: true,
          baseSalary: 60000 + getRandomInt(0, 20000),
          salaryType: "MONTHLY",
          workingDays: 26,
          pfEsiApplicable: true,
          joiningDate: addDays(new Date(), -300),
        },
      });
      managers.push(manager);
      users.push(manager);
    }

    // 1-2 Accountants per company
    const accountantCount = getRandomInt(1, 2);
    for (let j = 0; j < accountantCount; j++) {
      const accountant = await prisma.user.create({
        data: {
          email: `accountant${j + 1}.company${i + 1}@${company.name.toLowerCase().replace(/\s+/g, "")}.com`,
          phone: `+91${9200000000 + i * 10 + j}`,
          password: accountantPassword,
          role: "ACCOUNTANT",
          status: "ACTIVE",
          companyId: company.id,
          firstName: `Accountant${j + 1}`,
          lastName: `Company${i + 1}`,
          onboardingCompleted: true,
          baseSalary: 55000 + getRandomInt(0, 15000),
          salaryType: "MONTHLY",
          workingDays: 26,
          pfEsiApplicable: true,
          joiningDate: addDays(new Date(), -250),
        },
      });
      accountants.push(accountant);
      users.push(accountant);
    }

    // 15-25 Staff per company
    const staffCount = getRandomInt(15, 25);
    for (let j = 0; j < staffCount; j++) {
      const salaryType = getRandomElement([
        "MONTHLY",
        "HOURLY",
        "DAILY",
      ] as SalaryType[]);
      let baseSalary = 0;
      let hourlyRate = 0;
      let dailyRate = 0;

      switch (salaryType) {
        case "MONTHLY":
          baseSalary = 25000 + getRandomInt(0, 35000);
          break;
        case "HOURLY":
          hourlyRate = 150 + getRandomInt(0, 200);
          break;
        case "DAILY":
          dailyRate = 800 + getRandomInt(0, 1200);
          break;
      }

      const staffMember = await prisma.user.create({
        data: {
          email: `staff${j + 1}.company${i + 1}@${company.name.toLowerCase().replace(/\s+/g, "")}.com`,
          phone: `+91${9300000000 + i * 100 + j}`,
          password: staffPassword,
          role: "STAFF",
          status: getRandomElement([
            "ACTIVE",
            "ACTIVE",
            "ACTIVE",
            "SUSPENDED",
          ] as AccountStatus[]),
          companyId: company.id,
          firstName: getRandomElement([
            "Rahul",
            "Priya",
            "Amit",
            "Sneha",
            "Vikram",
            "Anjali",
            "Rohit",
            "Kavita",
            "Suresh",
            "Meera",
          ]),
          lastName: getRandomElement([
            "Sharma",
            "Verma",
            "Gupta",
            "Singh",
            "Kumar",
            "Patel",
            "Jain",
            "Agarwal",
            "Yadav",
            "Mishra",
          ]),
          onboardingCompleted: true,
          baseSalary: baseSalary || null,
          hourlyRate: hourlyRate || null,
          dailyRate: dailyRate || null,
          salaryType,
          workingDays: 26,
          pfEsiApplicable: Math.random() > 0.3, // 70% have PF/ESI
          joiningDate: addDays(new Date(), -getRandomInt(30, 730)),
        },
      });
      staff.push(staffMember);
      users.push(staffMember);
    }
  }

  console.log(
    `✅ Created ${users.length} total users (${admins.length} admins, ${managers.length} managers, ${accountants.length} accountants, ${staff.length} staff)`,
  );

  /* ===============================
     SHIFT CONFIGURATIONS
  =============================== */
  console.log("📅 Creating Shift Configurations...");
  const shiftConfigs = [
    { name: "Day Shift", startTime: "09:00", endTime: "18:00" },
    { name: "Night Shift", startTime: "22:00", endTime: "07:00" },
    { name: "Morning Shift", startTime: "06:00", endTime: "15:00" },
    { name: "Evening Shift", startTime: "14:00", endTime: "23:00" },
  ];

  for (const company of companies) {
    for (const config of shiftConfigs) {
      await prisma.shiftConfiguration.create({
        data: {
          companyId: company.id,
          name: config.name,
          startTime: config.startTime,
          endTime: config.endTime,
          isActive: Math.random() > 0.5,
        },
      });
    }
  }
  console.log("✅ Shift configurations created");

  /* ===============================
     ATTENDANCE DATA (Last 6 months)
  =============================== */
  console.log("⏰ Creating Attendance Data...");
  const today = new Date();
  const sixMonthsAgo = addDays(today, -180);

  let attendanceCount = 0;
  for (const user of staff) {
    if (user.status !== "ACTIVE") continue;

    // Generate attendance for last 6 months
    for (let days = 0; days < 180; days++) {
      const attendanceDate = addDays(sixMonthsAgo, days);
      const dayOfWeek = attendanceDate.getDay();

      // Skip weekends (some companies work 6 days, some 5)
      if (dayOfWeek === 0 || (dayOfWeek === 6 && Math.random() > 0.6)) continue;

      // Random attendance patterns
      const attendanceType = getRandomElement([
        "PRESENT",
        "PRESENT",
        "PRESENT",
        "PRESENT",
        "PRESENT", // 80% present
        "ABSENT",
        "LEAVE",
        "LATE",
        "HALF_DAY",
      ]);

      let punchIn: Date | null = null;
      let punchOut: Date | null = null;
      let status: AttendanceStatus = "PENDING";
      let workingHours = 0;
      let overtimeHours = 0;
      let isLate = false;
      let shiftDurationHours: number | null = null;

      switch (attendanceType) {
        case "PRESENT":
          // Normal attendance
          const punchInHour = 8 + getRandomInt(0, 3); // 8-11 AM
          punchIn = new Date(attendanceDate);
          punchIn.setHours(punchInHour, getRandomInt(0, 59), 0, 0);

          const workHours = 7 + Math.random() * 3; // 7-10 hours
          punchOut = addHours(punchIn, workHours);

          workingHours = Math.round(workHours * 100) / 100;
          status = getRandomElement([
            "APPROVED",
            "APPROVED",
            "APPROVED",
            "PENDING",
          ] as AttendanceStatus[]);
          isLate = punchInHour >= 9.25; // Late if after 9:15 AM

          // Sometimes add overtime
          if (workingHours > 9 && Math.random() > 0.7) {
            overtimeHours = Math.round((workingHours - 9) * 100) / 100;
          }

          // Sometimes set manual shift duration for night shifts
          if (Math.random() > 0.8) {
            shiftDurationHours = getRandomElement([8, 8.5, 9, 12]);
          }
          break;

        case "LATE":
          punchIn = new Date(attendanceDate);
          punchIn.setHours(10 + getRandomInt(0, 2), getRandomInt(0, 59), 0, 0);
          punchOut = addHours(punchIn, 6 + Math.random() * 2);
          workingHours =
            Math.round(
              ((punchOut.getTime() - punchIn.getTime()) / (1000 * 60 * 60)) *
                100,
            ) / 100;
          status = getRandomElement([
            "APPROVED",
            "PENDING",
            "REJECTED",
          ] as AttendanceStatus[]);
          isLate = true;
          break;

        case "HALF_DAY":
          punchIn = new Date(attendanceDate);
          punchIn.setHours(9 + getRandomInt(0, 2), getRandomInt(0, 59), 0, 0);
          punchOut = addHours(punchIn, 3 + Math.random());
          workingHours =
            Math.round(
              ((punchOut.getTime() - punchIn.getTime()) / (1000 * 60 * 60)) *
                100,
            ) / 100;
          status = "APPROVED";
          break;

        case "ABSENT":
          status = getRandomElement([
            "ABSENT",
            "REJECTED",
          ] as AttendanceStatus[]);
          break;

        case "LEAVE":
          status = "LEAVE";
          break;
      }

      const attendance = await prisma.attendance.create({
        data: {
          userId: user.id,
          companyId: user.companyId!,
          attendanceDate,
          punchIn,
          punchOut,
          workingHours: workingHours || null,
          overtimeHours: overtimeHours || null,
          isLate,
          shiftDurationHours,
          status,
          autoPunchOut: Math.random() > 0.9,
          punchInImageUrl: punchIn
            ? `https://picsum.photos/300/200?random=${attendanceCount}`
            : null,
          punchOutImageUrl: punchOut
            ? `https://picsum.photos/300/200?random=${attendanceCount + 1000}`
            : null,
          approvedBy:
            status === "APPROVED"
              ? getRandomElement(
                  managers.filter((m) => m.companyId === user.companyId),
                ).id
              : null,
          approvedAt:
            status === "APPROVED"
              ? addHours(attendanceDate, getRandomInt(1, 8))
              : null,
          rejectionReason:
            status === "REJECTED"
              ? getRandomElement([
                  "Late arrival without valid reason",
                  "Incomplete documentation",
                  "Policy violation",
                  "Unauthorized absence",
                ])
              : null,
        },
      });

      attendanceCount++;

      // Create audit logs
      await prisma.auditLog.create({
        data: {
          userId: user.id,
          action: "CREATED",
          entity: "Attendance",
          entityId: attendance.id,
          meta: {
            attendanceDate: attendanceDate.toISOString(),
            status: attendance.status,
          },
        },
      });

      if (attendance.approvedBy) {
        await prisma.auditLog.create({
          data: {
            userId: attendance.approvedBy,
            action: "APPROVED",
            entity: "Attendance",
            entityId: attendance.id,
            meta: {
              approvedAt: attendance.approvedAt?.toISOString(),
            },
          },
        });
      }
    }
  }
  console.log(`✅ Created ${attendanceCount} attendance records`);

  /* ===============================
     SALARY DATA (Last 6 months)
  =============================== */
  console.log("💰 Creating Salary Data...");
  let salaryCount = 0;

  for (const user of staff) {
    if (user.status !== "ACTIVE") continue;

    // Generate salaries for last 6 months
    for (let month = 0; month < 6; month++) {
      const salaryDate = new Date(
        today.getFullYear(),
        today.getMonth() - month,
        1,
      );
      const monthNumber = salaryDate.getMonth() + 1;
      const yearNumber = salaryDate.getFullYear();

      // Get attendance summary for the month
      const monthStart = new Date(yearNumber, monthNumber - 1, 1);
      const monthEnd = new Date(yearNumber, monthNumber, 0);

      const attendances = await prisma.attendance.findMany({
        where: {
          userId: user.id,
          attendanceDate: {
            gte: monthStart,
            lte: monthEnd,
          },
          status: { in: ["APPROVED", "LEAVE"] },
        },
      });

      const totalDays = attendances.length;
      const approvedDays = attendances.filter(
        (a) => a.status === "APPROVED",
      ).length;
      const workingHours = attendances.reduce(
        (sum, a) => sum + (a.workingHours || 0),
        0,
      );
      const overtimeHours = attendances.reduce(
        (sum, a) => sum + (a.overtimeHours || 0),
        0,
      );
      const lateMinutes = attendances.filter((a) => a.isLate).length * 30; // Assume 30 min late

      // Calculate salary based on type
      let baseAmount = 0;
      let overtimeAmount = 0;
      let penaltyAmount = 0;

      switch (user.salaryType) {
        case "MONTHLY":
          baseAmount = user.baseSalary || 30000;
          break;
        case "HOURLY":
          baseAmount = (user.hourlyRate || 200) * workingHours;
          break;
        case "DAILY":
          baseAmount = (user.dailyRate || 1000) * approvedDays;
          break;
      }

      // Overtime calculation
      if (overtimeHours > 0) {
        const overtimeRate =
          user.overtimeRate || (user.hourlyRate || 200) * 1.5;
        overtimeAmount = overtimeRate * overtimeHours;
      }

      // Penalties
      const company = companies.find((c) => c.id === user.companyId);
      if (company?.enableLatePenalty && lateMinutes > 0) {
        penaltyAmount += lateMinutes * (company.latePenaltyPerMinute || 2);
      }

      const absentDays = Math.max(0, 26 - totalDays); // Assuming 26 working days
      if (company?.enableAbsentPenalty && absentDays > 0) {
        penaltyAmount += absentDays * (company.absentPenaltyPerDay || 500);
      }

      const grossAmount = baseAmount + overtimeAmount;
      const deductions = user.pfEsiApplicable
        ? grossAmount * 0.1275 + grossAmount * 0.0075
        : 0; // PF + ESI
      const netAmount = grossAmount - penaltyAmount - deductions;

      const salary = await prisma.salary.create({
        data: {
          userId: user.id,
          companyId: user.companyId!,
          month: monthNumber,
          year: yearNumber,
          totalWorkingDays: totalDays,
          totalWorkingHours: Math.round(workingHours * 100) / 100,
          overtimeHours: Math.round(overtimeHours * 100) / 100,
          lateMinutes,
          halfDays: attendances.filter((a) => (a.workingHours || 0) < 4).length,
          absentDays,
          baseAmount: Math.round(baseAmount),
          overtimeAmount: Math.round(overtimeAmount),
          penaltyAmount: Math.round(penaltyAmount),
          deductions: Math.round(deductions),
          grossAmount: Math.round(grossAmount),
          netAmount: Math.round(netAmount),
          type: user.salaryType!,
          status: getRandomElement([
            "PENDING",
            "APPROVED",
            "APPROVED",
            "PAID",
          ] as const),
          approvedBy: getRandomElement(
            accountants.filter((a) => a.companyId === user.companyId),
          ).id,
          approvedAt: addDays(salaryDate, getRandomInt(1, 5)),
          paidAt:
            Math.random() > 0.3
              ? addDays(salaryDate, getRandomInt(25, 30))
              : null,
        },
      });

      salaryCount++;

      // Create salary breakdowns
      const breakdowns = [
        {
          type: "BASE_SALARY",
          description: `${user.salaryType} Salary`,
          amount: baseAmount,
          quantity:
            user.salaryType === "MONTHLY"
              ? 1
              : user.salaryType === "DAILY"
                ? approvedDays
                : workingHours,
          hours: null,
        },
      ];

      if (overtimeAmount > 0) {
        breakdowns.push({
          type: "OVERTIME",
          description: "Overtime Pay",
          amount: overtimeAmount,
          hours: overtimeHours,
          quantity: overtimeHours,
        });
      }

      if (penaltyAmount > 0) {
        breakdowns.push({
          type: "LATE_PENALTY",
          description: "Late Arrival Penalty",
          amount: penaltyAmount,
          quantity: lateMinutes,
          hours: null,
        });
      }

      if (deductions > 0) {
        breakdowns.push({
          type: "PF_DEDUCTION",
          description: "Provident Fund",
          amount: deductions * 0.12,
          quantity: 0,
          hours: null,
        });
        breakdowns.push({
          type: "ESI_DEDUCTION",
          description: "Employee State Insurance",
          amount: deductions * 0.0075,
          quantity: 0,
          hours: null,
        });
      }

      for (const breakdown of breakdowns) {
        await prisma.salaryBreakdown.create({
          data: {
            salaryId: salary.id,
            type: breakdown.type,
            description: breakdown.description,
            amount: Math.round(breakdown.amount),
            hours: breakdown.hours || null,
            quantity: breakdown.quantity,
          },
        });
      }

      // Create audit logs
      await prisma.auditLog.create({
        data: {
          userId: user.id,
          action: "CREATED",
          entity: "Salary",
          entityId: salary.id,
          salaryId: salary.id,
          meta: { month: monthNumber, year: yearNumber },
        },
      });
    }
  }
  console.log(`✅ Created ${salaryCount} salary records`);

  /* ===============================
     CORRECTION REQUESTS
  =============================== */
  console.log("📝 Creating Correction Requests...");
  let correctionCount = 0;

  for (const user of staff.slice(0, Math.floor(staff.length * 0.1))) {
    // 10% of staff
    const recentAttendances = await prisma.attendance.findMany({
      where: {
        userId: user.id,
        status: { in: ["PENDING", "REJECTED"] },
      },
      take: 3,
    });

    for (const attendance of recentAttendances) {
      const correction = await prisma.correctionRequest.create({
        data: {
          userId: user.id,
          companyId: user.companyId!,
          attendanceId: attendance.id,
          attendanceDate: attendance.attendanceDate,
          type: getRandomElement(["MISSED_PUNCH_IN", "MISSED_PUNCH_OUT"]),
          reason: getRandomElement([
            "Traffic delay",
            "Medical emergency",
            "System error",
            "Forgot to punch",
            "Network issues",
          ]),
          evidence: `https://picsum.photos/400/300?random=${correctionCount}`,
          status: getRandomElement(["PENDING", "APPROVED", "REJECTED"]),
          reviewedBy: getRandomElement(
            managers.filter((m) => m.companyId === user.companyId),
          ).id,
          reviewedAt: addDays(attendance.attendanceDate, getRandomInt(1, 3)),
        },
      });

      correctionCount++;

      await prisma.auditLog.create({
        data: {
          userId: user.id,
          action: "CREATED",
          entity: "CorrectionRequest",
          entityId: correction.id,
          correctionRequestId: correction.id,
        },
      });
    }
  }
  console.log(`✅ Created ${correctionCount} correction requests`);

  /* ===============================
     NOTIFICATIONS
  =============================== */
  console.log("🔔 Creating Notifications...");
  let notificationCount = 0;

  const notificationTemplates = [
    {
      title: "Welcome to PagarBook",
      message: "Your account has been activated successfully!",
      channel: "INAPP",
    },
    {
      title: "Attendance Reminder",
      message: "Don't forget to punch out before leaving!",
      channel: "PUSH",
    },
    {
      title: "Salary Processed",
      message: "Your salary for this month has been processed.",
      channel: "EMAIL",
    },
    {
      title: "Late Arrival",
      message: "You were marked late today. Please maintain punctuality.",
      channel: "INAPP",
    },
    {
      title: "Overtime Approved",
      message: "Your overtime hours have been approved.",
      channel: "INAPP",
    },
    {
      title: "Leave Request",
      message: "Your leave request has been submitted for approval.",
      channel: "INAPP",
    },
    {
      title: "System Maintenance",
      message: "Scheduled maintenance tonight from 11 PM to 1 AM.",
      channel: "EMAIL",
    },
  ];

  for (const user of users) {
    const notificationCountForUser = getRandomInt(1, 5);
    for (let i = 0; i < notificationCountForUser; i++) {
      const template = getRandomElement(notificationTemplates);
      await prisma.notification.create({
        data: {
          userId: user.id,
          companyId: user.companyId || companies[0].id,
          title: template.title,
          message: template.message,
          channel: template.channel as any,
          status: getRandomElement(["SENT", "SENT", "PENDING"]),
          meta: {
            priority: getRandomElement(["LOW", "MEDIUM", "HIGH"]),
            category: getRandomElement([
              "GENERAL",
              "ATTENDANCE",
              "SALARY",
              "SYSTEM",
            ]),
          },
        },
      });
      notificationCount++;
    }
  }
  console.log(`✅ Created ${notificationCount} notifications`);

  /* ===============================
     SYSTEM SETTINGS
  =============================== */
  console.log("⚙️ Creating System Settings...");
  const systemSettings = [
    {
      category: "platform",
      key: "maintenance_mode",
      value: "false",
      description: "Enable maintenance mode",
    },
    {
      category: "platform",
      key: "max_file_size",
      value: "10485760",
      description: "Maximum file upload size in bytes",
    },
    {
      category: "notifications",
      key: "email_rate_limit",
      value: "100",
      description: "Emails per hour limit",
    },
    {
      category: "security",
      key: "session_timeout",
      value: "3600000",
      description: "Session timeout in milliseconds",
    },
    {
      category: "features",
      key: "enable_biometric",
      value: "true",
      description: "Enable biometric authentication",
    },
    {
      category: "features",
      key: "enable_geofencing",
      value: "true",
      description: "Enable GPS-based attendance",
    },
  ];

  for (const setting of systemSettings) {
    await prisma.systemSetting.create({
      data: setting,
    });
  }
  console.log("✅ System settings created");

  /* ===============================
     PUSH SUBSCRIPTIONS & OTP
  =============================== */
  console.log("📱 Creating Push Subscriptions and OTPs...");

  // Push subscriptions for some users
  for (const user of users.slice(0, Math.floor(users.length * 0.3))) {
    // 30% have push subscriptions
    await prisma.pushSubscription.create({
      data: {
        userId: user.id,
        endpoint: `https://fcm.googleapis.com/fcm/send/demo-${user.id}`,
        p256dh: `demo-p256dh-${user.id}`,
        auth: `demo-auth-${user.id}`,
      },
    });
  }

  // OTP entries
  for (const user of users.slice(0, Math.floor(users.length * 0.1))) {
    // 10% have active OTPs
    await prisma.otp.create({
      data: {
        phone: user.phone,
        otp: getRandomInt(100000, 999999).toString(),
        purpose: getRandomElement(["LOGIN", "VERIFY_PHONE", "RESET_PASSWORD"]),
        expiresAt: addMinutes(new Date(), getRandomInt(1, 10)),
        isUsed: Math.random() > 0.8,
      },
    });
  }

  console.log("✅ Push subscriptions and OTPs created");

  /* ===============================
     FINAL SUMMARY
  =============================== */
  console.log("\n🎉 COMPREHENSIVE SEED COMPLETED SUCCESSFULLY!");
  console.log("📊 DATA SUMMARY:");
  console.log(`   • ${companies.length} Companies`);
  console.log(
    `   • ${users.length} Users (${admins.length} admins, ${managers.length} managers, ${accountants.length} accountants, ${staff.length} staff)`,
  );
  console.log(`   • ${attendanceCount} Attendance Records`);
  console.log(`   • ${salaryCount} Salary Records`);
  console.log(`   • ${correctionCount} Correction Requests`);
  console.log(`   • ${notificationCount} Notifications`);

  console.log("\n🔑 LOGIN CREDENTIALS:");
  console.log("Super Admin → superadmin@pagarbook.com / superadmin123");
  console.log("Admin → admin1@techcorpsolutions.com / admin123");
  console.log("Manager → manager1.company1@techcorpsolutions.com / manager123");
  console.log(
    "Accountant → accountant1.company1@techcorpsolutions.com / accountant123",
  );
  console.log("Staff → staff1.company1@techcorpsolutions.com / staff123");

  console.log("\n💡 TESTING TIPS:");
  console.log("• Use different companies to test multi-tenancy");
  console.log("• Check attendance patterns for realistic data");
  console.log("• Test salary calculations with different types");
  console.log("• Verify approval workflows across roles");
  console.log("• Test notifications and audit trails");
}

// Helper function for minutes
function addMinutes(date: Date, minutes: number): Date {
  return new Date(date.getTime() + minutes * 60000);
}

main()
  .catch((e) => {
    console.error("❌ Seed failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
