import { Prisma } from "@prisma/client";
import { Request, Response } from "express";
import { prisma } from "../../db/prisma";

const normalizeMonth = (value: unknown): string | null => {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!trimmed) return null;

  // Accept `YYYY-MM` (recommended), or `YYYY-MM-DD` and coerce to `YYYY-MM`.
  const isoMonth = trimmed.match(/^(\d{4})-(0[1-9]|1[0-2])$/);
  if (isoMonth) return trimmed;
  const isoDate = trimmed.match(/^(\d{4})-(0[1-9]|1[0-2])-\d{2}/);
  if (isoDate) return trimmed.slice(0, 7);

  // Legacy: allow arbitrary month labels (e.g. "Yanvar", "January", "1-oy").
  return trimmed;
};

export const getMonitorings = async (req: Request, res: Response) => {
  try {
    const { studyYearId, gradeId, search, month } = req.query;
    const where: Prisma.MonitoringWhereInput = {};

    if (studyYearId) where.studyYearId = Number(studyYearId);
    if (month && typeof month === "string" && month.trim()) {
      where.month = normalizeMonth(month) ?? undefined;
    }

    const studentFilter: Prisma.StudentWhereInput = {};
    if (gradeId) studentFilter.gradeId = Number(gradeId);
    if (search && typeof search === "string") {
      studentFilter.OR = [
        { fullName: { contains: search, mode: "insensitive" } },
        { id: { contains: search, mode: "insensitive" } },
      ];
    }
    if (Object.keys(studentFilter).length) {
      where.student = studentFilter;
    }

    const monitorings = await prisma.monitoring.findMany({
      where,
      include: {
        student: { include: { grade: true } },
        subject: true,
        studyYear: true,
      },
      orderBy: { month: "asc" },
    });
    res.json(monitorings);
  } catch (err) {
    res.status(500).json({ message: "Failed to fetch monitorings", error: err });
  }
};

export const getMonitoringById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const monitoring = await prisma.monitoring.findUnique({
      where: { id: Number(id) },
      include: { student: { include: { grade: true } }, subject: true, studyYear: true },
    });
    if (!monitoring) return res.status(404).json({ message: "Monitoring not found" });
    res.json(monitoring);
  } catch (err) {
    res.status(500).json({ message: "Failed to fetch monitoring", error: err });
  }
};

export const createMonitoring = async (req: Request, res: Response) => {
  try {
    const month = normalizeMonth(req.body?.month);
    const score = req.body?.score;
    const studentId = req.body?.studentId;
    const subjectId = req.body?.subjectId;
    const studyYearId = req.body?.studyYearId;

    if (!month || typeof studentId !== "string" || !studentId.trim()) {
      return res.status(400).json({ message: "month and studentId are required" });
    }
    if (!Number.isFinite(Number(subjectId)) || !Number.isFinite(Number(studyYearId))) {
      return res.status(400).json({ message: "subjectId and studyYearId are required" });
    }
    if (typeof score !== "number") {
      return res.status(400).json({ message: "score must be a number" });
    }

    const monitoring = await prisma.monitoring.upsert({
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
      include: { student: { include: { grade: true } }, subject: true, studyYear: true },
    });

    res.status(201).json(monitoring);
  } catch (err) {
    res.status(500).json({ message: "Failed to create monitoring", error: err });
  }
};

export const updateMonitoring = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { score, subjectId, studyYearId } = req.body;
    const monthProvided = Object.prototype.hasOwnProperty.call(req.body ?? {}, "month");
    const month = normalizeMonth(req.body?.month);
    if (monthProvided && !month) {
      return res.status(400).json({ message: "month must be a non-empty string" });
    }
    const data: any = {};
    if (typeof score === "number") data.score = score;
    if (month) data.month = month;
    if (subjectId) data.subjectId = subjectId;
    if (studyYearId) data.studyYearId = studyYearId;
    const monitoring = await prisma.monitoring.update({
      where: { id: Number(id) },
      data,
      include: { student: { include: { grade: true } }, subject: true, studyYear: true },
    });
    res.json(monitoring);
  } catch (err) {
    res.status(500).json({ message: "Failed to update monitoring", error: err });
  }
};

export const deleteMonitoring = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    await prisma.monitoring.delete({ where: { id: Number(id) } });
    res.json({ message: "Monitoring deleted" });
  } catch (err) {
    res.status(500).json({ message: "Failed to delete monitoring", error: err });
  }
};

export const upsertBulkMonitoring = async (req: Request, res: Response) => {
  const { entries } = req.body as {
    entries: Array<{
      studentId: string;
      subjectId: number;
      studyYearId: number;
      month: string;
      score: number;
    }>;
  };

  if (!Array.isArray(entries) || !entries.length) {
    return res.status(400).json({ message: "Entries array is required" });
  }

  const normalize = (value: unknown) => normalizeMonth(value);

  try {
    const ops: any[] = [];
    for (const entry of entries) {
      const studentId = typeof entry?.studentId === "string" ? entry.studentId.trim() : "";
      const subjectId = Number(entry?.subjectId);
      const studyYearId = Number(entry?.studyYearId);
      const score = entry?.score;
      const month = normalize(entry?.month);

      if (!studentId || !Number.isFinite(subjectId) || !Number.isFinite(studyYearId) || !month) continue;
      if (typeof score !== "number") continue;

      ops.push(
        prisma.monitoring.upsert({
          where: {
            monitoring_unique: {
              studentId,
              subjectId,
              studyYearId,
              month,
            },
          },
          update: { score },
          create: { studentId, subjectId, studyYearId, month, score },
        }),
      );
    }

    const entriesSaved: any[] = [];
    const chunkSize = 500;
    for (let i = 0; i < ops.length; i += chunkSize) {
      const chunk = ops.slice(i, i + chunkSize);
      const saved = await prisma.$transaction(chunk);
      entriesSaved.push(...saved);
    }

    res.json({ updated: entriesSaved.length, entries: entriesSaved });
  } catch (err) {
    res.status(500).json({ message: "Failed to upsert monitoring entries", error: err });
  }
};
