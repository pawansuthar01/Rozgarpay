# Night Shift Attendance System Design

## Core Principles for Night Shifts

### Attendance Date Assignment

- **Rule**: Night shift attendance is ALWAYS recorded on the date when the shift STARTS
- **Reason**: Shifts "belong" to the day they begin for payroll, reporting, and compliance
- **Example**: Shift 10 PM → 6 AM gets attendance date of the 10 PM day

### Shift Classification

- **Day Shift**: Both start and end on same calendar day
- **Night Shift**: Start and end on different calendar days (crosses midnight)
- **Detection**: If shift end time < shift start time, it's a night shift

## PUNCH-IN RULES FOR NIGHT SHIFTS

### When Punch-In is Allowed

- **Earliest**: 30 minutes before scheduled shift start (same as day shifts)
- **Latest**: 30 minutes after scheduled shift start (grace period)
- **Special Case**: For night shifts starting after midnight (e.g., 1 AM)
  - Earliest: 30 minutes before shift start
  - Latest: 30 minutes after shift start
  - No "too early" blocking at midnight

### Punch-In Time Window Examples

```
Night Shift: 10:00 PM - 6:00 AM
- Earliest punch-in: 9:30 PM (same day)
- Latest punch-in: 10:30 PM (same day)
- Attendance date: Date of 10:00 PM

Night Shift: 11:00 PM - 7:00 AM
- Earliest punch-in: 10:30 PM (same day)
- Latest punch-in: 11:30 PM (same day)
- Attendance date: Date of 11:00 PM

Night Shift: 1:00 AM - 9:00 AM
- Earliest punch-in: 12:30 AM (same day as 1 AM)
- Latest punch-in: 1:30 AM (same day as 1 AM)
- Attendance date: Date of 1:00 AM
```

## PUNCH-OUT RULES FOR NIGHT SHIFTS

### When Punch-Out is Allowed

- **Minimum Hours**: Must work at least minimum hours before allowing punch-out
- **Maximum Hours**: Cannot work more than maximum daily hours
- **Calendar Day Crossing**: System handles punch-out on next calendar day automatically

### Punch-Out Examples

```
Shift: 10:00 PM - 6:00 AM
- Punch-in: 10:15 PM (Date 1)
- Punch-out: 6:45 AM (Date 2)
- Working hours: 8.5 hours
- Attendance date: Date 1 (when shift started)
```

## ATTENDANCE DATE STORAGE

### Date Assignment Logic

- **Primary Rule**: Attendance date = date of shift start time
- **Exception Handling**: If punch-in happens on different date than scheduled start, use actual punch-in date
- **Audit Trail**: Store both scheduled shift date and actual attendance date

### Date Storage Examples

```
Scheduled: 10 PM (Day 1) - 6 AM (Day 2)
Actual: Punch-in 10:05 PM (Day 1), Punch-out 5:55 AM (Day 2)
→ Attendance date: Day 1

Scheduled: 11 PM (Day 1) - 7 AM (Day 2)
Actual: Punch-in 11:30 PM (Day 1), Punch-out 7:15 AM (Day 2)
→ Attendance date: Day 1

Scheduled: 1 AM (Day 2) - 9 AM (Day 2)
Actual: Punch-in 1:10 AM (Day 2), Punch-out 8:50 AM (Day 2)
→ Attendance date: Day 2
```

## WORKING HOURS CALCULATION

### Hours Calculation Formula

- **Standard**: (Punch-out time - Punch-in time) in hours
- **Midnight Crossing**: No special handling needed - DateTime math handles it
- **Validation**: Hours must be between minimum and maximum allowed

### Hours Examples

```
Punch-in: 10:00 PM (Day 1)
Punch-out: 6:00 AM (Day 2)
Hours: (6:00 AM - 10:00 PM) = 8 hours

Punch-in: 11:30 PM (Day 1)
Punch-out: 7:45 AM (Day 2)
Hours: (7:45 AM - 11:30 PM) = 8.25 hours

Punch-in: 1:00 AM (Day 2)
Punch-out: 9:00 AM (Day 2)
Hours: (9:00 AM - 1:00 AM) = 8 hours
```

## OVERTIME CALCULATION FOR NIGHT SHIFTS

### Overtime Rules

- **Regular Hours**: Shift end time - shift start time
- **Overtime Start**: After regular shift hours completed
- **Rate**: 1.5x regular hourly rate for approved overtime

### Overtime Examples

```
Shift: 10 PM - 6 AM (8 hours regular)
Actual: 10 PM - 8 AM (10 hours worked)
Overtime: 2 hours (8 AM - 6 AM)

Shift: 11 PM - 7 AM (8 hours regular)
Actual: 11 PM - 9 AM (10 hours worked)
Overtime: 2 hours (9 AM - 7 AM)

Shift: 1 AM - 9 AM (8 hours regular)
Actual: 1 AM - 11 AM (10 hours worked)
Overtime: 2 hours (11 AM - 9 AM)
```

## APPROVAL WORKFLOW FOR NIGHT SHIFTS

### When Approve Button Shows

- **Condition**: Attendance has both punch-in and punch-out (or auto punch-out)
- **Status**: Must be PENDING
- **Manager Access**: Manager must have permission for the company
- **Date Check**: Attendance date must not be in future

### Approval Timing Examples

```
Shift: 10 PM (Day 1) - 6 AM (Day 2)
Punch-in: 10 PM (Day 1)
Punch-out: 6 AM (Day 2)
Approve button shows: After 6 AM on Day 2
Attendance date: Day 1

Shift: 11 PM (Day 1) - 7 AM (Day 2)
Punch-in: 11 PM (Day 1)
Punch-out: 7 AM (Day 2)
Approve button shows: After 7 AM on Day 2
Attendance date: Day 1
```

## AUTO PUNCH-OUT FOR NIGHT SHIFTS

### Auto Punch-Out Timing

- **Trigger**: Shift end time + buffer minutes
- **Date Handling**: Uses attendance date + 1 day for night shifts
- **Status**: Sets to PENDING (not auto-approved)

### Auto Punch-Out Examples

```
Shift: 10 PM - 6 AM, Buffer: 30 min
Auto punch-out time: 6:30 AM (next day)
Attendance date: Day of 10 PM

Shift: 11 PM - 7 AM, Buffer: 30 min
Auto punch-out time: 7:30 AM (next day)
Attendance date: Day of 11 PM
```

## EDGE CASES AND EXCEPTIONS

### 12 AM / Midnight Handling

- **No Special Logic**: System treats 12:00 AM as normal time
- **Date Assignment**: Follows standard rules
- **Example**: Shift 11:30 PM - 7:30 AM
  - Punch-in at 11:45 PM → Attendance date: Day of 11:45 PM
  - Punch-out at 7:30 AM → Next day, but attendance date unchanged

### Late Punch-Out

- **Allowed**: Staff can work beyond shift end
- **Overtime**: Automatically calculated
- **Approval**: May require manager approval for excessive overtime

### Missed Punch-Out

- **Auto Punch-Out**: Triggers at shift end + buffer
- **Correction Request**: Staff can request adjustment with evidence
- **Salary Impact**: Paid for auto-calculated hours

### Early Punch-Out

- **Warning**: System shows warning if below minimum hours
- **Allowed**: But flagged for manager review
- **Salary**: Calculated based on actual hours worked

### Shift Start After Midnight

- **Example**: 1:00 AM - 9:00 AM
- **Punch-In Window**: 12:30 AM - 1:30 AM
- **Attendance Date**: Date of 1:00 AM
- **No Midnight Issues**: Normal processing

## STEP-BY-STEP NIGHT SHIFT FLOW

### 1. Shift Configuration

- Admin sets shift: 10:00 PM - 6:00 AM
- System detects as night shift (end < start)
- Stores shift configuration

### 2. Punch-In Process

- Staff opens app near 10:00 PM
- System validates time window (9:30 PM - 10:30 PM)
- GPS validation if enabled
- Creates attendance record with date = current date (10 PM day)

### 3. During Shift

- Staff works overnight
- System tracks active shift
- No special midnight handling needed

### 4. Punch-Out Process

- Staff punches out next morning (e.g., 6:15 AM)
- System calculates hours: 6:15 AM - 10:00 PM = 8.25 hours
- Updates attendance record (same record from step 2)

### 5. Auto Punch-Out (if missed)

- If no punch-out by 6:30 AM
- System auto punch-out at 6:30 AM
- Sets status to PENDING for review

### 6. Manager Review

- Manager sees pending attendance for previous day
- Reviews punch times, calculates overtime if any
- Approves or rejects with comments

### 7. Salary Calculation

- Uses approved attendance from previous day
- Calculates regular + overtime pay
- Includes in payroll period containing the shift start date

## CONDITIONS TABLE

| Condition            | Punch-In Allowed    | Punch-Out Allowed | Attendance Date  | Hours Calculation |
| -------------------- | ------------------- | ----------------- | ---------------- | ----------------- |
| Normal night shift   | Within grace period | After min hours   | Shift start date | Direct time diff  |
| Late punch-in        | Within grace period | After min hours   | Shift start date | Direct time diff  |
| Early punch-out      | Within grace period | Warning shown     | Shift start date | Actual hours      |
| Missed punch-out     | Within grace period | Auto at shift end | Shift start date | Auto-calculated   |
| Overtime worked      | Within grace period | Allowed           | Shift start date | Regular + OT      |
| Shift after midnight | Within grace period | After min hours   | Shift start date | Direct time diff  |

## FINAL RECOMMENDED POLICY

### Implementation Requirements

1. **Date Assignment**: Always use shift start date for attendance records
2. **Time Validation**: Same rules as day shifts, no midnight special cases
3. **Hours Calculation**: Standard DateTime math handles midnight crossing
4. **Approval Workflow**: Same as day shifts, based on attendance date
5. **Reporting**: Night shifts appear on shift start date in all reports
6. **Salary**: Included in payroll period of shift start date

### Database Schema Requirements

- Attendance table needs: punchIn, punchOut, attendanceDate, workingHours, overtimeHours
- Shift configuration table: startTime, endTime, isNightShift (calculated)
- No special night shift tables needed

### API Considerations

- Punch-in/out endpoints work identically for day and night shifts
- Date handling is transparent to mobile apps
- Reports aggregate by attendance date (shift start date)

### Audit & Compliance

- All date assignments logged with reasoning
- Time zone handling consistent across system
- Correction requests work same for night shifts
- Overtime approvals follow same workflow

This design ensures night shifts work seamlessly with existing day shift logic while properly handling midnight crossing for accurate payroll and compliance.</content>
</xai:function_call">The night shift attendance system is now designed and ready for implementation. The key insight is that attendance dates should always be the shift start date, which simplifies everything while maintaining auditability and compliance.

The system handles all the complex midnight scenarios while keeping the same API and UI patterns as day shifts. No special "night shift mode" is needed - the logic is universal and handles both day and night shifts correctly.

Would you like me to implement this night shift logic in the existing codebase?
