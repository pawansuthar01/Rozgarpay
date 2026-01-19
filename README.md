# PagarBook - SaaS Attendance & Salary Management System

A comprehensive cloud-based SaaS platform for managing employee attendance, approvals, and automated salary calculations with multi-tenant architecture. Built with Next.js 16, React 19, TypeScript, and PostgreSQL for enterprise-grade performance and scalability.

## 🎯 System Overview

PagarBook is designed to streamline HR operations for organizations of all sizes, from startups to large enterprises. The platform provides end-to-end attendance tracking, automated payroll processing, and comprehensive reporting with real-time notifications and audit trails.

### Key Differentiators

- **Multi-Tenant Architecture**: Complete data isolation between organizations
- **Real-Time Processing**: Live attendance tracking with instant notifications
- **Automated Calculations**: Intelligent salary computation with manual override capabilities
- **Compliance Ready**: GDPR/CCPA compliant with comprehensive audit logging
- **Mobile-First Design**: Responsive web interface with mobile app support
- **Extensible Platform**: API-first design for seamless integrations

## 🚀 Features

### Core Functionality

- **Multi-Tenant SaaS**: Isolated data per organization with secure access controls
- **Real-Time Attendance Tracking**: GPS-verified punch in/out with image proof
- **Automated Salary Calculation**: Configurable rules for different salary types (Monthly/Hourly/Daily)
- **Workflow Management**: Approval/rejection system with status tracking
- **Notification System**: Real-time alerts via in-app, push, email, and WhatsApp
- **Audit Trails**: Complete logging of all system actions for compliance

### User Roles & Permissions

- **Super Admin**: Platform management across all organizations
- **Admin**: Company-level settings and user management
- **Manager**: Attendance approval and team oversight
- **Accountant**: Salary processing and financial reports
- **Staff**: Attendance punching and personal data access

### Attendance Management

#### Core Attendance Features

- **Multi-Modal Punch System**: Support for GPS, biometric, and simple button-based punching
- **Real-Time Location Validation**: GPS-based office premises verification with configurable radius
- **Image Proof**: Mandatory selfie verification for attendance authenticity
- **Auto Punch-Out**: Intelligent system prevents forgotten check-outs with configurable time buffers
- **Late Tracking**: Advanced late arrival detection with configurable grace periods and penalty calculations
- **Overtime Management**: Automatic overtime calculation with manager approval workflows
- **Correction Requests**: Staff-initiated attendance correction system with evidence upload and approval flow

#### Advanced Attendance Controls

- **Shift Duration Management**: Managers can manually set custom shift durations (e.g., 7.5 hours, 12 hours for night shifts)
- **Night Shift Handling**: Special processing for overnight work with duration overrides
- **Half-Day Detection**: Automatic half-day marking based on configurable hour thresholds
- **Absenteeism Automation**: Daily absent marking for missing punches with configurable rules
- **Workflow States**: Four distinct attendance statuses (PENDING, APPROVED, REJECTED, ABSENT) with state transitions
- **Bulk Operations**: Batch approval/rejection capabilities for efficient management

#### Attendance Status Workflow

```
PENDING → APPROVED (Manager approval)
PENDING → REJECTED (Manager rejection)
PENDING → ABSENT (Manager override)
APPROVED → ABSENT (Manager can change approved attendance to absent)
APPROVED → REJECTED (Manager can reject previously approved attendance)
```

### Salary & Payroll

#### Salary Calculation Engine

- **Multiple Salary Types**: Support for Monthly, Hourly, and Daily compensation structures
- **Intelligent Base Calculation**:
  - Monthly: Fixed salary amount
  - Hourly: `working_hours × hourly_rate`
  - Daily: `present_days × daily_rate`
- **Overtime Processing**: `overtime_hours × 1.5 × hourly_rate` (approved overtime only)
- **Shift Duration Integration**: Manual shift duration overrides for special cases (night shifts, irregular hours)

#### Deduction & Penalty System

- **Statutory Deductions**:
  - PF (Provident Fund): Configurable percentage of gross salary
  - ESI (Employee State Insurance): Configurable percentage of gross salary
- **Penalty Calculations**:
  - Late Penalties: `late_minutes × penalty_per_minute` (if enabled)
  - Absent Penalties: `absent_days × penalty_per_day` (if enabled)
- **Half-Day Processing**: Automatic half-day salary adjustments based on hour thresholds

#### Salary Formula Examples

```
Monthly Employee:
Gross Salary = Base Salary + Overtime Amount
Net Salary = Gross Salary - (PF + ESI + Penalties)

Hourly Employee:
Gross Salary = (Working Hours × Hourly Rate) + (Overtime Hours × 1.5 × Hourly Rate)
Net Salary = Gross Salary - (PF + ESI + Penalties)

Daily Employee:
Gross Salary = (Present Days × Daily Rate) + Overtime Amount
Net Salary = Gross Salary - Penalties (PF/ESI typically not applicable)
```

#### Approval & Payment Workflow

- **Generation**: Automated monthly salary calculation (configurable dates)
- **Approval**: Multi-level approval process (Manager → Accountant → Admin)
- **Payment**: Mark as paid with payment date tracking
- **Locking**: Paid salaries are locked to prevent modifications
- **Recalculation**: Automatic updates on attendance corrections (pre-payment only)

## 🏗️ System Architecture

### Technology Stack

#### Frontend Layer

- **Framework**: Next.js 16 with App Router for optimal performance and SEO
- **UI Library**: React 19 with concurrent features and automatic batching
- **Language**: TypeScript with strict mode for type safety
- **Styling**: Tailwind CSS with custom design system
- **State Management**: React hooks with context providers
- **Forms**: React Hook Form with validation
- **Icons**: Lucide React for consistent iconography

#### Backend Layer

- **API Framework**: Next.js API Routes with middleware support
- **ORM**: Prisma with type-safe database operations
- **Authentication**: NextAuth.js with JWT tokens and session management
- **Validation**: Zod schemas for runtime type validation
- **Error Handling**: Centralized error handling with custom error types
- **Caching**: Built-in Next.js caching with Redis support (optional)

#### Database Layer

- **Primary Database**: PostgreSQL 15+ with connection pooling
- **Schema Management**: Prisma migrations with version control
- **Indexing Strategy**: Optimized indexes for attendance queries and reporting
- **Connection Management**: PgBouncer for connection pooling in production

#### External Integrations

- **File Storage**: Cloudinary for image uploads and optimization
- **Email Service**: Resend for transactional emails
- **SMS/WhatsApp**: MSG91 for multi-channel notifications
- **Push Notifications**: Firebase Cloud Messaging (FCM) integration

### Database Schema Deep Dive

#### Core Entities

**Companies Table**

```sql
- Multi-tenant isolation with company-specific settings
- Configurable attendance rules (shift times, grace periods, penalties)
- Salary configuration (overtime multipliers, deduction percentages)
- Location settings (GPS coordinates, validation radius)
- Integration settings for external services
```

**Users Table**

```sql
- Role-based access control (SUPER_ADMIN, ADMIN, MANAGER, ACCOUNTANT, STAFF)
- Salary configuration per user (base salary, hourly rates, PF/ESI applicability)
- Profile information with secure password hashing
- Company association for multi-tenant data isolation
```

**Attendance Table**

```sql
- Dual punch system (punch_in, punch_out) with timestamps
- GPS location tracking with configurable radius validation
- Image proof storage with Cloudinary integration
- Status workflow (PENDING → APPROVED/REJECTED/ABSENT/LEAVE)
- Manual shift duration override for special cases
- Overtime and working hours calculations
- Approval workflow with approver tracking
```

**Salary Table**

```sql
- Monthly salary calculations with version control
- Comprehensive breakdowns (base, overtime, deductions, penalties)
- Approval workflow (PENDING → APPROVED → PAID)
- Locking mechanism to prevent post-payment modifications
- Audit trails for all salary changes
```

#### Supporting Entities

**Audit Logs**: Complete activity tracking for compliance
**Notifications**: Multi-channel delivery system (Email, SMS, Push, In-App)
**Correction Requests**: Staff-initiated attendance correction workflow
**Push Subscriptions**: Web push notification management
**System Settings**: Platform-wide configuration management

## 📋 Business Rules & Logic

### Attendance Management Rules

#### 1. Punch Validation & Security

- **GPS Validation**: Employee location must be within configured office radius (default: 100 meters)
- **Image Verification**: Mandatory selfie upload for attendance authenticity
- **Time Window Enforcement**:
  - Grace Period: Configurable late arrival allowance (default: 30 minutes)
  - Auto Punch-Out Buffer: Additional time after shift end (default: 30 minutes)
  - Night Shift Window: Extended punch-in window for overnight shifts (default: 2 hours)

#### 2. Attendance Status Workflow

```mermaid
graph TD
    A[PENDING] --> B{Manager Action}
    B --> C[APPROVED]
    B --> D[REJECTED]
    B --> E[ABSENT]
    B --> F[LEAVE]
    C --> G[Can be marked ABSENT]
    C --> H[Can be REJECTED]
```

**Status Definitions:**

- **PENDING**: Initial state after punch, awaiting manager approval
- **APPROVED**: Confirmed attendance, counts toward salary calculation
- **REJECTED**: Denied attendance, treated as absent with penalties
- **ABSENT**: Manual absent marking, applies absent penalties
- **LEAVE**: Special status for approved leave, counts as present but no hours/overtime

#### 3. Automatic Processing Logic

- **Daily Absent Marking**: Cron job runs after shift end to mark missing punches as absent
- **Auto Punch-Out**: System automatically punches out employees after shift end + buffer
- **Late Calculation**: `(actual_punch_in - shift_start - grace_period)` converted to minutes
- **Working Hours**: `punch_out - punch_in` with validation for minimum/maximum hours
- **Overtime Detection**: Hours exceeding `shift_duration + overtime_threshold`

#### 4. Shift Duration Management

- **Default Calculation**: `punch_out - punch_in` with business hour validation
- **Manual Override**: Managers can set custom shift durations (e.g., 7.5 hours, 12 hours)
- **Night Shift Handling**: Special duration settings for overnight work
- **Validation Rules**: Must be positive number, supports decimal values (0.5 hour increments)

### Salary Calculation Engine

#### 1. Base Salary Computation

```typescript
// Monthly Salary Type
baseAmount = user.baseSalary;

// Hourly Salary Type
baseAmount = attendance.workingHours * user.hourlyRate;

// Daily Salary Type
baseAmount = attendance.approvedDays * user.dailyRate;
```

#### 2. Overtime Calculation Logic

```typescript
overtimeRate =
  user.overtimeRate || user.hourlyRate * company.overtimeMultiplier;
overtimeAmount = approvedOvertimeHours * overtimeRate;
```

#### 3. Deduction Processing

```typescript
// Statutory Deductions (if applicable)
pfDeduction = grossSalary * (company.pfPercentage / 100);
esiDeduction = grossSalary * (company.esiPercentage / 100);

// Penalty Calculations
latePenalty = lateMinutes * company.latePenaltyPerMinute;
absentPenalty = absentDays * company.absentPenaltyPerDay;

totalDeductions = pfDeduction + esiDeduction + latePenalty + absentPenalty;
```

#### 4. Half-Day Processing Rules

- **Threshold Check**: `workingHours < company.halfDayThresholdHours`
- **Salary Impact**: 50% reduction in daily/monthly salary components
- **Overtime Exclusion**: Half-days don't qualify for overtime calculation
- **Penalty Application**: Full penalty applies regardless of half-day status

#### 5. Salary Approval Workflow

```mermaid
graph TD
    A[Auto Generated] --> B[PENDING]
    B --> C{Manager Review}
    C --> D[APPROVED]
    C --> E[REJECTED]
    D --> F{Accountant Review}
    F --> G[APPROVED]
    G --> H[MARK AS PAID]
    H --> I[LOCKED - No Modifications]
```

#### 6. Recalculation Rules

- **Pre-Payment**: Salaries can be recalculated if attendance is corrected
- **Post-Payment**: Recalculation allowed but logged as exception
- **Version Control**: Each recalculation increments version number
- **Audit Trail**: All changes tracked with reason codes

## 🔧 Configuration Options

### Company Settings

- **Shift Times**: Start/end times, grace periods
- **Location**: GPS coordinates and validation radius
- **Working Hours**: Min/max daily hours, auto punch-out buffers
- **Salary Rules**: Penalty rates, deduction percentages
- **Overtime**: Thresholds and approval requirements

### Admin Controls

- **Penalty Toggles**: Enable/disable late and absent penalties
- **Notification Settings**: Channel preferences and quiet hours
- **User Management**: Role assignments and access controls
- **Report Generation**: Custom date ranges and export formats

## 📱 API Reference

### Authentication Endpoints

#### `POST /api/auth/[...nextauth]`

NextAuth.js authentication handlers supporting multiple providers

- **Methods**: Sign in, sign out, session management
- **Security**: JWT tokens with configurable expiration
- **Features**: Remember me, secure cookie handling

#### `POST /api/join/[token]`

Company invitation acceptance workflow

- **Validation**: Token expiration and usage tracking
- **Onboarding**: Automatic user creation and role assignment
- **Security**: One-time use tokens with expiration

### Attendance Management APIs

#### `POST /api/attendance/punch`

Employee attendance punching system

```typescript
Request Body:
{
  type: "IN" | "OUT",
  location: { lat: number, lng: number },
  image: File, // Selfie verification
  timestamp: Date
}

Response:
{
  success: boolean,
  attendance: AttendanceRecord,
  message: string
}
```

- **Validation**: GPS location, image upload, business rules
- **Processing**: Automatic status assignment, notification triggers

#### `GET /api/attendance/today`

Current day attendance status for authenticated user

- **Response**: Today's punches, working hours, status
- **Caching**: 5-minute cache for performance

#### `PATCH /api/attendance/[id]`

Manager attendance approval/rejection

```typescript
Request Body:
{
  status: "APPROVED" | "REJECTED" | "ABSENT" | "LEAVE",
  rejectionReason?: string
}
```

- **Authorization**: MANAGER or ADMIN role required
- **Workflow**: Status transition validation, audit logging

### Administrative APIs

#### `GET /api/manager/attendance`

Pending attendance list for manager review

- **Filtering**: Date range, user, status filters
- **Pagination**: Cursor-based pagination for large datasets
- **Real-time**: WebSocket updates for new pending attendances

#### `GET /api/admin/attendance`

Comprehensive attendance overview with analytics

- **Metrics**: Approval rates, late percentages, overtime totals
- **Export**: CSV/PDF generation capabilities

#### `PATCH /api/admin/attendance/[id]/update`

Advanced attendance modification (ADMIN/MANAGER)

```typescript
Request Body:
{
  overtimeHours?: number,
  workingHours?: number,
  shiftDurationHours?: number,  // NEW: Manual shift duration override
  isLate?: boolean,
  approvalReason?: string
}
```

- **Features**: Manual adjustments for special cases
- **Audit**: Complete change tracking with before/after values
- **Validation**: Business rule enforcement

### Salary Management APIs

#### `POST /api/admin/salary/generate`

Automated salary calculation for month

```typescript
Request Body:
{
  month: number,  // 1-12
  year: number,
  userIds?: string[]  // Optional: specific users
}
```

- **Processing**: Batch calculation with progress tracking
- **Idempotent**: Safe to run multiple times
- **Notifications**: Completion alerts to approvers

#### `GET /api/admin/salary`

Salary listing with filtering and search

- **Filters**: Status, month, year, user, amount ranges
- **Sorting**: Date, amount, status
- **Export**: Multiple format support

#### `PATCH /api/admin/salary/[id]/approve`

Salary approval workflow

- **Authorization**: Sequential approval (Manager → Accountant → Admin)
- **Validation**: Amount limits, budget checks
- **Audit**: Approval chain tracking

#### `PATCH /api/admin/salary/[id]/mark-paid`

Payment completion marking

- **Locking**: Prevents further modifications
- **Integration**: External payroll system sync
- **Notifications**: Payment confirmation to employees

### Configuration APIs

#### `GET|PATCH /api/admin/company`

Company-wide settings management

```typescript
Settings Include:
{
  attendanceRules: {
    shiftStartTime: "HH:MM",
    shiftEndTime: "HH:MM",
    gracePeriodMinutes: number,
    autoPunchOutBufferMinutes: number,
    locationRadius: number
  },
  salaryRules: {
    overtimeMultiplier: number,
    latePenaltyPerMinute: number,
    absentPenaltyPerDay: number,
    pfPercentage: number,
    esiPercentage: number
  }
}
```

#### `GET /api/admin/users`

User management with role-based access

- **Features**: Bulk operations, status management, reporting

## 🔄 Automated Processes & Background Jobs

### Cron Job Scheduling

#### 1. Auto Punch-Out Service (`/api/cron/auto-punch-out`)

```typescript
Schedule: Every 10-15 minutes during business hours
Logic:
- Find employees punched in but not punched out
- Check if current time > shift_end + buffer_minutes
- Automatically punch out and mark as auto_punch_out: true
- Send notification to employee
- Log audit trail with reason
```

#### 2. Daily Absent Marking (`/scripts/mark-absent.ts`)

```typescript
Schedule: Daily at shift_end + 30 minutes
Process:
- Query all users who haven't punched in/out for the day
- Create ABSENT attendance records
- Apply absent penalties if configured
- Send absent notifications
- Generate daily attendance reports
```

#### 3. Monthly Salary Generation (`/api/admin/salary/generate`)

```typescript
Schedule: 1st of every month (configurable)
Workflow:
- Calculate attendance summaries for previous month
- Generate salary records for all active employees
- Apply business rules and penalty calculations
- Create detailed breakdowns
- Notify approvers of pending salaries
- Send employee salary previews
```

#### 4. Notification Cleanup

```typescript
Schedule: Daily at 2 AM
Tasks:
- Mark old notifications as read
- Archive notification logs older than 90 days
- Clean up failed notification retry queues
```

### Notification Engine

#### Event-Driven Notifications

```typescript
// Attendance Events
PUNCH_IN: "Welcome! You've punched in successfully";
LATE_PUNCH: "Late arrival detected - Manager notified";
AUTO_PUNCH_OUT: "System auto punched you out";
APPROVAL_NEEDED: "New attendance pending your approval";
APPROVED: "Your attendance has been approved";
REJECTED: "Attendance rejected - Reason: {reason}";

// Salary Events
SALARY_GENERATED: "Your salary for {month} is ready for review";
SALARY_APPROVED: "Salary approved - Amount: {amount}";
SALARY_PAID: "Salary payment processed";
PENALTY_APPLIED: "Penalty applied - Reason: {reason}";

// System Events
SHIFT_DURATION_CHANGED: "Shift duration updated to {hours} hours";
CORRECTION_REQUESTED: "Correction request submitted";
CORRECTION_APPROVED: "Your correction request was approved";
```

#### Multi-Channel Delivery

- **In-App**: Real-time notifications in dashboard
- **Push**: Browser/mobile push notifications
- **Email**: HTML templates with detailed information
- **SMS/WhatsApp**: Critical alerts and OTPs
- **Fallback**: Automatic channel switching on delivery failure

#### Notification Preferences

```typescript
User Settings:
{
  channels: {
    inApp: boolean,
    push: boolean,
    email: boolean,
    sms: boolean,
    whatsapp: boolean
  },
  quietHours: {
    enabled: boolean,
    start: "22:00",
    end: "08:00"
  },
  digest: {
    daily: boolean,
    weekly: boolean
  }
}
```

### Background Processing Queue

#### Job Types

- **Heavy Calculations**: Salary generation for large organizations
- **Bulk Operations**: Mass attendance approvals, user imports
- **Report Generation**: PDF/CSV exports with complex queries
- **External Sync**: ERP system integrations, payroll exports

#### Queue Management

- **Priority Levels**: Critical, High, Normal, Low
- **Retry Logic**: Exponential backoff with max attempts
- **Monitoring**: Job status tracking and failure alerts
- **Scaling**: Horizontal scaling with Redis-backed queues

## 📊 Reporting & Analytics

### Attendance Reports

- Daily/weekly/monthly attendance summaries
- Late arrival trends and patterns
- Overtime hours by employee/department
- Absenteeism rates and causes

### Salary Reports

- Payroll summaries with breakdowns
- Deduction analysis (PF, ESI, penalties)
- Payment status tracking
- Historical salary comparisons

### System Reports

- User activity logs
- Notification delivery statistics
- System performance metrics
- Audit trail exports

## 🔒 Security & Compliance

### Data Protection

- End-to-end encryption for sensitive data
- GDPR/CCPA compliant data handling
- Secure file storage for attendance images
- Regular data backups and retention policies

### Access Control

- Role-based permissions with granular controls
- Session management with automatic timeouts
- IP-based restrictions for admin access
- Two-factor authentication support (extensible)

### Audit & Monitoring

- Complete audit trails for all data changes
- Real-time monitoring of system health
- Automated alerts for security events
- Compliance reporting for regulatory requirements

## 🚀 Deployment & Scaling

### Infrastructure

- **Database**: PostgreSQL with connection pooling
- **File Storage**: Cloudinary for image uploads
- **Email**: Resend for transactional emails
- **SMS/WhatsApp**: MSG91 integration
- **Hosting**: Vercel/serverless deployment ready

### Scaling Considerations

- Horizontal scaling with database sharding
- CDN integration for static assets
- Redis caching for frequently accessed data
- Background job processing for heavy computations

## 🛠️ Development Setup & Configuration

### System Requirements

#### Minimum Requirements

- **Node.js**: 18.17+ (LTS recommended)
- **PostgreSQL**: 15.0+
- **Memory**: 4GB RAM minimum, 8GB recommended
- **Storage**: 10GB free space for database and uploads
- **OS**: Windows 10+, macOS 12+, Ubuntu 20.04+

#### Recommended Development Environment

- **Node.js**: 20.x LTS
- **PostgreSQL**: 16.x
- **Redis**: 7.x (optional, for caching)
- **Git**: 2.30+
- **VS Code**: With TypeScript and Prisma extensions

### Installation & Setup

#### 1. Repository Setup

```bash
# Clone the repository
git clone <repository-url>
cd pagarbook

# Install dependencies
npm install

# Verify installation
npm --version
node --version
```

#### 2. Database Configuration

```bash
# Create PostgreSQL database
createdb pagarbook_dev

# Or using psql
psql -U postgres -c "CREATE DATABASE pagarbook_dev;"

# Run Prisma migrations
npx prisma migrate dev

# Seed initial data
npx prisma db seed

# Generate Prisma client
npx prisma generate

# Verify database connection
npx prisma db push --preview-feature
```

#### 3. Environment Configuration

```bash
# Copy environment template
cp .env.example .env.local

# Edit with your values
nano .env.local  # or code .env.local
```

#### 4. Environment Variables Setup

```env
# Database Configuration
DATABASE_URL="postgresql://username:password@localhost:5432/pagarbook_dev"
DIRECT_URL="postgresql://username:password@localhost:5432/pagarbook_dev"

# Authentication
NEXTAUTH_SECRET="your-super-secret-key-here-32-chars-min"
NEXTAUTH_URL="http://localhost:3000"

# External Services (Get API keys from respective providers)
RESEND_API_KEY="re_xxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
MSG91_AUTH_KEY="xxxxxxxxxxxxxxxxxxxxxxxx"
MSG91_WHATSAPP_AUTH_KEY="xxxxxxxxxxxxxxxxxxxxxxxx"
CLOUDINARY_CLOUD_NAME="your-cloud-name"
CLOUDINARY_API_KEY="xxxxxxxxxxxxxxx"
CLOUDINARY_API_SECRET="xxxxxxxxxxxxxxxxxxxxxxxxxxxxx"

# Cron Jobs & Webhooks
CRON_SECRET_TOKEN="your-cron-secret-token"

# Optional: Redis for caching
REDIS_URL="redis://localhost:6379"

# Optional: Development settings
NODE_ENV="development"
DEBUG="pagarbook:*"
```

#### 5. External Service Setup

##### Email Service (Resend)

1. Sign up at [resend.com](https://resend.com)
2. Create API key in dashboard
3. Add domain for sending emails
4. Update `RESEND_API_KEY` in `.env.local`

##### SMS/WhatsApp (MSG91)

1. Sign up at [msg91.com](https://msg91.com)
2. Get Auth Key and WhatsApp Auth Key
3. Configure SMS templates
4. Update MSG91 keys in `.env.local`

##### File Storage (Cloudinary)

1. Sign up at [cloudinary.com](https://cloudinary.com)
2. Get cloud name, API key, and secret
3. Configure upload presets for attendance images
4. Update Cloudinary credentials in `.env.local`

#### 6. Development Server

```bash
# Start development server
npm run dev

# Server will be available at http://localhost:3000
# API endpoints at http://localhost:3000/api/*

# Build for production
npm run build

# Start production server
npm start
```

### Database Schema Management

#### Migration Workflow

```bash
# Create new migration
npx prisma migrate dev --name "add-new-feature"

# Reset database (development only)
npx prisma migrate reset

# Deploy migrations to production
npx prisma migrate deploy

# View migration status
npx prisma migrate status
```

#### Database Seeding

```bash
# Run seed script
npx prisma db seed

# Custom seed data
npx tsx prisma/seed-custom.ts
```

### Testing Setup

#### Unit & Integration Tests

```bash
# Run all tests
npm test

# Run with coverage
npm run test:coverage

# Run specific test file
npm test -- src/lib/salaryService.test.ts

# Watch mode for development
npm run test:watch
```

#### End-to-End Testing

```bash
# Install Playwright browsers
npx playwright install

# Run E2E tests
npm run test:e2e

# Run tests in UI mode
npm run test:e2e:ui
```

### Development Scripts

```json
{
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "next lint",
    "lint:fix": "next lint --fix",
    "type-check": "tsc --noEmit",
    "test": "jest",
    "test:watch": "jest --watch",
    "test:coverage": "jest --coverage",
    "test:e2e": "playwright test",
    "db:migrate": "prisma migrate dev",
    "db:seed": "prisma db seed",
    "db:generate": "prisma generate",
    "db:studio": "prisma studio"
  }
}
```

### Troubleshooting

#### Common Issues

**Database Connection Failed**

```bash
# Check PostgreSQL service
sudo systemctl status postgresql

# Test connection
psql -U username -d pagarbook_dev -c "SELECT 1;"

# Reset database
npx prisma migrate reset
```

**Prisma Client Issues**

```bash
# Regenerate Prisma client
npx prisma generate

# Clear Prisma cache
rm -rf node_modules/.prisma
npm install
```

**Port Already in Use**

```bash
# Kill process on port 3000
lsof -ti:3000 | xargs kill -9

# Or use different port
npm run dev -- -p 3001
```

**Environment Variables Not Loading**

```bash
# Check .env.local file exists
ls -la .env.local

# Restart development server
# Ctrl+C then npm run dev
```

### Production Deployment

#### Build Optimization

```bash
# Production build with optimizations
npm run build

# Analyze bundle size
npm install --save-dev @next/bundle-analyzer
npm run build:analyze
```

#### Environment Checklist

- [ ] Set `NODE_ENV=production`
- [ ] Configure production database URL
- [ ] Set secure `NEXTAUTH_SECRET`
- [ ] Configure production external service keys
- [ ] Set up proper domain in `NEXTAUTH_URL`
- [ ] Configure cron jobs for production
- [ ] Set up monitoring and logging
- [ ] Configure backup strategies

## ✨ Key Features Deep Dive

### Shift Duration Management System

#### Overview

The shift duration management feature allows managers to manually override calculated shift durations for special cases like night shifts, irregular hours, or project-based work.

#### Implementation Details

```typescript
// Frontend: Manager Attendance Detail Page
interface ShiftDurationControl {
  currentValue: number | null;  // From database
  inputValue: string;          // User input
  isUpdating: boolean;         // Loading state
  validation: {
    min: 0,
    step: 0.5,                 // 30-minute increments
    required: false
  }
}

// API: Update Endpoint
PATCH /api/admin/attendance/[id]/update
Body: { shiftDurationHours: number }
Authorization: MANAGER or ADMIN role
Audit: Full change tracking
```

#### Business Use Cases

1. **Night Shifts**: 12-hour shifts spanning midnight
2. **Project Work**: Extended hours for critical projects
3. **Part-Time Adjustments**: Custom hours for contractors
4. **Overtime Corrections**: Manual overtime hour adjustments
5. **Leave Calculations**: Proper duration for half-days

#### User Experience

- **Input Field**: Number input with 0.5-hour increments
- **Placeholder**: Shows current calculated duration
- **Validation**: Positive numbers only, real-time feedback
- **Loading States**: Clear feedback during updates
- **Audit Trail**: All changes logged with timestamps

#### Integration Points

- **Salary Calculation**: Uses manual duration for base salary computation
- **Overtime Detection**: Compares against manual shift duration
- **Reporting**: Manual durations reflected in all reports
- **Analytics**: Separate tracking for manual vs calculated durations

### Advanced Attendance Analytics

#### Real-Time Metrics

```typescript
interface AttendanceMetrics {
  todayStats: {
    present: number;
    absent: number;
    late: number;
    onLeave: number;
  };
  weeklyTrends: {
    attendanceRate: number;
    averageHours: number;
    lateFrequency: number;
  };
  monthlyReports: {
    topPerformers: User[];
    frequentLateComers: User[];
    overtimeLeaders: User[];
  };
}
```

#### Predictive Analytics

- **Late Arrival Patterns**: ML-based prediction of late arrivals
- **Absenteeism Trends**: Historical analysis and forecasting
- **Overtime Optimization**: Recommendations for shift planning
- **Productivity Insights**: Hours worked vs output correlation

## 📈 Future Enhancements Roadmap

### Phase 1: Mobile Applications (Q2 2024)

- **Native iOS App**: SwiftUI-based attendance punching
- **Android App**: Kotlin/Jetpack Compose implementation
- **Offline Support**: Local storage for offline punching
- **Biometric Integration**: Face ID, Touch ID, Fingerprint
- **Push Notifications**: Real-time alerts and reminders

### Phase 2: Advanced Analytics & AI (Q3 2024)

- **Machine Learning Models**:
  - Late arrival prediction algorithms
  - Absenteeism pattern recognition
  - Overtime optimization recommendations
- **Predictive Dashboard**: AI-powered insights and alerts
- **Automated Scheduling**: Intelligent shift planning
- **Performance Analytics**: Employee productivity metrics

### Phase 3: Enterprise Integrations (Q4 2024)

- **ERP System Connectors**:
  - SAP, Oracle, Microsoft Dynamics integration
  - Real-time data synchronization
  - Bidirectional attendance sync
- **HRMS Integration**: Workday, ADP, BambooHR connectivity
- **Payroll System Links**: Automatic salary data export
- **Calendar Integration**: Outlook, Google Calendar sync

### Phase 4: Advanced Features (2025)

- **Subscription Management**: SaaS billing with tiered pricing
- **Advanced Scheduling**: Rotating shifts, complex patterns
- **Workflow Automation**: Custom approval chains
- **Advanced Reporting**: Custom report builders
- **Multi-Language Support**: Localization for global markets

### Technical Enhancements

- **Plugin Architecture**: Extensible module system
- **API Gateway**: Centralized API management
- **Event-Driven Architecture**: Real-time event processing
- **Microservices Migration**: Modular service architecture
- **Advanced Caching**: Multi-layer caching strategy
- **Global CDN**: Worldwide performance optimization

### Extensibility Framework

```typescript
// Plugin Interface
interface PagarBookPlugin {
  name: string;
  version: string;
  hooks: {
    onAttendancePunch?: (data: PunchData) => Promise<void>;
    onSalaryCalculation?: (data: SalaryData) => Promise<void>;
    onReportGeneration?: (data: ReportData) => Promise<void>;
  };
  routes?: NextApiHandler[];
  components?: React.ComponentType[];
}

// Custom Integration Example
class CustomERPPlugin implements PagarBookPlugin {
  async onSalaryCalculation(data: SalaryData) {
    // Sync salary data to ERP system
    await syncToERP(data);
  }
}
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes with tests
4. Submit a pull request

### Code Standards

- TypeScript strict mode enabled
- ESLint and Prettier configuration
- Comprehensive test coverage required
- Semantic commit messages

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 📞 Support

For support and questions:

- Email: support@pagarbook.com
- Documentation: [Link to docs]
- Issue Tracker: GitHub Issues

---

**PagarBook** - Streamlining attendance management for modern businesses.</content>
</xai:function_call">The README file has been created successfully with comprehensive documentation of the system architecture, features, business rules, API endpoints, and development setup.
