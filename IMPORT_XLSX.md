# XLSX Import Guide (Marks & Monitoring)

The admin panel supports importing **grade-wide** quarter marks and monitoring scores from an Excel file.

## Before you start

1. Make sure all **Subjects** already exist in the system (Admin → Subjects).
2. Make sure all **Students** exist for the target **Study year** (and Grade if you filter).
3. Use **exact subject names** as they appear in Admin → Subjects (case-insensitive matching is applied, but spelling must match).

## File rules (required)

- File type: `.xlsx` (recommended), `.xls` also works.
- Only the **first sheet** is read.
- Row 1 must be the header row.
- One student per row.
- Empty score cells are ignored.

### Required columns

- `studentId` (required): the student identifier used in the system.

### Optional columns

- `fullName` (optional): ignored by the importer (useful for humans).

### Subject columns

Every other column header is treated as a **Subject name** and will be imported as a score for that subject.

Example header row:

| studentId | fullName | Matematika | Ingliz tili | Fizika |
|---|---|---:|---:|---:|

Example data row:

| 12345 | Ali Valiyev | 5 | 4 | 5 |

## Importing quarter marks

In Admin → Marks → **Import XLSX**:

1. Select **Study year**
2. (Optional) Select **Grade**
3. Select **Quarter**
4. Choose your XLSX file
5. Fix any reported errors, then press **Import**

This writes marks using the unique key:
`(studentId, subjectId, quarterId)` (upsert).

## Importing monitoring (month-by-month)

In Admin → Monitoring → **Import XLSX**:

1. Select **Study year**
2. (Optional) Select **Grade**
3. Select **Month** (format: `YYYY-MM`, e.g. `2025-09`)
4. Choose your XLSX file
5. Fix any reported errors, then press **Import**

This writes monitoring using the unique key:
`(studentId, subjectId, studyYearId, month)` (upsert).

## Common errors and fixes

- **“Missing required column: studentId”** → rename the first column header to `studentId`.
- **“Unknown subject columns …”** → fix the header spelling to match Admin → Subjects, or create the missing subject first.
- **“studentId … not found in selected study year/grade”** → student is missing or in another year/grade; fix the ID or adjust the selected filters.

