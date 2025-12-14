"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.importStudents = exports.deleteStudent = exports.updateStudent = exports.getStudentMarks = exports.createStudent = exports.getStudentById = exports.getStudents = exports.getStudentOptions = void 0;
const prisma_1 = require("../../db/prisma");
const parseBoolean = (value) => {
    if (typeof value === "boolean")
        return value;
    if (typeof value === "string")
        return ["true", "1", "yes", "on"].includes(value.toLowerCase());
    return false;
};
const isPrismaKnownError = (err) => Boolean(err && typeof err.code === "string");
const getStudentOptions = async (req, res) => {
    try {
        const { search, studyYearId, gradeId, limit } = req.query;
        const where = {};
        if (studyYearId)
            where.studyYearId = Number(studyYearId);
        if (gradeId)
            where.gradeId = Number(gradeId);
        if (search && typeof search === "string") {
            where.OR = [
                { fullName: { contains: search, mode: "insensitive" } },
                { id: { contains: search, mode: "insensitive" } },
            ];
        }
        const take = limit ? Number(limit) : 2000;
        const students = await prisma_1.prisma.student.findMany({
            where,
            select: {
                id: true,
                fullName: true,
                studyYearId: true,
                grade: { select: { id: true, name: true } },
            },
            orderBy: { fullName: "asc" },
            take: Number.isFinite(take) ? take : 2000,
        });
        res.json(students);
    }
    catch (err) {
        res.status(500).json({ message: "Failed to fetch student options", error: err });
    }
};
exports.getStudentOptions = getStudentOptions;
const getStudents = async (req, res) => {
    try {
        const { search, studyYearId, gradeId } = req.query;
        const where = {};
        if (studyYearId)
            where.studyYearId = Number(studyYearId);
        if (gradeId)
            where.gradeId = Number(gradeId);
        if (search && typeof search === "string") {
            where.OR = [
                { fullName: { contains: search, mode: "insensitive" } },
                { id: { contains: search, mode: "insensitive" } },
            ];
        }
        const students = await prisma_1.prisma.student.findMany({
            where,
            include: { grade: true },
            orderBy: { fullName: "asc" },
        });
        res.json(students);
    }
    catch (err) {
        res.status(500).json({ message: "Failed to fetch students", error: err });
    }
};
exports.getStudents = getStudents;
const getStudentById = async (req, res) => {
    try {
        const { id } = req.params;
        const student = await prisma_1.prisma.student.findUnique({
            where: { id },
            include: { grade: true, studyYear: true },
        });
        if (!student)
            return res.status(404).json({ message: "Student not found" });
        const [marks, monitorings] = await Promise.all([
            prisma_1.prisma.mark.findMany({
                where: { studentId: student.id, quarter: { studyYearId: student.studyYearId } },
                include: { subject: true, quarter: true },
                orderBy: [{ quarterId: "asc" }, { subject: { name: "asc" } }],
            }),
            prisma_1.prisma.monitoring.findMany({
                where: { studentId: student.id, studyYearId: student.studyYearId },
                include: { subject: true },
                orderBy: [{ subject: { name: "asc" } }, { month: "asc" }, { createdAt: "asc" }],
            }),
        ]);
        res.json({ ...student, marks, monitorings });
    }
    catch (err) {
        res.status(500).json({ message: "Failed to fetch student", error: err });
    }
};
exports.getStudentById = getStudentById;
const createStudent = async (req, res) => {
    try {
        const { id, fullName, gradeId, studyYearId } = req.body;
        if (!id || !fullName || !Number.isFinite(Number(studyYearId))) {
            return res.status(400).json({
                message: "id, fullName, and studyYearId are required",
            });
        }
        if (gradeId != null && !Number.isFinite(Number(gradeId))) {
            return res.status(400).json({ message: "gradeId must be a number" });
        }
        const existing = await prisma_1.prisma.student.findUnique({ where: { id } });
        if (existing)
            return res.status(400).json({ message: "Student with this ID already exists" });
        const student = await prisma_1.prisma.student.create({
            data: {
                id: String(id).trim(),
                fullName: String(fullName).trim(),
                gradeId: gradeId != null ? Number(gradeId) : undefined,
                studyYearId: Number(studyYearId),
            },
            include: { grade: true },
        });
        res.status(201).json(student);
    }
    catch (err) {
        if (isPrismaKnownError(err) && err.code === "P2003") {
            return res.status(400).json({
                message: "Invalid grade or study year reference for the student",
            });
        }
        res.status(500).json({ message: "Failed to create student", error: err });
    }
};
exports.createStudent = createStudent;
const getStudentMarks = async (req, res) => {
    try {
        const { id } = req.params;
        const student = await prisma_1.prisma.student.findUnique({
            where: { id },
            include: {
                grade: true,
                studyYear: true,
            },
        });
        if (!student)
            return res.status(404).json({ message: "Student not found" });
        const [marks, monitorings] = await Promise.all([
            prisma_1.prisma.mark.findMany({
                where: { studentId: student.id, quarter: { studyYearId: student.studyYearId } },
                include: { subject: true, quarter: true },
                orderBy: [{ quarterId: "asc" }, { subject: { name: "asc" } }],
            }),
            prisma_1.prisma.monitoring.findMany({
                where: { studentId: student.id, studyYearId: student.studyYearId },
                include: { subject: true },
                orderBy: [{ subject: { name: "asc" } }, { month: "asc" }, { createdAt: "asc" }],
            }),
        ]);
        res.json({
            id: student.id,
            name: student.fullName,
            grade: student.grade?.name,
            marks: marks.map((m) => ({
                subject: m.subject.name,
                quarter: m.quarter.name,
                score: m.score,
            })),
            monitoring: monitorings.map((m) => ({
                subject: m.subject.name,
                month: m.month,
                score: m.score,
            })),
        });
    }
    catch (err) {
        res.status(500).json({ message: "Error fetching marks", error: err });
    }
};
exports.getStudentMarks = getStudentMarks;
const updateStudent = async (req, res) => {
    try {
        const currentId = req.params.id;
        const { fullName, gradeId } = req.body;
        const incomingId = typeof req.body?.id === "string" ? req.body.id.trim() : "";
        const data = {};
        if (incomingId && incomingId !== currentId) {
            const exists = await prisma_1.prisma.student.findUnique({ where: { id: incomingId } });
            if (exists) {
                return res.status(400).json({ message: "Student with this ID already exists" });
            }
            data.id = incomingId;
        }
        if (typeof fullName === "string" && fullName.trim()) {
            data.fullName = fullName.trim();
        }
        if (gradeId !== undefined) {
            if (gradeId === null || gradeId === "") {
                data.gradeId = null;
            }
            else if (!Number.isFinite(Number(gradeId))) {
                return res.status(400).json({ message: "gradeId must be a number" });
            }
            else {
                data.gradeId = Number(gradeId);
            }
        }
        const student = await prisma_1.prisma.student.update({
            where: { id: currentId },
            data,
            include: { grade: true },
        });
        res.json(student);
    }
    catch (err) {
        if (isPrismaKnownError(err)) {
            if (err.code === "P2025") {
                return res.status(404).json({ message: "Student not found" });
            }
            if (err.code === "P2003") {
                return res.status(400).json({
                    message: "Invalid grade reference for the student",
                });
            }
        }
        res.status(500).json({ message: "Failed to update student", error: err });
    }
};
exports.updateStudent = updateStudent;
const deleteStudent = async (req, res) => {
    try {
        const { id } = req.params;
        const force = parseBoolean(req.query.force);
        const student = await prisma_1.prisma.student.findUnique({
            where: { id },
            select: { id: true },
        });
        if (!student) {
            return res.status(404).json({ message: "Student not found" });
        }
        const [marksCount, monitoringsCount] = await Promise.all([
            prisma_1.prisma.mark.count({ where: { studentId: id } }),
            prisma_1.prisma.monitoring.count({ where: { studentId: id } }),
        ]);
        if (!force && (marksCount || monitoringsCount)) {
            return res.status(409).json({
                message: "Student has related marks or monitoring records. Confirm deletion to remove them as well.",
                code: "STUDENT_HAS_RESULTS",
                details: { marks: marksCount, monitorings: monitoringsCount },
                hint: "Retry with ?force=true to delete the student with related records.",
            });
        }
        const removal = await prisma_1.prisma.$transaction(async (tx) => {
            const monitorings = await tx.monitoring.deleteMany({ where: { studentId: id } });
            const marks = await tx.mark.deleteMany({ where: { studentId: id } });
            await tx.student.delete({ where: { id } });
            return { marks: marks.count, monitorings: monitorings.count };
        });
        res.json({
            message: "Student deleted",
            removed: removal,
        });
    }
    catch (err) {
        res.status(500).json({ message: "Failed to delete student", error: err });
    }
};
exports.deleteStudent = deleteStudent;
const importStudents = async (req, res) => {
    const studyYearId = Number(req.body?.studyYearId);
    const defaultGradeIdRaw = req.body?.gradeId;
    const updateExisting = parseBoolean(req.body?.updateExisting);
    const entriesInput = Array.isArray(req.body?.entries) ? req.body.entries : [];
    if (!Number.isFinite(studyYearId)) {
        return res.status(400).json({ message: "studyYearId is required" });
    }
    if (!entriesInput.length) {
        return res.status(400).json({ message: "entries array is required" });
    }
    const defaultGradeId = defaultGradeIdRaw == null || defaultGradeIdRaw === ""
        ? null
        : Number(defaultGradeIdRaw);
    if (defaultGradeId != null && !Number.isFinite(defaultGradeId)) {
        return res.status(400).json({ message: "gradeId must be a number" });
    }
    const seenIds = new Set();
    const normalizedMap = new Map();
    let duplicateCount = 0;
    let invalidCount = 0;
    for (const entry of entriesInput) {
        const id = typeof entry?.id === "string"
            ? entry.id.trim()
            : String(entry?.id ?? "").trim();
        const fullName = typeof entry?.fullName === "string"
            ? entry.fullName.trim()
            : String(entry?.fullName ?? "").trim();
        if (!id || !fullName) {
            invalidCount += 1;
            continue;
        }
        let gradeId = entry?.gradeId == null || entry.gradeId === ""
            ? defaultGradeId
            : Number(entry.gradeId);
        if (gradeId != null && !Number.isFinite(gradeId)) {
            return res
                .status(400)
                .json({ message: `Invalid gradeId for student ${id}` });
        }
        if (seenIds.has(id))
            duplicateCount += 1;
        seenIds.add(id);
        normalizedMap.set(id, { id, fullName, gradeId: gradeId ?? null });
    }
    const normalized = Array.from(normalizedMap.values());
    if (!normalized.length) {
        return res.status(400).json({
            message: "No valid students found in payload",
            details: { invalidCount },
        });
    }
    const studyYear = await prisma_1.prisma.studyYear.findUnique({
        where: { id: studyYearId },
        select: { id: true },
    });
    if (!studyYear) {
        return res.status(400).json({ message: "Study year not found" });
    }
    const gradeIds = Array.from(new Set(normalized
        .map((entry) => entry.gradeId)
        .filter((value) => value != null)));
    if (gradeIds.length) {
        const grades = await prisma_1.prisma.grade.findMany({
            where: { id: { in: gradeIds } },
            select: { id: true },
        });
        const found = new Set(grades.map((g) => g.id));
        const missingGrades = gradeIds.filter((id) => !found.has(id));
        if (missingGrades.length) {
            return res.status(400).json({
                message: `Unknown grade ids: ${missingGrades.join(", ")}`,
            });
        }
    }
    const existing = await prisma_1.prisma.student.findMany({
        where: { id: { in: normalized.map((entry) => entry.id) } },
        select: { id: true },
    });
    const existingIds = new Set(existing.map((s) => s.id));
    const toCreate = normalized.filter((entry) => !existingIds.has(entry.id));
    const toUpdate = normalized.filter((entry) => existingIds.has(entry.id));
    try {
        const result = await prisma_1.prisma.$transaction(async (tx) => {
            let created = 0;
            let updated = 0;
            if (toCreate.length) {
                const createdRes = await tx.student.createMany({
                    data: toCreate.map((entry) => ({
                        id: entry.id,
                        fullName: entry.fullName,
                        studyYearId,
                        gradeId: entry.gradeId ?? undefined,
                    })),
                    skipDuplicates: true,
                });
                created = createdRes.count;
            }
            if (updateExisting && toUpdate.length) {
                for (const entry of toUpdate) {
                    await tx.student.update({
                        where: { id: entry.id },
                        data: {
                            fullName: entry.fullName,
                            studyYearId,
                            gradeId: entry.gradeId ?? null,
                        },
                    });
                    updated += 1;
                }
            }
            return { created, updated };
        });
        const skippedExisting = updateExisting ? 0 : toUpdate.length;
        res.json({
            message: "Students imported",
            total: normalized.length,
            created: result.created,
            updated: result.updated,
            skippedExisting,
            duplicatesMerged: duplicateCount,
            invalid: invalidCount,
        });
    }
    catch (err) {
        if (isPrismaKnownError(err) && err.code === "P2003") {
            return res
                .status(400)
                .json({ message: "Invalid grade or study year reference" });
        }
        res.status(500).json({ message: "Failed to import students", error: err });
    }
};
exports.importStudents = importStudents;
