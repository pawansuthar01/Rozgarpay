# Rozgarpay - Payroll & Attendance Management System

A comprehensive, production-ready payroll and attendance management system built with Next.js 14, TypeScript, Prisma, and PostgreSQL.

## 📋 Table of Contents

- [Project Overview](#project-overview)
- [Production Readiness Status](#production-readiness-status)
- [Features Implemented](#features-implemented)
- [What Needs Work](#what-needs-work)
- [Technology Stack](#technology-stack)
- [Getting Started](#getting-started)
- [Project Structure](#project-structure)
- [API Documentation](#api-documentation)
- [Database Schema](#database-schema)
- [Deployment Guide](#deployment-guide)

---

## 🎯 Project Overview

**Rozgarpay** is a complete HR management solution featuring:

- GPS-based attendance tracking with photo verification
- Automated salary calculations
- Multi-role access control (Super Admin, Admin, Manager, Staff)
- Real-time notifications
- Comprehensive reporting
- Cashbook management

**Note**: This system uses **phone numbers** as the primary identifier for authentication and contact. Email is optional and not used for authentication.

---

## ✅ Production Readiness Status

### 🚀 PRODUCTION READY (Ready for Deployment)

#### 1. **Authentication System** ✅ COMPLETE

- [x] Phone-based login with password (primary method)
- [x] OTP-based authentication via phone
- [x] Role-based access control (RBAC)
- [x] Session management with NextAuth.js
- [x] JWT token strategy
- [x] Password hashing with bcrypt
- [x] Login page with mobile-first design
- [x] Middleware for route protection
- [x] **Email NOT required** - phone number is primary identifier

#### 2. **Admin Dashboard** ✅ COMPLETE

- [x] Stats cards (staff count, attendance, salary, cashbook)
- [x] Recent activity feed
- [x] Quick actions panel
- [x] Responsive design
- [x] Error handling with reload option
- [x] Loading states with skeletons

#### 3. **Attendance Management** ✅ COMPLETE

- [x] GPS-based punch in/out
- [x] Photo capture for verification
- [x] Location tracking and validation
- [x] Automatic working hours calculation
- [x] Overtime tracking
- [x] Late arrival detection
- [x] Status management (Pending, Approved, Rejected, Absent, Leave)
- [x] Attendance approval workflow
- [x] Missing attendance check
- [x] Pagination and filtering
- [x] Charts and analytics

#### 4. **User Management** ✅ COMPLETE

- [x] User listing with pagination
- [x] Search functionality
- [x] Status filtering (Active, Suspended, Deactivated)
- [x] User profile management
- [x] User invitations via token
- [x] Role-based user types (Admin, Manager, Accountant, Staff)
- [x] Bulk actions support
- [x] Phone number as primary identifier

#### 5. **Salary Management** ✅ COMPLETE

- [x] Salary setup for employees
- [x] Multiple salary types (Monthly, Daily, Hourly)
- [x] PF/ESI configuration
- [x] Overtime rate setup
- [x] Working days configuration
- [x] Salary generation for month
- [x] Salary approval workflow
- [x] Salary rejection with reasons
- [x] Salary breakdown (Base, Overtime, Deductions, etc.)
- [x] Payment tracking
- [x] Recovery management
- [x] PDF salary slip generation
- [x] Salary reports

#### 6. **Cashbook Management** ✅ COMPLETE

- [x] Income/Expense tracking
- [x] Multiple transaction types
- [x] Payment mode selection (Cash, Bank, UPI, Cheque)
- [x] Transaction reversal capability
- [x] Balance calculation
- [x] Reports generation
- [x] Filtering and search

#### 7. **Correction Requests** ✅ COMPLETE

- [x] Missed punch requests
- [x] Attendance correction requests
- [x] Leave requests
- [x] Salary requests
- [x] Admin review workflow
- [x] Evidence attachment support

#### 8. **Notifications System** ✅ COMPLETE

- [x] In-app notifications
- [x] Notification templates
- [x] Notification queue system
- [x] Phone-based OTP delivery
- [x] Notification preferences

#### 9. **Reports & Analytics** ✅ COMPLETE

- [x] Attendance reports
- [x] Salary reports
- [x] User-wise reports
- [x] Date range filtering
- [x] Export capabilities
- [x] Charts and visualizations

#### 10. **API Routes** ✅ COMPLETE

- [x] Admin API routes (users, attendance, salary, cashbook, etc.)
- [x] Staff API routes (dashboard, attendance, salary, etc.)
- [x] Manager API routes
- [x] Super Admin API routes
- [x] Auth API routes
- [x] OTP API routes
- [x] Proper error handling
- [x] Response caching headers
- [x] Input validation

#### 11. **Database Schema** ✅ COMPLETE

- [x] User model with phone as primary identifier
- [x] Company model with settings
- [x] Attendance model with GPS data
- [x] Salary model with breakdowns
- [x] Cashbook entry model
- [x] Notification model
- [x] Audit log model
- [x] Correction request model
- [x] Proper indexes for performance
- [x] Enums for fixed values
- [x] Relations between models

#### 12. **PDF Generation** ✅ COMPLETE

- [x] Salary slip PDF generation
- [x] Attendance PDF generation
- [x] Cashbook PDF generation
- [x] Phone number displayed (not email)
- [x] Professional formatting with tables
- [x] Financial summary cards
- [x] Indian Rupee (₹) currency format
- [x] Confidential marking

**PDF Features**:

- Professional salary reports with financial summaries
- Detailed attendance records with working hours
- Support for multiple payment types (Cash, Bank, UPI, Cheque)
- **Phone-only contact information** in all generated PDFs

#### 13. **Frontend Components** ✅ COMPLETE

- [x] Reusable UI components (Card, Input, Button, Modal, etc.)
- [x] Admin-specific components
- [x] Staff-specific components
- [x] Charts and statistics
- [x] Forms with validation
- [x] Tables with pagination
- [x] Loading states
- [x] Error boundaries

#### 14. **Performance Optimization** ✅ COMPLETE

- [x] React Query integration
- [x] Query key factory
- [x] Stale time configuration
- [x] Persistent caching
- [x] Optimistic updates
- [x] Web Workers for IndexedDB
- [x] Performance monitoring
- [x] Database connection pooling

#### 15. **Infrastructure** ✅ COMPLETE

- [x] PWA support with service workers
- [x] Offline storage with IndexedDB
- [x] Cloudinary integration for images
- [x] Email support with Resend (optional)
- [x] Phone-based OTP via SMS provider

---

### ⚠️ NEEDS ATTENTION (Partially Complete)

#### 1. **Manager Portal** ⚠️ PARTIAL

- [x] Dashboard page
- [x] Attendance management
- [x] Team management
- [x] Reports
- [x] Salary approval
- [ ] Notification preferences
- [ ] Profile management improvements

**Status**: Core functionality exists but may need UI polishing

#### 2. **Super Admin Portal** ⚠️ PARTIAL

- [x] Dashboard
- [x] Company management
- [x] Admin management
- [x] Audit logs
- [x] Invitations
- [x] Reports
- [ ] Settings management
- [ ] Platform analytics

**Status**: Core functionality exists but limited features

#### 3. **Email/WhatsApp Notifications** ⚠️ INFRASTRUCTURE READY

- [x] Notification templates
- [x] Provider integration (Resend for email - optional)
- [x] Queue system
- [x] Logging
- [ ] WhatsApp API integration (requires provider setup)
- [ ] SMS provider integration (requires provider setup)
- [ ] Push notification setup

**Status**: Phone-based notifications are primary; email is optional

---

### ❌ NOT IMPLEMENTED (Needs Development)

#### 1. **Testing Suite** ❌ NOT STARTED

**Current Status**:

- Jest configuration exists in `jest.config.js`
- Test setup exists in `jest.setup.js`
- **ZERO test files found in the project**
- No unit tests
- No integration tests
- No E2E tests
- No performance tests

**Test Infrastructure Details**:

```javascript
// jest.config.js
- Next.js Jest integration
- Coverage collection enabled
- Module alias mapping (@/) configured
- Test patterns: __tests__/**/*, *.test.*, *.spec.*
```

**Required Test Coverage**:

- [ ] Authentication flow tests
- [ ] Attendance API tests
- [ ] Salary calculation tests
- [ ] User management tests
- [ ] API route integration tests
- [ ] Component rendering tests
- [ ] Hook functionality tests

**Priority**: HIGH - Recommended before production

#### 2. **Advanced Reports** ❌ NOT STARTED

- [ ] Tax reports
- [ ] PF/ESI reports
- [ ] Custom report builder
- [ ] Scheduled reports
- [ ] Report email delivery

**Priority**: MEDIUM - Can be added post-launch

#### 3. **Leave Management** ❌ NOT STARTED

- [x] Leave requests (via correction requests)
- [ ] Leave policy configuration
- [ ] Leave balance tracking
- [ ] Leave approval workflow
- [ ] Leave calendar view

**Priority**: MEDIUM - Basic leave exists, full module needed

#### 4. **Expense Management** ❌ NOT STARTED

- [ ] Expense submission
- [ ] Expense approval
- [ ] Expense categories
- [ ] Expense limits

**Priority**: LOW - Can be added later

#### 5. **Chat/Messaging** ❌ NOT STARTED

- [ ] Staff-admin messaging
- [ ] Announcement system
- [ ] In-app chat

**Priority**: LOW - Not essential for core functionality

#### 6. **Multi-language Support** ❌ NOT STARTED

- [ ] i18n integration
- [ ] Hindi language support
- [ ] Other regional languages

**Priority**: LOW - Can be added later

---

## 📊 Feature Summary

| Category                     | Status            | Completion |
| ---------------------------- | ----------------- | ---------- |
| Authentication (Phone-based) | ✅ Complete       | 100%       |
| Admin Dashboard              | ✅ Complete       | 100%       |
| Staff Portal                 | ✅ Complete       | 100%       |
| Attendance                   | ✅ Complete       | 100%       |
| User Management              | ✅ Complete       | 100%       |
| Salary                       | ✅ Complete       | 100%       |
| Cashbook                     | ✅ Complete       | 100%       |
| Reports                      | ✅ Complete       | 100%       |
| Notifications (Phone-based)  | ✅ Complete       | 100%       |
| API Routes                   | ✅ Complete       | 100%       |
| Database (Phone-focused)     | ✅ Complete       | 100%       |
| PDF Generation (Phone-only)  | ✅ Complete       | 100%       |
| Performance                  | ✅ Complete       | 100%       |
| Manager Portal               | ⚠️ Partial        | 80%        |
| Super Admin                  | ⚠️ Partial        | 70%        |
| WhatsApp/SMS                 | ⚠️ Infrastructure | 40%        |
| Testing                      | ❌ Not Started    | 0%         |
| Advanced Reports             | ❌ Not Started    | 0%         |
| Leave Management             | ❌ Not Started    | 30%        |
| Multi-language               | ❌ Not Started    | 0%         |

---

## 🛠 Technology Stack

### Frontend

- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **UI Components**: Custom components + Lucide Icons
- **Charts**: Recharts
- **State Management**: TanStack Query (React Query)
- **Forms**: React Hook Form (via hooks)

### Backend

- **Framework**: Next.js API Routes
- **Database**: PostgreSQL
- **ORM**: Prisma
- **Authentication**: NextAuth.js (Phone-based)
- **Cron Jobs**: node-cron

### Infrastructure

- **File Storage**: Cloudinary
- **SMS/OTP**: Phone-based OTP system
- **Email**: Resend (optional)
- **Database Hosting**: PostgreSQL (Neon, Railway, etc.)

### Development

- **Package Manager**: npm
- **Testing**: Jest (configured, no tests written)
- **Code Quality**: TypeScript strict mode
- **Linting**: ESLint

---

## 🚀 Getting Started

### Prerequisites

- Node.js 18.17+
- PostgreSQL 13+
- npm 9+

### Installation

1. **Clone the repository**

```bash
cd d:/pagarbook
```

2. **Install dependencies**

```bash
npm install
```

3. **Configure environment variables**

```bash
cp .env.example .env.local
```

Edit `.env.local` with your values:

```env
DATABASE_URL="postgresql://user:password@localhost:5432/rozgarpay"
NEXTAUTH_SECRET="your-secret-key"
NEXTAUTH_URL="http://localhost:3000"
CLOUDINARY_CLOUD_NAME="your-cloud-name"
CLOUDINARY_API_KEY="your-api-key"
CLOUDINARY_API_SECRET="your-api-secret"
SMS_PROVIDER_KEY="your-sms-provider-key"
```

**Note**: Email configuration is optional. Phone number is required for authentication.

4. **Setup database**

```bash
npm run generate
npx prisma db push
npm run db:seed
```

5. **Start development server**

```bash
npm run dev
```

6. **Access the application**

- Web App: http://localhost:3000
- Admin Panel: http://localhost:3000/admin
- Staff Portal: http://localhost:3000/staff

7. **Run tests** (no tests currently exist)

```bash
npm test
```

---

## 📁 Project Structure

```
pagarbook/
├── public/                 # Static assets
│   ├── workers/           # Web workers
│   ├── manifest.json      # PWA manifest
│   └── sw.js             # Service worker
├── prisma/
│   ├── schema.prisma      # Database schema (phone-focused)
│   ├── seed.tsx          # Database seeder
│   └── migrations/       # Database migrations
├── src/
│   ├── app/              # Next.js App Router
│   │   ├── admin/        # Admin pages
│   │   ├── staff/        # Staff pages
│   │   ├── manager/      # Manager pages
│   │   ├── super-admin/  # Super admin pages
│   │   ├── api/          # API routes
│   │   ├── login/        # Login page (phone-based)
│   │   └── join/        # Invitation pages
│   ├── components/       # React components
│   │   ├── admin/       # Admin-specific components
│   │   ├── staff/       # Staff-specific components
│   │   ├── ui/          # Reusable UI components
│   │   └── layout/      # Layout components
│   ├── hooks/           # Custom React hooks
│   ├── lib/             # Utility functions
│   │   ├── auth.ts     # Auth configuration (phone-based)
│   │   ├── pdfGenerator.ts # PDF generators (phone-only display)
│   │   ├── prisma.ts   # Prisma client
│   │   └── utils.ts    # Utility functions
│   ├── workers/         # Web workers
│   └── middleware.ts   # Next.js middleware
├── docs/                # Documentation
├── .env.example        # Environment template
├── next.config.js      # Next.js config
├── package.json        # Dependencies
├── jest.config.js      # Jest configuration (empty tests)
├── jest.setup.js       # Jest setup (no tests)
├── tailwind.config.ts  # Tailwind config
└── tsconfig.json       # TypeScript config
```

---

## 📡 API Documentation

### Authentication Endpoints (Phone-based)

- `POST /api/auth/[...nextauth]` - NextAuth.js handler
- `POST /api/otp/send` - Send OTP to phone
- `POST /api/otp/verify` - Verify OTP from phone

### Admin Endpoints

- `GET /api/admin/users` - List users (phone included)
- `POST /api/admin/users/invite` - Invite user via phone
- `PUT /api/admin/users/[userId]/status` - Update status
- `GET /api/admin/attendance` - List attendance
- `PUT /api/admin/attendance/[id]/update` - Update attendance
- `POST /api/admin/salary/generate` - Generate salaries
- `GET /api/admin/salary` - List salaries
- `GET /api/admin/cashbook` - List cashbook entries

### Staff Endpoints (Phone-based)

- `GET /api/staff/dashboard` - Staff dashboard
- `POST /api/attendance/punch` - Punch in/out (phone validated)
- `GET /api/staff/salary` - Staff salary records
- `POST /api/staff/correction-requests` - Submit request

### Manager Endpoints

- `GET /api/manager/attendance` - Team attendance
- `GET /api/manager/salary` - Team salaries
- `GET /api/manager/staff` - List team members

### Super Admin Endpoints

- `GET /api/super-admin/companies` - List companies
- `POST /api/super-admin/companies` - Create company
- `GET /api/super-admin/admins` - List admins

---

## 🗄 Database Schema

### Core Models

- **User** - Staff, Admin, Manager, Super Admin (phone is primary)
- **Company** - Organization settings
- **Attendance** - Daily attendance records
- **Salary** - Monthly salary records
- **SalaryBreakdown** - Salary components
- **CashbookEntry** - Financial transactions
- **Notification** - System notifications
- **CorrectionRequest** - Leave/correction requests
- **AuditLog** - Activity tracking

### Supporting Models

- **CompanyInvitation** - User invitations (phone-based)
- **ShiftConfiguration** - Work shifts
- **Otp** - OTP verification (phone-based)
- **SystemSetting** - Platform settings
- **Report** - Generated reports
- **PushSubscription** - Push notifications

**Note**: Phone number is the primary identifier. Email is optional and stored only if provided.

---

## 🚀 Deployment Guide

### Vercel (Recommended)

1. **Push to GitHub**

```bash
git add .
git commit -m "Initial commit"
git push
```

2. **Connect to Vercel**

- Import repository in Vercel
- Add environment variables
- Deploy

3. **Configure Database**

- Use Vercel Postgres or Neon
- Update DATABASE_URL

4. **Configure SMS Provider** (required for OTP)

- Add SMS_PROVIDER_KEY to environment variables

### Docker

```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build
EXPOSE 3000
CMD ["npm", "start"]
```

### Railway/Render

1. Connect GitHub repository
2. Add environment variables (phone/SMS required)
3. Deploy

---

## ⚠️ Pre-Production Checklist

- [ ] **Set up production database**
- [ ] **Configure domain and SSL**
- [ ] **Set up SMS provider for OTP** (REQUIRED - phone-based auth)
- [ ] **Configure Cloudinary for production**
- [ ] **Set up cron job scheduler**
- [ ] **Enable monitoring and logging**
- [ ] **Configure backup strategy**
- [ ] **Security audit**
- [ ] **Write unit tests (CRITICAL - currently 0 tests)**
- [ ] **Write integration tests**
- [ ] **Performance testing**
- [ ] **User acceptance testing**

---

## 📈 Recommended Next Steps

### Immediate (Before Launch)

1. **Write unit tests for critical flows** (HIGH PRIORITY - 0 tests exist)
2. Set up SMS provider for phone-based OTP
3. Set up error monitoring (Sentry)
4. Configure proper logging
5. Security audit

### Short Term (Post-Launch)

1. Implement leave management module
2. Add WhatsApp notification support
3. Improve PDF customization
4. Add more report types
5. Implement multi-language support

### Long Term

1. Mobile app (React Native)
2. Advanced analytics
3. AI-powered insights
4. Integration with accounting software
5. Payroll tax calculations

---

## 📞 Support & Contributing

### Getting Help

- Check the documentation in `/docs`
- Review API routes for endpoint details
- Check Prisma schema for data models

### Contributing

1. Fork the repository
2. Create feature branch
3. Make changes
4. Submit pull request

---

## 📄 License

This project is proprietary software.

---

## 🎉 Acknowledgments

- Built with Next.js 14
- Powered by Prisma ORM
- Styled with Tailwind CSS
- Icons by Lucide

---

**Last Updated**: February 2025
**Version**: 0.1.0
