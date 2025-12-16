"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.upsertBulkMonitoring = exports.deleteMonitoring = exports.updateMonitoring = exports.createMonitoring = exports.getMonitoringById = exports.getMonitoringSummary = exports.getMonitorings = void 0;
const prisma_1 = require("../../db/prisma");
const normalizeMonth = (value) => {
    if (typeof value !== "string")
        return null;
    const trimmed = value.trim();
    if (!trimmed)
        return null;
    // Accept `YYYY-MM` (recommended), or `YYYY-MM-DD` and coerce to `YYYY-MM`.
    const isoMonth = trimmed.match(/^(\d{4})-(0[1-9]|1[0-2])$/);
    if (isoMonth)
        return trimmed;
    const isoDate = trimmed.match(/^(\d{4})-(0[1-9]|1[0-2])-\d{2}/);
    if (isoDate)
        return trimmed.slice(0, 7);
    // Legacy: allow arbitrary month labels (e.g. "Yanvar", "January", "1-oy").
    return trimmed;
};
const isPrismaKnownError = (err) => Boolean(err && typeof err.code === "string");
const monthToDate = (value) => {
    const match = value.match(/^(\d{4})-(0[1-9]|1[0-2])$/);
    if (match) {
        return new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, 1));
    }
    return null;
};
const isMonthWithinStudyYear = (month, studyYear) => {
    const monthDate = monthToDate(month);
    if (!monthDate)
        return true; // legacy labels (e.g. "Yanvar") are allowed
    const start = new Date(Date.UTC(studyYear.startDate.getUTCFullYear(), studyYear.startDate.getUTCMonth(), 1));
    const end = new Date(Date.UTC(studyYear.endDate.getUTCFullYear(), studyYear.endDate.getUTCMonth(), 1));
    return monthDate.getTime() >= start.getTime() && monthDate.getTime() <= end.getTime();
};
const getMonitorings = async (req, res) => {
    try {
        const { studyYearId, gradeId, search, month } = req.query;
        const where = {};
        if (studyYearId)
            where.studyYearId = Number(studyYearId);
        if (month && typeof month === "string" && month.trim()) {
            where.month = normalizeMonth(month) ?? undefined;
        }
        const studentFilter = {};
        if (gradeId)
            studentFilter.gradeId = Number(gradeId);
        if (search && typeof search === "string") {
            studentFilter.OR = [
                { fullName: { contains: search, mode: "insensitive" } },
                { id: { contains: search, mode: "insensitive" } },
            ];
        }
        if (Object.keys(studentFilter).length) {
            where.student = studentFilter;
        }
        const monitorings = await prisma_1.prisma.monitoring.findMany({
            where,
            include: {
                student: { include: { grade: true } },
                subject: true,
                studyYear: true,
            },
            orderBy: { month: "asc" },
        });
        res.json(monitorings);
    }
    catch (err) {
        res
            .status(500)
            .json({ message: "Failed to fetch monitorings", error: err });
    }
};
exports.getMonitorings = getMonitorings;
const getMonitoringSummary = async (req, res) => {
    try {
        const { studyYearId, gradeId, search, month } = req.query;
        const where = {};
        if (studyYearId)
            where.studyYearId = Number(studyYearId);
        if (month && typeof month === "string" && month.trim()) {
            const normalizedMonth = normalizeMonth(month);
            if (normalizedMonth)
                where.month = normalizedMonth;
        }
        const studentFilter = {};
        if (gradeId)
            studentFilter.gradeId = Number(gradeId);
        if (search && typeof search === "string") {
            studentFilter.OR = [
                { fullName: { contains: search, mode: "insensitive" } },
                { id: { contains: search, mode: "insensitive" } },
            ];
        }
        if (Object.keys(studentFilter).length) {
            where.student = studentFilter;
        }
        const [overallAvg, subjectGroups] = await Promise.all([
            prisma_1.prisma.monitoring.aggregate({
                where,
                _avg: { score: true },
                _count: true,
            }),
            prisma_1.prisma.monitoring.groupBy({
                by: ["subjectId"],
                where,
                _avg: { score: true },
                _count: { _all: true },
                orderBy: { subjectId: "asc" },
            }),
        ]);
        const subjectIds = subjectGroups.map((g) => g.subjectId);
        const subjects = subjectIds.length > 0
            ? await prisma_1.prisma.subject.findMany({
                where: { id: { in: subjectIds } },
                select: { id: true, name: true },
            })
            : [];
        const subjectNameMap = new Map(subjects.map((s) => [s.id, s.name]));
        res.json({
            totalEntries: typeof overallAvg._count === "number"
                ? overallAvg._count
                : overallAvg._count?._all ?? 0,
            overallAverage: overallAvg._avg.score,
            bySubject: subjectGroups.map((group) => ({
                subjectId: group.subjectId,
                subjectName: subjectNameMap.get(group.subjectId) ?? "Unknown subject",
                averageScore: group._avg.score,
                entries: group._count._all,
            })),
        });
    }
    catch (err) {
        res
            .status(500)
            .json({ message: "Failed to build monitoring summary", error: err });
    }
};
exports.getMonitoringSummary = getMonitoringSummary;
const getMonitoringById = async (req, res) => {
    try {
        const { id } = req.params;
        const monitoring = await prisma_1.prisma.monitoring.findUnique({
            where: { id: Number(id) },
            include: {
                student: { include: { grade: true } },
                subject: true,
                studyYear: true,
            },
        });
        if (!monitoring)
            return res.status(404).json({ message: "Monitoring not found" });
        res.json(monitoring);
    }
    catch (err) {
        res.status(500).json({ message: "Failed to fetch monitoring", error: err });
    }
};
exports.getMonitoringById = getMonitoringById;
const createMonitoring = async (req, res) => {
    try {
        const month = normalizeMonth(req.body?.month);
        const score = req.body?.score;
        const studentId = req.body?.studentId;
        const subjectId = req.body?.subjectId;
        const studyYearId = req.body?.studyYearId;
        if (!month || typeof studentId !== "string" || !studentId.trim()) {
            return res
                .status(400)
                .json({ message: "month and studentId are required" });
        }
        if (!Number.isFinite(Number(subjectId)) ||
            !Number.isFinite(Number(studyYearId))) {
            return res
                .status(400)
                .json({ message: "subjectId and studyYearId are required" });
        }
        if (typeof score !== "number") {
            return res.status(400).json({ message: "score must be a number" });
        }
        const student = await prisma_1.prisma.student.findUnique({
            where: { id: studentId.trim() },
            select: { id: true, studyYearId: true },
        });
        if (!student) {
            return res.status(404).json({ message: "Student not found" });
        }
        if (student.studyYearId !== Number(studyYearId)) {
            return res
                .status(400)
                .json({ message: "Student belongs to a different study year" });
        }
        const studyYear = await prisma_1.prisma.studyYear.findUnique({
            where: { id: Number(studyYearId) },
            select: { id: true, startDate: true, endDate: true },
        });
        if (!studyYear) {
            return res.status(400).json({ message: "Study year not found" });
        }
        if (!isMonthWithinStudyYear(month, studyYear)) {
            return res.status(400).json({
                message: "month is outside the selected study year range",
            });
        }
        const monitoring = await prisma_1.prisma.monitoring.upsert({
            where: {
                monitoring_unique: {
                    studentId: studentId.trim(),
                    subjectId: Number(subjectId),
                    studyYearId: Number(studyYearId),
                    month,
                },
            },
            update: { score },
            create: {
                month,
                score,
                studentId: studentId.trim(),
                subjectId: Number(subjectId),
                studyYearId: Number(studyYearId),
            },
            include: {
                student: { include: { grade: true } },
                subject: true,
                studyYear: true,
            },
        });
        res.status(201).json(monitoring);
    }
    catch (err) {
        if (isPrismaKnownError(err) && err.code === "P2003") {
            return res
                .status(400)
                .json({ message: "Invalid student, subject, or study year reference" });
        }
        res
            .status(500)
            .json({ message: "Failed to create monitoring", error: err });
    }
};
exports.createMonitoring = createMonitoring;
const updateMonitoring = async (req, res) => {
    try {
        const { id } = req.params;
        const { score, subjectId, studyYearId } = req.body;
        const monthProvided = Object.prototype.hasOwnProperty.call(req.body ?? {}, "month");
        const month = normalizeMonth(req.body?.month);
        if (monthProvided && !month) {
            return res
                .status(400)
                .json({ message: "month must be a non-empty string" });
        }
        const current = await prisma_1.prisma.monitoring.findUnique({
            where: { id: Number(id) },
            include: { studyYear: true },
        });
        if (!current) {
            return res.status(404).json({ message: "Monitoring not found" });
        }
        const targetStudyYearId = studyYearId ?? current.studyYearId;
        const targetMonth = month ?? current.month;
        const studyYear = await prisma_1.prisma.studyYear.findUnique({
            where: { id: Number(targetStudyYearId) },
            select: { id: true, startDate: true, endDate: true },
        });
        if (!studyYear) {
            return res.status(400).json({ message: "Study year not found" });
        }
        if (!isMonthWithinStudyYear(targetMonth, studyYear)) {
            return res.status(400).json({
                message: "month is outside the study year range",
            });
        }
        const data = {};
        if (typeof score === "number")
            data.score = score;
        if (month)
            data.month = month;
        if (subjectId)
            data.subjectId = subjectId;
        if (studyYearId)
            data.studyYearId = studyYearId;
        const monitoring = await prisma_1.prisma.monitoring.update({
            where: { id: Number(id) },
            data,
            include: {
                student: { include: { grade: true } },
                subject: true,
                studyYear: true,
            },
        });
        res.json(monitoring);
    }
    catch (err) {
        if (isPrismaKnownError(err)) {
            if (err.code === "P2025") {
                return res.status(404).json({ message: "Monitoring not found" });
            }
            if (err.code === "P2003") {
                return res.status(400).json({
                    message: "Invalid student, subject, or study year reference",
                });
            }
        }
        res
            .status(500)
            .json({ message: "Failed to update monitoring", error: err });
    }
};
exports.updateMonitoring = updateMonitoring;
const deleteMonitoring = async (req, res) => {
    try {
        const { id } = req.params;
        await prisma_1.prisma.monitoring.delete({ where: { id: Number(id) } });
        res.json({ message: "Monitoring deleted" });
    }
    catch (err) {
        if (isPrismaKnownError(err) && err.code === "P2025") {
            return res.status(404).json({ message: "Monitoring not found" });
        }
        res
            .status(500)
            .json({ message: "Failed to delete monitoring", error: err });
    }
};
exports.deleteMonitoring = deleteMonitoring;
const upsertBulkMonitoring = async (req, res) => {
    const entriesInput = Array.isArray(req.body?.entries)
        ? req.body.entries
        : [];
    const gradeIdRaw = req.body?.gradeId;
    const gradeId = gradeIdRaw == null || gradeIdRaw === "" ? null : Number(gradeIdRaw);
    if (!entriesInput.length) {
        return res.status(400).json({ message: "Entries array is required" });
    }
    if (gradeId != null && !Number.isFinite(gradeId)) {
        return res.status(400).json({ message: "gradeId must be a number" });
    }
    const errors = [];
    const normalized = entriesInput.map((entry, idx) => {
        const month = normalizeMonth(entry?.month);
        return {
            row: idx + 1,
            studentId: typeof entry?.studentId === "string"
                ? entry.studentId.trim()
                : String(entry?.studentId ?? "").trim(),
            subjectId: Number(entry?.subjectId),
            studyYearId: Number(entry?.studyYearId),
            score: Number(entry?.score),
            month,
        };
    });
    const studentIds = Array.from(new Set(normalized
        .map((e) => e.studentId)
        .filter((id) => Boolean(id))));
    const subjectIds = Array.from(new Set(normalized
        .map((e) => e.subjectId)
        .filter((id) => Number.isFinite(id))));
    const studyYearIds = Array.from(new Set(normalized
        .map((e) => e.studyYearId)
        .filter((id) => Number.isFinite(id))));
    try {
        const [students, subjects, studyYears] = await Promise.all([
            prisma_1.prisma.student.findMany({
                where: { id: { in: studentIds } },
                select: { id: true, gradeId: true, studyYearId: true },
            }),
            prisma_1.prisma.subject.findMany({
                where: { id: { in: subjectIds } },
                select: { id: true },
            }),
            prisma_1.prisma.studyYear.findMany({
                where: { id: { in: studyYearIds } },
                select: { id: true, startDate: true, endDate: true },
            }),
        ]);
        const studentMap = new Map(students.map((s) => [s.id, { gradeId: s.gradeId, studyYearId: s.studyYearId }]));
        const subjectSet = new Set(subjects.map((s) => s.id));
        const studyYearMap = new Map(studyYears.map((y) => [y.id, { startDate: y.startDate, endDate: y.endDate }]));
        const ops = [];
        for (const entry of normalized) {
            if (!entry.studentId) {
                errors.push({ message: `Row ${entry.row}: studentId is required` });
                continue;
            }
            if (!Number.isFinite(entry.subjectId) ||
                !Number.isFinite(entry.studyYearId) ||
                !entry.month) {
                errors.push({
                    message: `Row ${entry.row}: subjectId, studyYearId, and month are required`,
                });
                continue;
            }
            if (!Number.isFinite(entry.score)) {
                errors.push({ message: `Row ${entry.row}: score must be a number` });
                continue;
            }
            const student = studentMap.get(entry.studentId);
            if (!student) {
                errors.push({
                    message: `Row ${entry.row}: student "${entry.studentId}" not found`,
                });
                continue;
            }
            if (gradeId != null && student.gradeId !== gradeId) {
                errors.push({
                    message: `Row ${entry.row}: student "${entry.studentId}" not in selected grade`,
                });
                continue;
            }
            if (student.studyYearId !== entry.studyYearId) {
                errors.push({
                    message: `Row ${entry.row}: student "${entry.studentId}" is in another study year`,
                });
                continue;
            }
            if (!subjectSet.has(entry.subjectId)) {
                errors.push({
                    message: `Row ${entry.row}: subject ${entry.subjectId} not found`,
                });
                continue;
            }
            const studyYear = studyYearMap.get(entry.studyYearId);
            if (!studyYear) {
                errors.push({
                    message: `Row ${entry.row}: study year ${entry.studyYearId} not found`,
                });
                continue;
            }
            if (!isMonthWithinStudyYear(entry.month, studyYear)) {
                errors.push({
                    message: `Row ${entry.row}: month "${entry.month}" is outside the study year range`,
                });
                continue;
            }
            ops.push(prisma_1.prisma.monitoring.upsert({
                where: {
                    monitoring_unique: {
                        studentId: entry.studentId,
                        subjectId: entry.subjectId,
                        studyYearId: entry.studyYearId,
                        month: entry.month,
                    },
                },
                update: { score: entry.score },
                create: {
                    studentId: entry.studentId,
                    subjectId: entry.subjectId,
                    studyYearId: entry.studyYearId,
                    month: entry.month,
                    score: entry.score,
                },
            }));
        }
        const saved = [];
        const chunkSize = 500;
        for (let i = 0; i < ops.length; i += chunkSize) {
            const chunk = ops.slice(i, i + chunkSize);
            const result = await prisma_1.prisma.$transaction(chunk);
            saved.push(...result);
        }
        res.json({ updated: saved.length, errors });
    }
    catch (err) {
        if (isPrismaKnownError(err) && err.code === "P2003") {
            return res.status(400).json({
                message: "One or more entries reference missing students, subjects, or study years",
            });
        }
        res
            .status(500)
            .json({ message: "Failed to upsert monitoring entries", error: err });
    }
};
exports.upsertBulkMonitoring = upsertBulkMonitoring;
