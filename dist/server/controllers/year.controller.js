"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.rolloverYear = exports.updateYear = exports.deleteYear = exports.createYear = exports.getYears = void 0;
const prisma_1 = require("../../db/prisma");
const isPrismaKnownError = (err) => Boolean(err && typeof err.code === "string");
const getYears = async (_, res) => {
    const years = await prisma_1.prisma.studyYear.findMany({
        orderBy: { startDate: "desc" },
        include: {
            quarters: {
                orderBy: { startDate: "asc" },
            },
        },
    });
    res.json(years);
};
exports.getYears = getYears;
const parseDate = (value) => {
    if (typeof value !== "string" || !value.trim())
        return null;
    const date = new Date(value);
    return isNaN(date.getTime()) ? null : date;
};
const incrementFirstNumberInText = (value) => {
    const match = value.match(/\d+/);
    if (!match || match.index == null)
        return null;
    const current = Number(match[0]);
    if (!Number.isFinite(current))
        return null;
    const start = match.index;
    const end = start + match[0].length;
    return `${value.slice(0, start)}${current + 1}${value.slice(end)}`;
};
const parseFirstNumber = (value) => {
    const match = value.match(/\d+/);
    if (!match)
        return null;
    const parsed = Number(match[0]);
    return Number.isFinite(parsed) ? parsed : null;
};
const shiftDateByYears = (date, years) => {
    const shifted = new Date(date);
    shifted.setFullYear(shifted.getFullYear() + years);
    return shifted;
};
const createYear = async (req, res) => {
    const { name, startDate, endDate } = req.body;
    const start = new Date(startDate);
    const end = new Date(endDate);
    if (!name || isNaN(start.getTime()) || isNaN(end.getTime())) {
        return res.status(400).json({ message: "Invalid name or dates" });
    }
    const year = await prisma_1.prisma.studyYear.create({
        data: {
            name,
            startDate: start,
            endDate: end,
        },
    });
    res.status(201).json(year);
};
exports.createYear = createYear;
const deleteYear = async (req, res) => {
    try {
        const { id } = req.params;
        await prisma_1.prisma.studyYear.delete({ where: { id: Number(id) } });
        res.json({ message: "Study year deleted" });
    }
    catch (err) {
        if (isPrismaKnownError(err)) {
            if (err.code === "P2025") {
                return res.status(404).json({ message: "Study year not found" });
            }
            if (err.code === "P2003") {
                return res.status(409).json({
                    message: "Cannot delete study year because related quarters, marks, or monitorings exist",
                });
            }
        }
        res.status(500).json({ message: "Failed to delete study year", error: err });
    }
};
exports.deleteYear = deleteYear;
const updateYear = async (req, res) => {
    const { id } = req.params;
    const { name, startDate, endDate } = req.body;
    const data = {};
    if (name)
        data.name = name;
    if (startDate)
        data.startDate = new Date(startDate);
    if (endDate)
        data.endDate = new Date(endDate);
    const year = await prisma_1.prisma.studyYear.update({
        where: { id: Number(id) },
        data,
        include: { quarters: { orderBy: { startDate: "asc" } } },
    });
    res.json(year);
};
exports.updateYear = updateYear;
const rolloverYear = async (req, res) => {
    const sourceYearId = Number(req.params.id);
    if (!Number.isFinite(sourceYearId)) {
        return res.status(400).json({ message: "Invalid study year id" });
    }
    const name = typeof req.body?.name === "string" ? req.body.name.trim() : "";
    const start = parseDate(req.body?.startDate);
    const end = parseDate(req.body?.endDate);
    const moveStudents = req.body?.moveStudents !== false;
    const incrementGrades = req.body?.incrementGrades !== false;
    const copyQuarters = req.body?.copyQuarters !== false;
    const graduateAt = req.body?.graduateAt == null
        ? 11
        : Number.isFinite(Number(req.body.graduateAt))
            ? Number(req.body.graduateAt)
            : null;
    if (!name || !start || !end) {
        return res.status(400).json({ message: "Invalid name or dates" });
    }
    if (graduateAt == null) {
        return res.status(400).json({ message: "graduateAt must be a number" });
    }
    const sourceYear = await prisma_1.prisma.studyYear.findUnique({
        where: { id: sourceYearId },
        include: {
            quarters: true,
            students: { include: { grade: true } },
        },
    });
    if (!sourceYear) {
        return res.status(404).json({ message: "Study year not found" });
    }
    try {
        const result = await prisma_1.prisma.$transaction(async (tx) => {
            const newYear = await tx.studyYear.create({
                data: {
                    name,
                    startDate: start,
                    endDate: end,
                },
            });
            let quartersCopied = 0;
            if (copyQuarters && sourceYear.quarters.length) {
                await tx.quarter.createMany({
                    data: sourceYear.quarters.map((quarter) => ({
                        name: quarter.name,
                        studyYearId: newYear.id,
                        startDate: quarter.startDate ? shiftDateByYears(quarter.startDate, 1) : undefined,
                        endDate: quarter.endDate ? shiftDateByYears(quarter.endDate, 1) : undefined,
                    })),
                });
                quartersCopied = sourceYear.quarters.length;
            }
            let studentsMoved = 0;
            let studentsGradeIncremented = 0;
            let graduatesSkipped = 0;
            const gradeIdCache = new Map();
            if (moveStudents && sourceYear.students.length) {
                for (const student of sourceYear.students) {
                    if (student.grade?.name) {
                        const gradeNumber = parseFirstNumber(student.grade.name);
                        if (gradeNumber != null && gradeNumber >= graduateAt) {
                            graduatesSkipped += 1;
                            continue;
                        }
                    }
                    let nextGradeId = student.gradeId ?? undefined;
                    if (incrementGrades && student.grade) {
                        const nextName = incrementFirstNumberInText(student.grade.name);
                        if (nextName && nextName !== student.grade.name) {
                            const cached = gradeIdCache.get(student.grade.id);
                            if (cached) {
                                nextGradeId = cached;
                            }
                            else {
                                const existing = await tx.grade.findUnique({ where: { name: nextName } });
                                const grade = existing ?? (await tx.grade.create({ data: { name: nextName } }));
                                gradeIdCache.set(student.grade.id, grade.id);
                                nextGradeId = grade.id;
                            }
                            studentsGradeIncremented += 1;
                        }
                    }
                    await tx.student.update({
                        where: { id: student.id },
                        data: { studyYearId: newYear.id, gradeId: nextGradeId ?? undefined },
                    });
                    studentsMoved += 1;
                }
            }
            return {
                newYear,
                quartersCopied,
                studentsMoved,
                studentsGradeIncremented,
                graduatesSkipped,
            };
        });
        return res.status(201).json({
            message: "Rollover completed",
            ...result,
            options: { moveStudents, incrementGrades, copyQuarters, graduateAt },
        });
    }
    catch (error) {
        return res.status(500).json({ message: "Failed to rollover year", error });
    }
};
exports.rolloverYear = rolloverYear;
