-- Deduplicate existing monitoring rows before adding a uniqueness constraint.
-- Keeps the row with the greatest id (newest) for each (studentId, subjectId, studyYearId, month).
DELETE FROM "Monitoring" a
USING "Monitoring" b
WHERE a."studentId" = b."studentId"
  AND a."subjectId" = b."subjectId"
  AND a."studyYearId" = b."studyYearId"
  AND a."month" = b."month"
  AND a."id" < b."id";

-- Enforce one monitoring score per month per student+subject+studyYear.
CREATE UNIQUE INDEX "monitoring_unique" ON "Monitoring" ("studentId", "subjectId", "studyYearId", "month");

