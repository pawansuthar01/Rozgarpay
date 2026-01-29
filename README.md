# payrollbook - Complete Payroll & Attendance Management System

A modern, mobile-first SaaS application for managing employee attendance, payroll, and salary calculations with GPS tracking and automated reporting.

## 📋 Table of Contents

- [Overview](#overview)
- [Key Features](#key-features)
- [System Architecture](#system-architecture)
- [Attendance Management](#attendance-management)
- [Salary Management](#salary-management)
- [Reports & Analytics](#reports--analytics)
- [User Roles & Permissions](#user-roles--permissions)
- [Setup & Installation](#setup--installation)
- [API Documentation](#api-documentation)
- [Troubleshooting](#troubleshooting)

## 🎯 Overview

payrollbook is a comprehensive payroll and attendance management system designed for small to medium businesses. It combines GPS-based attendance tracking with automated salary calculations, providing real-time insights into workforce management.

### Core Philosophy

- **Simple to Use**: Intuitive mobile-first interface
- **Accurate Tracking**: GPS and photo verification for attendance
- **Flexible Salary Management**: Support for advances, deductions, and recoveries
- **Real-time Reports**: Instant access to attendance and salary data

## ✨ Key Features

### 📍 Attendance Tracking

- GPS-based location verification
- Photo capture for attendance proof
- Automatic punch-in/punch-out detection
- Night shift support
- Mobile and web access

### 💰 Salary Management

- Automated salary calculations
- Advance payments and recoveries
- Deductions and adjustments
- Multi-currency support
- Salary history tracking

### 📊 Reports & Analytics

- Real-time attendance reports
- Salary payment tracking
- Monthly/quarterly analytics
- Export capabilities (PDF, Excel)
- Custom date range filtering

### 👥 User Management

- Role-based access control
- Company-based isolation
- Employee onboarding
- Profile management

## 🏗️ System Architecture

### Technology Stack

- **Frontend**: Next.js 14, React, TypeScript, Tailwind CSS
- **Backend**: Next.js API Routes
- **Database**: PostgreSQL with Prisma ORM
- **Authentication**: NextAuth.js
- **Deployment**: Vercel/Netlify ready

### Database Schema

- **Users**: Employee profiles with role-based access
- **Companies**: Multi-tenant company isolation
- **Attendance**: GPS-tracked attendance records
- **Salary**: Monthly salary calculations and breakdowns
- **Payments**: Salary payments, advances, recoveries
- **Reports**: Generated reports and analytics

## 📍 Attendance Management

### How Attendance Tracking Works

#### 1. **Employee Punch-In Process**

```
1. Employee opens payrollbook mobile app
2. Clicks "Punch In" button
3. App captures GPS coordinates
4. App takes photo for verification
5. Attendance record created with timestamp
6. Location and photo stored for audit trail
```

#### 2. **Automatic Features**

- **Auto Punch-Out**: Configurable after-hours punch-out
- **Location Validation**: GPS radius checking
- **Photo Verification**: Facial recognition ready
- **Night Shift Support**: Overnight attendance tracking

#### 3. **Attendance States**

- **Present**: Successfully punched in/out
- **Absent**: No attendance record for the day
- **Late**: Punched in after configured time
- **Half Day**: Partial attendance
- **Pending**: Awaiting approval

#### 4. **GPS Tracking Details**

```typescript
interface AttendanceRecord {
  id: string;
  userId: string;
  punchInTime: Date;
  punchOutTime?: Date;
  punchInLocation: {
    latitude: number;
    longitude: number;
    accuracy: number;
  };
  punchOutLocation?: {
    latitude: number;
    longitude: number;
    accuracy: number;
  };
  punchInPhoto: string; // Base64 image
  punchOutPhoto?: string;
  status: "PRESENT" | "ABSENT" | "LATE" | "HALF_DAY";
  totalHours: number;
}
```

### Attendance Rules Configuration

#### Night Shift Rules

```json
{
  "nightShiftStart": "22:00",
  "nightShiftEnd": "06:00",
  "autoPunchOutEnabled": true,
  "autoPunchOutTime": "06:30",
  "locationRadius": 100, // meters
  "requirePhoto": true
}
```

#### Regular Shift Rules

```json
{
  "workStartTime": "09:00",
  "workEndTime": "18:00",
  "gracePeriod": 15, // minutes
  "halfDayThreshold": 4, // hours
  "locationRadius": 50,
  "requirePhoto": true
}
```

## 💰 Salary Management

### Salary Calculation Flow

#### 1. **Monthly Salary Generation**

```
1. System runs cron job on 1st of each month
2. Fetches attendance data for previous month
3. Calculates working days and hours
4. Applies salary rules and formulas
5. Creates salary record with breakdowns
6. Generates payable amount
```

#### 2. **Salary Components**

##### Base Salary Calculation

```typescript
// Basic salary calculation
const baseSalary = (monthlySalary / totalWorkingDays) * actualWorkingDays;

// Example: ₹30,000 monthly salary, 22 working days
// Employee worked 20 days = ₹27,272.73
```

##### Salary Breakdown Structure

```typescript
interface SalaryBreakdown {
  id: string;
  salaryId: string;
  type: "BASE" | "PAYMENT" | "DEDUCTION" | "RECOVERY" | "ADVANCE";
  description: string;
  amount: number; // Positive for earnings, negative for deductions
  date: Date;
}
```

#### 3. **Payment Types**

##### Company Pays Staff (Earnings)

- **Base Salary**: Regular monthly salary
- **Overtime**: Extra hours worked
- **Bonus**: Performance incentives
- **Advance**: Salary advance payments

##### Staff Pays Company (Deductions/Recoveries)

- **Advance Recovery**: Repayment of salary advances
- **Loan Recovery**: Company loan repayments
- **Deductions**: Fines, penalties, or adjustments
- **Overpayments**: Corrections for excess payments

#### 4. **Salary Status Flow**

```
PENDING → APPROVED → PAID
    ↓        ↓        ↓
REJECTED  REJECTED  MARKED_PAID
```

### Salary Rules Engine

#### Attendance-Based Salary

```typescript
const calculateSalary = (attendanceData, salaryRules) => {
  const { monthlySalary, overtimeRate, leaveDeductions } = salaryRules;

  // Calculate base salary
  const workingDays = attendanceData.filter(
    (day) => day.status === "PRESENT",
  ).length;
  const baseAmount = (monthlySalary / 22) * workingDays; // Assuming 22 working days

  // Calculate overtime
  const overtimeHours = attendanceData.reduce(
    (total, day) => total + (day.totalHours - 8 > 0 ? day.totalHours - 8 : 0),
    0,
  );
  const overtimeAmount = overtimeHours * overtimeRate;

  // Apply deductions
  const absentDays = attendanceData.filter(
    (day) => day.status === "ABSENT",
  ).length;
  const deductionAmount = absentDays * (monthlySalary / 22);

  return {
    grossAmount: baseAmount + overtimeAmount,
    netAmount: baseAmount + overtimeAmount - deductionAmount,
    breakdowns: [
      { type: "BASE", amount: baseAmount, description: "Base Salary" },
      { type: "OVERTIME", amount: overtimeAmount, description: "Overtime Pay" },
      {
        type: "DEDUCTION",
        amount: -deductionAmount,
        description: "Absent Deductions",
      },
    ],
  };
};
```

## 📊 Reports & Analytics

### Report Types

#### 1. **Attendance Reports**

- **Daily Attendance**: Individual day attendance
- **Monthly Summary**: Monthly attendance overview
- **Employee-wise**: Individual employee attendance
- **Department-wise**: Team attendance analytics

#### 2. **Salary Reports**

- **Salary Register**: Complete salary details
- **Payment History**: Payment tracking
- **Advance Reports**: Advance and recovery tracking
- **Tax Reports**: Tax calculation reports

#### 3. **Analytics Dashboard**

- **Attendance Trends**: Monthly attendance patterns
- **Salary Distribution**: Salary range analytics
- **Payment Analytics**: Payment timing and amounts
- **Productivity Metrics**: Hours worked vs. productivity

### Report Generation Process

#### Monthly Attendance Report

```typescript
const generateAttendanceReport = async (month, year, companyId) => {
  // Fetch all attendance records for the month
  const attendanceRecords = await prisma.attendance.findMany({
    where: {
      companyId,
      attendanceDate: {
        gte: new Date(year, month - 1, 1),
        lt: new Date(year, month, 1),
      },
    },
    include: { user: true },
  });

  // Group by employee
  const employeeReports = attendanceRecords.reduce((acc, record) => {
    const employeeId = record.userId;
    if (!acc[employeeId]) {
      acc[employeeId] = {
        employee: record.user,
        records: [],
        summary: {
          present: 0,
          absent: 0,
          late: 0,
          totalHours: 0,
        },
      };
    }

    acc[employeeId].records.push(record);
    acc[employeeId].summary.present += record.status === "PRESENT" ? 1 : 0;
    acc[employeeId].summary.absent += record.status === "ABSENT" ? 1 : 0;
    acc[employeeId].summary.late += record.status === "LATE" ? 1 : 0;
    acc[employeeId].summary.totalHours += record.totalHours || 0;

    return acc;
  }, {});

  return {
    month,
    year,
    generatedAt: new Date(),
    employeeReports: Object.values(employeeReports),
  };
};
```

## 👥 User Roles & Permissions

### Role Hierarchy

#### 1. **Super Admin**

- Full system access
- Company creation and management
- System configuration
- User across all companies

#### 2. **Company Admin**

- Company-specific access
- Employee management
- Salary and attendance oversight
- Report generation

#### 3. **Manager**

- Team management
- Attendance approval
- Limited salary access
- Department reports

#### 4. **Staff**

- Personal attendance tracking
- Salary viewing
- Personal reports
- Limited profile editing

### Permission Matrix

| Feature          | Super Admin | Company Admin | Manager | Staff  |
| ---------------- | ----------- | ------------- | ------- | ------ |
| View Attendance  | ✅ All      | ✅ Company    | ✅ Team | ✅ Own |
| Edit Attendance  | ✅ All      | ✅ Company    | ✅ Team | ❌     |
| Manage Salary    | ✅ All      | ✅ Company    | ❌      | ❌     |
| Generate Reports | ✅ All      | ✅ Company    | ✅ Team | ✅ Own |
| User Management  | ✅ All      | ✅ Company    | ❌      | ❌     |

## 🚀 Setup & Installation

### Prerequisites

- Node.js 18+
- PostgreSQL 13+
- Redis (optional, for caching)

### Installation Steps

#### 1. Clone Repository

```bash
git clone https://github.com/your-org/payrollbook.git
cd payrollbook
```

#### 2. Install Dependencies

```bash
npm install
```

#### 3. Environment Configuration

```bash
cp .env.example .env.local
```

Edit `.env.local`:

```env
DATABASE_URL="postgresql://username:password@localhost:5432/payrollbook"
NEXTAUTH_SECRET="your-secret-key"
NEXTAUTH_URL="http://localhost:3000"
GOOGLE_MAPS_API_KEY="your-google-maps-key"
```

#### 4. Database Setup

```bash
npx prisma generate
npx prisma db push
npx prisma db seed
```

#### 5. Run Development Server

```bash
npm run dev
```

#### 6. Access Application

- **Web App**: http://localhost:3000
- **Admin Panel**: http://localhost:3000/admin
- **Staff Portal**: http://localhost:3000/staff

### Production Deployment

#### Environment Variables for Production

```env
DATABASE_URL="postgresql://prod-url"
NEXTAUTH_SECRET="secure-random-secret"
NEXTAUTH_URL="https://your-domain.com"
GOOGLE_MAPS_API_KEY="prod-api-key"
NODE_ENV="production"
```

#### Build and Deploy

```bash
npm run build
npm start
```

## 📡 API Documentation

This section provides comprehensive documentation for all API endpoints, including request/response schemas, authentication requirements, error handling, and usage examples.

### Authentication

All API endpoints require authentication via NextAuth.js session. Include the session token in requests. Role-based access control is enforced on most endpoints.

**Authentication Methods:**

- Session-based authentication via NextAuth.js
- Role-based permissions (SUPER_ADMIN, ADMIN, MANAGER, STAFF)

**Common Error Responses:**

```json
{
  "error": "Unauthorized",
  "status": 401
}
```

### User Management Endpoints

#### GET /api/admin/users

**Description:** Retrieve paginated list of users for admin's company
**Auth Required:** ADMIN
**Query Parameters:**

- `page` (number, default: 1)
- `limit` (number, default: 10)
- `role` (string, optional)
- `status` (string, optional)
- `search` (string, optional)

**Response:**

```json
{
  "users": [
    {
      "id": "string",
      "email": "string",
      "firstName": "string",
      "lastName": "string",
      "phone": "string",
      "role": "ADMIN|MANAGER|STAFF",
      "status": "ACTIVE|INACTIVE",
      "createdAt": "2024-01-01T00:00:00.000Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 50,
    "totalPages": 5
  }
}
```

**Error Handling:**

- 401: Unauthorized
- 400: Admin company not found
- 500: Internal server error

**Example:**

```bash
GET /api/admin/users?page=1&limit=10&role=STAFF
```

#### POST /api/admin/users/invite

**Description:** Send invitation to join company
**Auth Required:** ADMIN
**Request Body:**

```json
{
  "name": "string",
  "email": "string",
  "phone": "string (optional)",
  "role": "ADMIN|MANAGER|STAFF",
  "sendWelcome": "boolean (optional)"
}
```

**Response:**

```json
{
  "message": "Invitation sent successfully",
  "inviteLink": "https://app.com/join/abc123...",
  "invitation": {
    "id": "string",
    "email": "string",
    "role": "string",
    "expiresAt": "2024-01-08T00:00:00.000Z"
  }
}
```

**Error Handling:**

- 401: Unauthorized
- 400: Missing required fields / User exists / Active invitation exists
- 500: Internal server error

### Attendance Endpoints

#### POST /api/attendance/punch

**Description:** Record attendance punch (in/out)
**Auth Required:** STAFF
**Request Body:**

```json
{
  "type": "IN" | "OUT",
  "latitude": "number",
  "longitude": "number",
  "photo": "string (base64)"
}
```

**Response:**

```json
{
  "attendanceId": "string",
  "status": "string",
  "timestamp": "2024-01-01T09:00:00.000Z"
}
```

#### GET /api/attendance/today

**Description:** Get today's attendance status
**Auth Required:** STAFF

**Response:**

```json
{
  "hasPunchedIn": true,
  "hasPunchedOut": false,
  "punchInTime": "2024-01-01T09:00:00.000Z",
  "punchOutTime": null,
  "totalHours": 4.5
}
```

#### GET /api/admin/attendance

**Description:** Get attendance records for admin's company
**Auth Required:** ADMIN
**Query Parameters:** page, limit, userId, date, status

**Response:** Paginated attendance records

#### PUT /api/admin/attendance/{attendanceId}/update

**Description:** Update attendance record
**Auth Required:** ADMIN
**Request Body:**

```json
{
  "punchInTime": "2024-01-01T09:00:00.000Z",
  "punchOutTime": "2024-01-01T18:00:00.000Z",
  "status": "PRESENT|ABSENT|LATE|HALF_DAY"
}
```

### Salary Management Endpoints

#### POST /api/admin/salary/generate

**Description:** Generate monthly salaries for all users
**Auth Required:** ADMIN
**Request Body:**

```json
{
  "month": 1,
  "year": 2024,
  "companyId": "string"
}
```

**Response:**

```json
{
  "success": true,
  "generatedCount": 25,
  "errors": []
}
```

#### GET /api/admin/salary

**Description:** Get salary records
**Auth Required:** ADMIN
**Query Parameters:** page, limit, userId, month, year, status

#### POST /api/admin/salary/{salaryId}/approve

**Description:** Approve salary
**Auth Required:** ADMIN

#### POST /api/admin/users/{userId}/add-payment

**Description:** Add payment/advance to user
**Auth Required:** ADMIN
**Request Body:**

```json
{
  "amount": 5000,
  "reason": "Monthly Advance",
  "paymentDate": "2024-01-01"
}
```

**Response:**

```json
{
  "paymentId": "string",
  "newBalance": 5000
}
```

### Cashbook Endpoints

#### GET /api/admin/cashbook

**Description:** Get cashbook entries
**Auth Required:** ADMIN
**Query Parameters:** page, limit, type, dateFrom, dateTo

**Response:** Paginated cashbook entries

#### POST /api/admin/cashbook

**Description:** Create cashbook entry
**Auth Required:** ADMIN
**Request Body:**

```json
{
  "type": "INCOME|EXPENSE",
  "amount": 1000,
  "description": "Office supplies",
  "date": "2024-01-01"
}
```

### Notification Endpoints

#### GET /api/admin/notifications

**Description:** Get notifications
**Auth Required:** ADMIN

#### GET /api/staff/notifications

**Description:** Get staff notifications
**Auth Required:** STAFF

### OTP Endpoints

#### POST /api/otp/verify

**Description:** Verify OTP
**Request Body:**

```json
{
  "phone": "string",
  "otp": "string",
  "purpose": "LOGIN|RESET_PASSWORD|VERIFICATION"
}
```

### Super Admin Endpoints

#### GET /api/super-admin/companies

**Description:** Get all companies
**Auth Required:** SUPER_ADMIN

#### POST /api/super-admin/companies

**Description:** Create new company
**Auth Required:** SUPER_ADMIN

#### GET /api/super-admin/users

**Description:** Get all users across companies
**Auth Required:** SUPER_ADMIN

### Manager Endpoints

#### GET /api/manager/attendance

**Description:** Get attendance for managed staff
**Auth Required:** MANAGER

#### POST /api/manager/salary/{salaryId}/approve

**Description:** Approve salary
**Auth Required:** MANAGER

### Staff Endpoints

#### GET /api/staff/dashboard

**Description:** Get staff dashboard data
**Auth Required:** STAFF

#### GET /api/staff/salary

**Description:** Get staff salary records
**Auth Required:** STAFF

#### POST /api/staff/correction-requests

**Description:** Request attendance correction
**Auth Required:** STAFF

### Error Handling

All endpoints follow consistent error response format:

```json
{
  "error": "Error message",
  "status": 400
}
```

**Common HTTP Status Codes:**

- 200: Success
- 201: Created
- 400: Bad Request
- 401: Unauthorized
- 403: Forbidden
- 404: Not Found
- 500: Internal Server Error

### Rate Limiting

API endpoints are rate-limited to prevent abuse. Limits vary by endpoint complexity.

### Data Validation

All input data is validated using server-side validation. Invalid data returns 400 status with detailed error messages.

### Usage Examples

#### JavaScript (fetch)

```javascript
// Get users
const response = await fetch("/api/admin/users?page=1&limit=10", {
  headers: {
    Authorization: `Bearer ${token}`,
  },
});
const data = await response.json();
```

#### cURL

```bash
# Get attendance
curl -X GET "http://localhost:3000/api/admin/attendance?page=1" \
  -H "Authorization: Bearer your-token"
```

#### Python (requests)

```python
import requests

response = requests.get('/api/admin/users', headers={'Authorization': f'Bearer {token}'})
data = response.json()
```

## 🔧 Troubleshooting

### Common Issues

#### 1. GPS Location Not Working

**Problem**: Attendance not recording location
**Solution**:

- Check app permissions for location access
- Ensure GPS is enabled on device
- Verify location accuracy settings

#### 2. Salary Calculations Incorrect

**Problem**: Salary amounts don't match expectations
**Solution**:

- Verify attendance records are accurate
- Check salary rules configuration
- Review breakdown calculations in database

#### 3. Reports Not Generating

**Problem**: Report generation fails
**Solution**:

- Check database connectivity
- Verify user permissions
- Review error logs for specific issues

#### 4. Mobile App Crashes

**Problem**: App crashes on certain devices
**Solution**:

- Update to latest app version
- Clear app cache and data
- Check device compatibility

### Performance Optimization

#### Database Indexes

```sql
-- Critical indexes for performance
CREATE INDEX idx_attendance_user_date ON attendance(userId, attendanceDate);
CREATE INDEX idx_salary_user_month ON salary(userId, month, year);
CREATE INDEX idx_payments_user_date ON salaryBreakdown(salaryId, type);
```

#### Caching Strategy

- Redis for session storage
- Database query result caching
- Static asset optimization

### Monitoring & Logging

#### Key Metrics to Monitor

- Attendance punch success rate
- Salary calculation processing time
- API response times
- Database query performance
- User authentication success rate

#### Log Analysis

```bash
# Check application logs
tail -f logs/application.log

# Database query analysis
EXPLAIN ANALYZE SELECT * FROM attendance WHERE userId = $1;
```

## 📞 Support & Contributing

### Getting Help

- **Documentation**: Check this README first
- **Issues**: GitHub Issues for bug reports
- **Discussions**: GitHub Discussions for questions
- **Email**: support@payrollbook.com

### Contributing Guidelines

1. Fork the repository
2. Create feature branch
3. Make changes with tests
4. Submit pull request
5. Code review and merge

### Development Commands

```bash
# Run tests
npm test

# Run linting
npm run lint

# Format code
npm run format

# Type checking
npm run type-check
```

---

**payrollbook** - Making payroll simple, accurate, and transparent for businesses worldwide.
