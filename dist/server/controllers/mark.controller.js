"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.upsertBulkMarks = exports.deleteMark = exports.updateMark = exports.createMark = exports.getMarkById = exports.getMarks = void 0;
const prisma_1 = require("../../db/prisma");
const isPrismaKnownError = (err) => Boolean(err && typeof err.code === "string");
const getMarks = async (req, res) => {
    try {
        const { studentId, subjectId, quarterId, gradeId, studyYearId, search } = req.query;
        const where = {};
        if (studentId)
            where.studentId = String(studentId);
        if (subjectId)
            where.subjectId = Number(subjectId);
        if (quarterId)
            where.quarterId = Number(quarterId);
        const studentFilter = {};
        if (studyYearId)
            studentFilter.studyYearId = Number(studyYearId);
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
        const marks = await prisma_1.prisma.mark.findMany({
            where,
            include: {
                student: { include: { grade: true } },
                subject: true,
                quarter: true,
            },
            orderBy: { createdAt: "desc" },
        });
        res.json(marks);
    }
    catch (err) {
        res.status(500).json({ message: "Failed to fetch marks", error: err });
    }
};
exports.getMarks = getMarks;
const getMarkById = async (req, res) => {
    try {
        const { id } = req.params;
        const mark = await prisma_1.prisma.mark.findUnique({
            where: { id: Number(id) },
            include: {
                student: { include: { grade: true } },
                subject: true,
                quarter: true,
            },
        });
        if (!mark)
            return res.status(404).json({ message: "Mark not found" });
        res.json(mark);
    }
    catch (err) {
        res.status(500).json({ message: "Failed to fetch mark", error: err });
    }
};
exports.getMarkById = getMarkById;
const createMark = async (req, res) => {
    try {
        const { score, studentId, subjectId, quarterId } = req.body;
        const mark = await prisma_1.prisma.mark.create({
            data: { score, studentId, subjectId, quarterId },
            include: {
                student: { include: { grade: true } },
                subject: true,
                quarter: true,
            },
        });
        res.status(201).json(mark);
    }
    catch (err) {
        if (isPrismaKnownError(err) && err.code === "P2003") {
            return res
                .status(400)
                .json({ message: "Invalid student, subject, or quarter reference" });
        }
        res.status(500).json({ message: "Failed to create mark", error: err });
    }
};
exports.createMark = createMark;
const updateMark = async (req, res) => {
    try {
        const { id } = req.params;
        const { score } = req.body;
        const mark = await prisma_1.prisma.mark.update({
            where: { id: Number(id) },
            data: { score },
            include: {
                student: { include: { grade: true } },
                subject: true,
                quarter: true,
            },
        });
        res.json(mark);
    }
    catch (err) {
        if (isPrismaKnownError(err)) {
            if (err.code === "P2025") {
                return res.status(404).json({ message: "Mark not found" });
            }
            if (err.code === "P2003") {
                return res
                    .status(400)
                    .json({ message: "Invalid student, subject, or quarter reference" });
            }
        }
        res.status(500).json({ message: "Failed to update mark", error: err });
    }
};
exports.updateMark = updateMark;
const deleteMark = async (req, res) => {
    try {
        const { id } = req.params;
        await prisma_1.prisma.mark.delete({ where: { id: Number(id) } });
        res.json({ message: "Mark deleted" });
    }
    catch (err) {
        if (isPrismaKnownError(err) && err.code === "P2025") {
            return res.status(404).json({ message: "Mark not found" });
        }
        res.status(500).json({ message: "Failed to delete mark", error: err });
    }
};
exports.deleteMark = deleteMark;
const upsertBulkMarks = async (req, res) => {
    const { entries } = req.body;
    if (!Array.isArray(entries) || !entries.length) {
        return res.status(400).json({ message: "Entries array is required" });
    }
    try {
        const results = await Promise.all(entries.map(async ({ studentId, subjectId, quarterId, score }) => {
            if (!studentId || !subjectId || !quarterId || typeof score !== "number")
                return null;
            const whereUnique = {
                student_subject_quarter_unique: { studentId, subjectId, quarterId },
            };
            return prisma_1.prisma.mark.upsert({
                where: whereUnique,
                update: { score },
                create: { studentId, subjectId, quarterId, score },
            });
        }));
        const filtered = results.filter(Boolean);
        res.json({ updated: filtered.length, entries: filtered });
    }
    catch (err) {
        if (isPrismaKnownError(err) && err.code === "P2003") {
            return res.status(400).json({
                message: "One or more entries reference missing students, subjects, or quarters",
            });
        }
        res.status(500).json({ message: "Failed to upsert marks", error: err });
    }
};
exports.upsertBulkMarks = upsertBulkMarks;
