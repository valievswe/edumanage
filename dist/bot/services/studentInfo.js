"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.fetchStudentInfo = void 0;
const prisma_1 = require("../../db/prisma");
const fetchStudentInfo = async (studentId) => {
    const student = await prisma_1.prisma.student.findUnique({
        where: { id: studentId },
        include: {
            grade: true,
            studyYear: true,
        },
    });
    if (!student) {
        return null;
    }
    const [marks, monitoringsRaw] = await Promise.all([
        prisma_1.prisma.mark.findMany({
            where: {
                studentId: student.id,
                quarter: { studyYearId: student.studyYearId },
            },
            include: { subject: true, quarter: true },
            orderBy: [{ quarterId: "asc" }, { subject: { name: "asc" } }],
        }),
        prisma_1.prisma.monitoring.findMany({
            where: {
                studentId: student.id,
                studyYearId: student.studyYearId,
            },
            include: { subject: true },
            orderBy: [{ subject: { name: "asc" } }, { month: "asc" }, { createdAt: "asc" }],
        }),
    ]);
    const quarterMap = new Map();
    marks.forEach((mark) => {
        const existingQuarter = quarterMap.get(mark.quarterId);
        if (existingQuarter) {
            existingQuarter.subjects.push({
                subjectName: mark.subject.name,
                score: mark.score,
            });
            return;
        }
        quarterMap.set(mark.quarterId, {
            quarterId: mark.quarterId,
            quarterName: mark.quarter.name,
            subjects: [
                {
                    subjectName: mark.subject.name,
                    score: mark.score,
                },
            ],
            orderIndex: mark.quarter.startDate ? mark.quarter.startDate.getTime() : mark.quarterId,
        });
    });
    const quarters = Array.from(quarterMap.values())
        .sort((a, b) => a.orderIndex - b.orderIndex)
        .map(({ orderIndex, ...rest }) => rest);
    const monitoringMap = new Map();
    const parseYearMonth = (value) => {
        const match = value.trim().match(/^(\d{4})-(0[1-9]|1[0-2])$/);
        if (!match)
            return null;
        const year = Number(match[1]);
        const month = Number(match[2]);
        if (!Number.isFinite(year) || !Number.isFinite(month))
            return null;
        return year * 12 + (month - 1);
    };
    monitoringsRaw.forEach((monitoring) => {
        const existing = monitoringMap.get(monitoring.subjectId);
        const entry = {
            month: monitoring.month,
            score: monitoring.score,
            createdAt: monitoring.createdAt,
        };
        if (existing) {
            const collision = existing.entries.find((e) => e.month === entry.month);
            if (!collision) {
                existing.entries.push(entry);
                return;
            }
            if (entry.createdAt > collision.createdAt) {
                collision.score = entry.score;
                collision.createdAt = entry.createdAt;
            }
            return;
        }
        monitoringMap.set(monitoring.subjectId, {
            subjectId: monitoring.subjectId,
            subjectName: monitoring.subject.name,
            entries: [entry],
        });
    });
    const monitorings = Array.from(monitoringMap.values()).sort((a, b) => a.subjectName.localeCompare(b.subjectName, "uz"));
    monitorings.forEach((subject) => {
        subject.entries.sort((a, b) => {
            const ymA = parseYearMonth(a.month);
            const ymB = parseYearMonth(b.month);
            if (ymA != null && ymB != null)
                return ymA - ymB;
            if (ymA != null)
                return -1;
            if (ymB != null)
                return 1;
            return a.month.localeCompare(b.month, "uz");
        });
        subject.entries.forEach((entry) => {
            delete entry.createdAt;
        });
    });
    return {
        id: student.id,
        fullName: student.fullName,
        gradeName: student.grade?.name ?? null,
        studyYearName: student.studyYear.name,
        quarters,
        monitorings,
    };
};
exports.fetchStudentInfo = fetchStudentInfo;
