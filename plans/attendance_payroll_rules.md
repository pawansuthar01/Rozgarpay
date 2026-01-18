# Attendance & Payroll Rules for PagarBook SaaS

## Core Principles

- **Day-based approval**: Managers approve/reject entire attendance days, not individual punches
- **Salary calculation**: Only approved attendances contribute to salary
- **Fraud prevention**: Time windows, location verification, image proof requirements
- **Human error tolerance**: Correction requests for genuine mistakes
- **Compliance**: Audit trails, configurable policies per company
- **Mobile-first**: Rules designed for mobile app usage

## 1. ATTENDANCE RULES

### Punch-In Rules

- **Earliest allowed time**: 30 minutes before scheduled shift start (configurable, default 9:00 AM)
- **Latest allowed time**: 30 minutes after scheduled shift start (grace period)
- **What happens if punch-in too early**: Rejected automatically, staff notified to wait
- **What happens if punch-in too late**: Marked as late, requires manager approval
- **Requirements**: GPS location within company premises, selfie image, device verification

### Punch-Out Rules

- **Minimum working hours**: 4 hours (configurable, prevents quick punches)
- **What happens if punch-out too early**: Warning notification, can proceed but flagged for review
- **What happens if punch-out forgotten**: Auto-punch-out at shift end + 30 min buffer
- **Auto-punch-out time**: Shift end time + 30 minutes (configurable)

### Button Visibility Rules

- **Punch-in button shows when**:
  - No open attendance for today
  - Current time within allowed punch-in window
  - Within company location (GPS)
  - Not already punched in today
- **Punch-out button shows when**:
  - Has open punch-in for today
  - Minimum working hours not yet reached (shows countdown)
  - Within company location (GPS)
- **Both buttons hidden when**:
  - Outside business hours (configurable)
  - Location not verified
  - Attendance already approved/rejected for the day

### Notifications

- **Notify staff to punch-in**: 15 minutes before shift start if not punched in
- **Remind staff to punch-out**: 15 minutes before shift end if still punched in
- **Notify manager/admin**:
  - Late punch-ins
  - Early punch-outs
  - Auto-punch-outs
  - Location verification failures

## 2. APPROVAL RULES

### Approval Scope

- **Per day, not per punch**: Single approve/reject action for entire day's attendance
- **Why day-based**: Simplifies workflow, reduces admin burden, matches real payroll processes

### When Approve/Reject Buttons Show

- **Show approve/reject when**:
  - Attendance has both punch-in and punch-out (or auto-punch-out)
  - Status is PENDING
  - Manager has permission for the company
  - Day is not in future
- **Block approval when**:
  - Punch-in time is before earliest allowed
  - Working hours < minimum required
  - Location verification failed multiple times
  - Suspicious patterns detected (e.g., same location for multiple staff)

### Approval Workflow

1. Staff punches in/out
2. System validates basic rules
3. Manager sees pending attendances
4. Manager reviews image, times, location
5. Manager approves or rejects with reason
6. Staff notified of decision
7. Audit log created

## 3. OVERTIME & NIGHT SHIFT

### Overtime Calculation

- **Overtime starts after**: Shift end time + 30 minutes (configurable)
- **Overtime rate**: 1.5x regular hourly rate (configurable)
- **Overtime approval**: Required for all overtime > 2 hours
- **Calculation method**: (Actual hours - Regular shift hours) \* Overtime rate

### Night Shift Logic

- **Shift crossing midnight**: Allowed (e.g., 10 PM - 6 AM)
- **Attendance date**: Belongs to the date when shift starts
- **Punch-out next day**: System handles automatically, date remains start date
- **Overtime for night shifts**: Calculated same as day shifts

### Night Shift Example

- Shift: 9 PM (Day 1) - 6 AM (Day 2)
- Attendance date: Day 1
- Regular hours: 9 hours
- If works until 8 AM: Overtime = 2 hours

## 4. EXCEPTIONS & EDGE CASES

### Forgot Punch-In

- **Staff action**: Submit correction request with reason and evidence
- **Manager review**: Verify evidence (email, call log, etc.)
- **Approval**: Sets punch-in time, marks as corrected
- **Salary impact**: Counts as full day if approved

### Forgot Punch-Out

- **Auto-punch-out**: Triggers at shift end + 30 min
- **Correction request**: Staff can request adjustment with evidence
- **Salary impact**: Paid for auto-punch-out hours

### Punch-Out Next Day

- **System handling**: Attendance remains on start date
- **Notification**: Staff warned if punch-out > 24 hours after punch-in
- **Manager review**: Required for shifts > 24 hours

### Very Long Working Hours

- **Daily limit**: 16 hours maximum (configurable)
- **Auto-punch-out**: Triggers at 16 hours
- **Overtime approval**: Required for >12 hours
- **Health alert**: Notify HR for >14 hours

### Internet/Device Failure

- **Offline mode**: App stores punches locally, syncs when online
- **Timestamp**: Uses device time with server validation
- **Location**: Cached GPS if offline
- **Evidence**: Requires image upload when back online

## 5. SALARY CALCULATION IMPACTS

### Pending Attendance

- **Salary inclusion**: NO - only approved attendances count
- **Monthly report**: Shows as pending, not calculated

### Rejected Attendance

- **Salary inclusion**: NO
- **Impact**: Zero pay for that day
- **Appeals**: Staff can request review

### Manually Corrected Attendance

- **Salary inclusion**: YES, if correction approved
- **Audit trail**: Shows original vs corrected times
- **Tax compliance**: Corrections logged for audit

### Auto Punch-Out Attendance

- **Salary inclusion**: YES, paid for actual hours worked
- **Rate**: Regular rate, not overtime unless approved
- **Policy**: Encourages timely punch-outs

## CONDITIONS TABLE

| Condition                   | Punch-In Allowed | Punch-Out Allowed | Approval Required | Salary Impact         |
| --------------------------- | ---------------- | ----------------- | ----------------- | --------------------- |
| On-time punch-in            | ✅               | -                 | -                 | -                     |
| Late punch-in (<30 min)     | ✅ (flagged)     | ✅                | Manager review    | Full day if approved  |
| Very late punch-in (>2 hrs) | ❌               | -                 | -                 | Zero                  |
| Early punch-out             | ✅               | ✅ (warning)      | Manager review    | Actual hours          |
| Forgot punch-out            | -                | Auto at shift end | -                 | Actual hours          |
| Location failed             | ❌               | ❌                | -                 | Zero                  |
| Minimum hours not met       | ✅               | ❌                | -                 | Zero                  |
| Overtime worked             | ✅               | ✅                | For >2 hrs        | 1.5x rate if approved |
| Night shift                 | ✅               | ✅                | -                 | Full shift pay        |
| Correction approved         | ✅               | ✅                | -                 | Adjusted hours        |

## STEP-BY-STEP FLOWS

### Daily Attendance Flow

1. Staff opens app at shift start
2. App checks location and time
3. Punch-in button enabled if within window
4. Staff takes selfie and punches in
5. During day, punch-out button shows after min hours
6. At shift end, reminder notification sent
7. If no punch-out, auto-punch-out at buffer time
8. Manager reviews pending attendances
9. Manager approves/rejects with comments
10. Salary calculated from approved days

### Correction Request Flow

1. Staff identifies missed punch
2. Submits correction request with evidence
3. Manager receives notification
4. Manager reviews evidence and approves/rejects
5. If approved, attendance updated
6. Audit log created
7. Staff notified of decision

### Overtime Flow

1. Staff works beyond shift end
2. System tracks extra hours
3. At punch-out, calculates overtime
4. If >2 hours, flags for approval
5. Manager reviews and approves overtime
6. Salary includes overtime pay

## FINAL RECOMMENDED POLICY

### Implementation Priority

1. **Core attendance**: Punch in/out with time/location validation
2. **Auto-punch-out**: Prevent forgotten punch-outs
3. **Day-based approval**: Simplify manager workflow
4. **Correction requests**: Handle genuine mistakes
5. **Overtime calculation**: With approval workflow
6. **Night shift handling**: Proper date assignment
7. **Mobile optimizations**: Offline mode, GPS caching

### Configuration Options (Per Company)

- Shift start/end times
- Grace periods for late arrival
- Minimum working hours
- Overtime thresholds
- Auto-punch-out buffer
- Location radius for verification
- Maximum daily hours

### Audit & Compliance

- All actions logged with timestamps
- Image evidence stored securely
- GPS coordinates recorded
- Manager approval trails
- Monthly audit reports

### Fraud Prevention Measures

- GPS location verification
- Selfie image requirements
- Time window restrictions
- Pattern analysis for suspicious behavior
- Device fingerprinting
- IP address logging

This policy balances security, usability, and compliance for production payroll systems.
