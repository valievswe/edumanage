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

- `studentId` (required): the student identifier used in the system. The importer accepts `studentId`, `student_id`, `id`, or `code` headers.

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

- Quarter must belong to the selected study year (UI enforces the choice).
- Student IDs are validated against the selected study year/grade; unknown IDs are listed before import.

## Importing monitoring (month-by-month)

In Admin → Monitoring → **Import XLSX**:

1. Select **Study year**
2. (Optional) Select **Grade**
3. Select **Month** (format: `YYYY-MM`, e.g. `2025-09`)
4. Choose your XLSX file
5. Fix any reported errors, then press **Import**

This writes monitoring using the unique key:
`(studentId, subjectId, studyYearId, month)` (upsert).

- Month accepts `YYYY-MM` (preferred) or `YYYY-MM-DD` (coerced to `YYYY-MM`); legacy labels are preserved as-is.
- Student IDs are validated against the selected study year/grade; unknown IDs are listed before import.

## Importing students

In Admin → Students → **Import XLSX**:

1. Select **Study year**.
2. (Optional) Select **Grade** to apply to all rows; otherwise add a `grade` column in the file that matches an existing grade name.
3. Choose your XLSX file **or** use the built-in sheet to paste/type rows (ID, fullName, optional grade).
4. Toggle **Update existing students** if you want existing IDs to be updated; otherwise they will be skipped.

Required columns:

- `studentId`, `student_id`, `id`, or `code`
- `fullName`

Optional column:

- `grade` (case-insensitive match against grade names in Admin → Grades; headers `grade`, `class`, or `grade_name` are accepted)

Duplicates by `studentId` are merged automatically, and rows without an ID or full name are ignored. If you select a **Grade** in the dialog, it is used as the default when a row omits grade data.

### Inline sheet entry (students)

- Columns: `studentId`, `fullName`, `grade` (optional).
- You can paste directly from Excel/Sheets (tab/CSV); invalid rows are rejected until both ID and full name are present.
- Uses the same backend import endpoint as file upload.

## Common errors and fixes

- **“Missing required column: studentId”** → rename the first column header to `studentId`.
- **“Unknown subject columns …”** → fix the header spelling to match Admin → Subjects, or create the missing subject first.
- **“studentId … not found in selected study year/grade”** → student is missing or in another year/grade; fix the ID or adjust the selected filters.
