# Bug Report - Production Issues

This document lists all identified bugs in the PagarBook application that need to be fixed for production stability.

## Table of Contents

1. [Critical Bugs](#critical-bugs)
2. [High Priority Bugs](#high-priority-bugs)
3. [Medium Priority Bugs](#medium-priority-bugs)
4. [Low Priority Bugs](#low-priority-bugs)

---

## Critical Bugs

### BUG-001: Variable Shadowing in Attendance API

**File:** `src/app/api/admin/attendance/[attendanceId]/route.ts`  
**Lines:** 215-240  
**Severity:** Critical

**Description:**  
The `admin` variable is redefined inside a try-catch block (lines 240-243) when it's already defined earlier (lines 133-136). This causes the outer `admin` variable to be shadowed, leading to potential bugs where the wrong admin context is used.

**Impact:**

- Incorrect admin context used for salary generation
- Potential security issue where wrong company data is accessed
- Data integrity issues in salary calculations

**Current Code:**

```typescript
// Lines 133-136 (outer admin)
const admin = await prisma.user.findUnique({
  where: { id: session.user.id },
  include: { company: true },
});

// ... later in try-catch block (lines 240-243)
const admin = await prisma.user.findUnique({
  where: { id: session.user.id },
  select: { companyId: true },
});
```

**Fix:**  
Rename the inner variable to avoid shadowing:

```typescript
const adminCompany = await prisma.user.findUnique({
  where: { id: session.user.id },
  select: { companyId: true },
});

if (adminCompany?.companyId) {
  await salaryService.generateSalary({
    userId: updatedAttendance.userId,
    companyId: adminCompany.companyId,
    month,
    year,
  });
}
```

---

### BUG-002: Incorrect Method Call in Salary Service

**File:** `src/lib/salaryService.ts`  
**Line:** 681  
**Severity:** Critical

**Description:**  
The `markAsPaid` method calls `salaryService.calculateSalaryBalance(salary, salary.ledger)` but `salaryService` is the class instance. The method `calculateSalaryBalance` is an instance method on `SalaryService` class (defined at line 38), so it should be called as `this.calculateSalaryBalance()`.

**Impact:**

- Runtime error when marking salary as paid
- Salary payment functionality broken in production
- Potential data inconsistency

**Current Code:**

```typescript
// Line 681
const remainingBalance = salaryService.calculateSalaryBalance(
  salary,
  salary.ledger,
);
```

**Fix:**

```typescript
const remainingBalance = this.calculateSalaryBalance(salary, salary.ledger);
```

---

### BUG-003: Middleware Over-Permissive Route Authorization

**File:** `src/middleware.ts`  
**Lines:** 37-40  
**Severity:** Critical

**Description:**  
The middleware allows ALL requests to `/api/attendance` routes with a comment "Will check in API". However, this includes admin-only API routes like `PUT /api/admin/attendance/[attendanceId]` which should be restricted. The current implementation trusts that API routes will handle authorization, but some routes might not have proper authorization checks.

**Impact:**

- Potential unauthorized access to attendance APIs
- Staff members might access admin-only endpoints
- Security vulnerability in production

**Current Code:**

```typescript
if (pathname.startsWith("/api/attendance")) {
  // STAFF can access their own, MANAGER/ADMIN can approve
  return true; // Will check in API
}
```

**Fix:**  
Implement stricter middleware authorization or ensure all API routes have proper authorization checks.

---

## High Priority Bugs

### BUG-004: Type Assertion Bypassing Type Safety

**File:** `src/app/api/admin/attendance/[attendanceId]/route.ts`  
**Line:** 182  
**Severity:** High

**Description:**  
The code uses `status as any` to bypass TypeScript type checking when updating attendance status. This allows any string value to be passed, potentially causing data integrity issues.

**Impact:**

- Invalid status values can be stored in database
- No compile-time safety for status values
- Potential runtime errors

**Current Code:**

```typescript
const updatedAttendance = await prisma.attendance.update({
  where: { id: attendanceId },
  data: {
    status: status as any, // Bypasses type checking
    approvedBy: status === "APPROVED" ? session.user.id : undefined,
    approvedAt: status === "APPROVED" ? new Date() : undefined,
    workingHours: /* ... */,
  },
  // ...
});
```

**Fix:**  
Use a proper type or validate the status value:

```typescript
const validStatuses = ["APPROVED", "REJECTED", "ABSENT", "LEAVE"] as const;
type ValidStatus = (typeof validStatuses)[number];

if (!validStatuses.includes(status as ValidStatus)) {
  return NextResponse.json({ error: "Invalid status value" }, { status: 400 });
}
```

---

### BUG-005: Stale Attendance Handling Bug

**File:** `src/app/api/attendance/punch/route.ts`  
**Lines:** 76-91  
**Severity:** High

**Description:**  
When handling stale attendance records (open for more than 20 hours), the code sets `punchOut` to the same time as `punchIn`, which creates an invalid record with 0 working hours and sets status to "REJECTED". This could lead to incorrect salary calculations.

**Impact:**

- Invalid attendance records created
- Incorrect salary calculations for affected employees
- Data integrity issues

**Current Code:**

```typescript
if (hoursOpen > 20) {
  await prisma.attendance.update({
    where: { id: openAttendance.id },
    data: {
      punchOut: openAttendance.punchIn, // Same as punchIn - incorrect
      workingHours: 0,
      status: "REJECTED",
      approvalReason: "System auto-closed stale attendance",
    },
  });
  openAttendance = null;
}
```

**Fix:**  
Set `punchOut` to the current time or a more appropriate value:

```typescript
if (hoursOpen > 20) {
  await prisma.attendance.update({
    where: { id: openAttendance.id },
    data: {
      punchOut: new Date(), // Use current time instead
      workingHours: 0,
      status: "REJECTED",
      approvalReason: "System auto-closed stale attendance",
    },
  });
  openAttendance = null;
}
```

---

### BUG-006: Logo Upload/Delete Causes Full Page Reload

**File:** `src/app/admin/settings/page.tsx`  
**Lines:** 118-148  
**Severity:** High

**Description:**  
Both `handleLogoUpload` and `handleLogoDelete` functions use `window.location.reload()` to refresh company data after successful operations. This causes a full page reload instead of using React Query's cache invalidation, leading to poor user experience and potential data loss in unsaved forms.

**Impact:**

- Poor user experience with full page reload
- Potential loss of unsaved form data
- Slower perceived performance

**Current Code:**

```typescript
const handleLogoUpload = async (file: File) => {
  // ... upload logic
  // Refresh company data
  window.location.reload(); // Full page reload
};

const handleLogoDelete = async () => {
  // ... delete logic
  // Refresh company data
  window.location.reload(); // Full page reload
};
```

**Fix:**  
Use query client invalidation instead:

```typescript
import { useQueryClient } from "@tanstack/react-query";

// Inside component
const queryClient = useQueryClient();

const handleLogoUpload = async (file: File) => {
  // ... upload logic
  // Refresh company data
  queryClient.invalidateQueries({ queryKey: ["companySettings"] });
  window.location.reload(); // Remove this line
};

const handleLogoDelete = async () => {
  // ... delete logic
  // Refresh company data
  queryClient.invalidateQueries({ queryKey: ["companySettings"] });
  window.location.reload(); // Remove this line
};
```

---

## Medium Priority Bugs

### BUG-007: Pagination Limit Validation Missing

**File:** `src/app/api/admin/attendance/route.ts`  
**Line:** 16  
**Severity:** Medium

**Description:**  
The `parseInt(searchParams.get("limit") || "10")` doesn't validate if the parsed limit is 0 or negative, which could cause division by zero in pagination calculations.

**Impact:**

- Division by zero potential
- Server error on invalid limit parameter
- Poor API robustness

**Current Code:**

```typescript
const limit = parseInt(searchParams.get("limit") || "10");
// No validation for limit <= 0
```

**Fix:**  
Add validation:

```typescript
let limit = parseInt(searchParams.get("limit") || "10");
limit = Math.max(1, Math.min(limit, 100)); // Clamp between 1-100
```

---

### BUG-008: User Role Filter Placement

**File:** `src/app/api/admin/users/route.ts`  
**Lines:** 49-50  
**Severity:** Medium

**Description:**  
The `where.role = "STAFF"` is set after the search condition block (lines 42-49), making the code confusing and potentially error-prone if someone adds more conditions later.

**Impact:**

- Code maintainability issues
- Potential for bugs if code is modified

**Current Code:**

```typescript
if (search) {
  where.OR = [
    { email: { contains: search, mode: "insensitive" } },
    { firstName: { contains: search, mode: "insensitive" } },
    { lastName: { contains: search, mode: "insensitive" } },
    { phone: { contains: search, mode: "insensitive" } },
  ];
}
where.role = "STAFF"; // Set after search condition
```

**Fix:**  
Move role filter to the initial where clause:

```typescript
const where: any = {
  companyId: admin.company.id,
  role: "STAFF", // Set here
};
```

---

### BUG-009: Silent Error Handling in useAttendance Hook

**File:** `src/hooks/useAttendance.ts`  
**Lines:** 156-159  
**Severity:** Medium

**Description:**  
The IndexedDB caching in `useAttendance` hook catches errors but only logs a warning without notifying the user or retrying the operation.

**Impact:**

- Failed caching silently fails
- User not aware of offline functionality issues
- Poor debugging experience

**Current Code:**

```typescript
// Cache the data in IndexedDB for offline use
if (data.records && data.records.length > 0) {
  try {
    await saveAttendance(
      data.records.map((record) => ({
        id: record.id,
        // ...
      })),
    );
  } catch (error) {
    console.warn("Failed to cache attendance data:", error);
    // Silent failure - user not notified
  }
}
```

**Fix:**  
Consider implementing a more robust error handling strategy or at least notify the user.

---

### BUG-010: Authentication Error Messages Not User-Friendly

**File:** `src/lib/auth.ts`  
**Lines:** 16-17, 59-60  
**Severity:** Medium

**Description:**  
Both credential providers return `null` without a specific error message when authentication fails. This makes it difficult for users to understand why login failed.

**Impact:**

- Poor user experience during login
- Difficult debugging for support team
- Users may not know if it's wrong credentials or account issues

**Current Code:**

```typescript
if (!credentials?.phone || !credentials?.password) {
  return null; // Generic failure
}

if (!user || user.status !== "ACTIVE") {
  return null; // Generic failure
}

const isPasswordValid = await bcrypt.compare(
  credentials.password,
  user.password,
);

if (!isPasswordValid) {
  return null; // Generic failure
}
```

**Fix:**  
Consider throwing specific errors that can be caught and displayed to the user.

---

## Low Priority Bugs

### BUG-011: Missing Import in useStaffAttendance Hook

**File:** `src/hooks/useStaffAttendance.ts`  
**Lines:** 1-117  
**Severity:** Low

**Description:**  
The `useStaffAttendance.ts` file imports from `@/lib/storage` indirectly through other files but doesn't use it directly. This is not a bug but a cleanup opportunity.

**Impact:**

- Minor code cleanliness issue
- No functional impact

---

### BUG-012: Hardcoded Role Values in User Add Page

**File:** `src/app/admin/users/add/page.tsx`  
**Lines:** 320-327  
**Severity:** Low

**Description:**  
The Manager and Accountant roles are disabled in the dropdown with a comment "Manager and Accountant roles will be available soon." However, this UI pattern is acceptable for MVP but should be improved when those roles are implemented.

**Impact:**

- No functional impact currently
- Technical debt for future implementation

---

### BUG-013: Commented-Out Code in salaryService

**File:** `src/lib/salaryService.ts`  
**Lines:** 222-252, 772-833  
**Severity:** Low

**Description:**  
Large blocks of commented-out code (PDF generation logic) remain in the codebase, making it harder to read and maintain.

**Impact:**

- Code maintainability issues
- Larger file size
- Confusing for developers

**Fix:**  
Remove commented-out code or move to a separate documentation file.

---

## Testing Recommendations

1. **Unit Tests:** Add tests for all API routes to verify authorization and validation
2. **Integration Tests:** Test the complete attendance punch flow including edge cases
3. **E2E Tests:** Test critical user journeys like login, punch-in/out, salary generation
4. **Load Testing:** Test the system under high load for pagination and batch operations

---

## Security Considerations

1. All API routes should have proper authorization checks
2. Input validation should be enforced at all entry points
3. Sensitive operations should have audit logging
4. Error messages should not leak sensitive information

---

## Performance Considerations

1. Pagination should have maximum limits enforced
2. Batch operations should be rate-limited
3. Database queries should be optimized with proper indexes
4. Caching strategies should be implemented for frequently accessed data

---

**Last Updated:** 2026-02-01  
**Document Version:** 1.0
