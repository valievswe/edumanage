import { Request, Response } from "express";
import { prisma } from "../../db/prisma";

type MarkWhereInput = NonNullable<Parameters<typeof prisma.mark.findMany>[0]>["where"];
type StudentWhereInput = NonNullable<Parameters<typeof prisma.student.findMany>[0]>["where"];
type MarkWhereUniqueInput = Parameters<typeof prisma.mark.findUnique>[0]["where"];

type PrismaKnownError = { code?: string };
const isPrismaKnownError = (err: unknown): err is PrismaKnownError =>
  Boolean(err && typeof (err as any).code === "string");

export const getMarks = async (req: Request, res: Response) => {
  try {
    const { studentId, subjectId, quarterId, gradeId, studyYearId, search } =
      req.query;
    const where: MarkWhereInput = {};

    if (studentId) where.studentId = String(studentId);
    if (subjectId) where.subjectId = Number(subjectId);
    if (quarterId) where.quarterId = Number(quarterId);

    const studentFilter: StudentWhereInput = {};
    if (studyYearId) studentFilter.studyYearId = Number(studyYearId);
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

    const marks = await prisma.mark.findMany({
      where,
      include: {
        student: { include: { grade: true } },
        subject: true,
        quarter: true,
      },
      orderBy: { createdAt: "desc" },
    });
    res.json(marks);
  } catch (err) {
    res.status(500).json({ message: "Failed to fetch marks", error: err });
  }
};

export const getMarkById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const mark = await prisma.mark.findUnique({
      where: { id: Number(id) },
      include: {
        student: { include: { grade: true } },
        subject: true,
        quarter: true,
      },
    });
    if (!mark) return res.status(404).json({ message: "Mark not found" });
    res.json(mark);
  } catch (err) {
    res.status(500).json({ message: "Failed to fetch mark", error: err });
  }
};

export const createMark = async (req: Request, res: Response) => {
  try {
    const { score, studentId, subjectId, quarterId } = req.body;
    const mark = await prisma.mark.create({
      data: { score, studentId, subjectId, quarterId },
      include: {
        student: { include: { grade: true } },
        subject: true,
        quarter: true,
      },
    });
    res.status(201).json(mark);
  } catch (err) {
    if (isPrismaKnownError(err) && err.code === "P2003") {
      return res
        .status(400)
        .json({ message: "Invalid student, subject, or quarter reference" });
    }
    res.status(500).json({ message: "Failed to create mark", error: err });
  }
};

export const updateMark = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { score } = req.body;
    const mark = await prisma.mark.update({
      where: { id: Number(id) },
      data: { score },
      include: {
        student: { include: { grade: true } },
        subject: true,
        quarter: true,
      },
    });
    res.json(mark);
  } catch (err) {
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

export const deleteMark = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    await prisma.mark.delete({ where: { id: Number(id) } });
    res.json({ message: "Mark deleted" });
  } catch (err) {
    if (isPrismaKnownError(err) && err.code === "P2025") {
      return res.status(404).json({ message: "Mark not found" });
    }
    res.status(500).json({ message: "Failed to delete mark", error: err });
  }
};

export const upsertBulkMarks = async (req: Request, res: Response) => {
  const { entries } = req.body as {
    entries: Array<{
      studentId: string;
      subjectId: number;
      quarterId: number;
      score: number;
    }>;
  };

  if (!Array.isArray(entries) || !entries.length) {
    return res.status(400).json({ message: "Entries array is required" });
  }

  try {
    const results = await Promise.all(
      entries.map(async ({ studentId, subjectId, quarterId, score }) => {
        if (!studentId || !subjectId || !quarterId || typeof score !== "number")
          return null;

        const whereUnique: MarkWhereUniqueInput = {
          student_subject_quarter_unique: { studentId, subjectId, quarterId },
        };

        return prisma.mark.upsert({
          where: whereUnique,
          update: { score },
          create: { studentId, subjectId, quarterId, score },
        });
      })
    );

    const filtered = results.filter(Boolean);
    res.json({ updated: filtered.length, entries: filtered });
  } catch (err) {
    if (isPrismaKnownError(err) && err.code === "P2003") {
      return res.status(400).json({
        message:
          "One or more entries reference missing students, subjects, or quarters",
      });
    }
    res.status(500).json({ message: "Failed to upsert marks", error: err });
  }
};
