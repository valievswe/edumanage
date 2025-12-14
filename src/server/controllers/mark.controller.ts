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
  const entriesInput = Array.isArray((req.body as any)?.entries)
    ? (req.body as any).entries
    : [];
  const studyYearIdRaw = (req.body as any)?.studyYearId;
  const gradeIdRaw = (req.body as any)?.gradeId;
  const studyYearId =
    studyYearIdRaw == null || studyYearIdRaw === ""
      ? null
      : Number(studyYearIdRaw);
  const gradeId =
    gradeIdRaw == null || gradeIdRaw === "" ? null : Number(gradeIdRaw);

  if (!entriesInput.length) {
    return res.status(400).json({ message: "Entries array is required" });
  }

  if (studyYearId != null && !Number.isFinite(studyYearId)) {
    return res.status(400).json({ message: "studyYearId must be a number" });
  }
  if (gradeId != null && !Number.isFinite(gradeId)) {
    return res.status(400).json({ message: "gradeId must be a number" });
  }

  const errors: Array<{ message: string }> = [];
  const normalized = entriesInput.map((entry, idx) => ({
    row: idx + 1,
    studentId:
      typeof entry?.studentId === "string"
        ? entry.studentId.trim()
        : String(entry?.studentId ?? "").trim(),
    subjectId: Number(entry?.subjectId),
    quarterId: Number(entry?.quarterId),
    score: Number(entry?.score),
  }));

  const studentIds = Array.from(
    new Set(
      normalized
        .map((e) => e.studentId)
        .filter((id): id is string => Boolean(id))
    )
  );
  const subjectIds = Array.from(
    new Set(
      normalized
        .map((e) => e.subjectId)
        .filter((id): id is number => Number.isFinite(id))
    )
  );
  const quarterIds = Array.from(
    new Set(
      normalized
        .map((e) => e.quarterId)
        .filter((id): id is number => Number.isFinite(id))
    )
  );

  try {
    const [students, subjects, quarters] = await Promise.all([
      prisma.student.findMany({
        where: { id: { in: studentIds } },
        select: { id: true, gradeId: true, studyYearId: true },
      }),
      prisma.subject.findMany({
        where: { id: { in: subjectIds } },
        select: { id: true },
      }),
      prisma.quarter.findMany({
        where: { id: { in: quarterIds } },
        select: { id: true, studyYearId: true },
      }),
    ]);

    const studentMap = new Map(
      students.map((s) => [s.id, { gradeId: s.gradeId, studyYearId: s.studyYearId }])
    );
    const subjectSet = new Set(subjects.map((s) => s.id));
    const quarterMap = new Map(quarters.map((q) => [q.id, q.studyYearId]));

    const ops: any[] = [];

    for (const entry of normalized) {
      if (!entry.studentId) {
        errors.push({ message: `Row ${entry.row}: studentId is required` });
        continue;
      }
      if (!Number.isFinite(entry.subjectId) || !Number.isFinite(entry.quarterId)) {
        errors.push({
          message: `Row ${entry.row}: subjectId and quarterId are required numbers`,
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
      const quarterStudyYear = quarterMap.get(entry.quarterId);
      if (!quarterStudyYear) {
        errors.push({
          message: `Row ${entry.row}: quarter ${entry.quarterId} not found`,
        });
        continue;
      }
      if (studyYearId != null && quarterStudyYear !== studyYearId) {
        errors.push({
          message: `Row ${entry.row}: quarter ${entry.quarterId} not in selected study year`,
        });
        continue;
      }
      if (student.studyYearId !== quarterStudyYear) {
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

      const whereUnique: MarkWhereUniqueInput = {
        student_subject_quarter_unique: {
          studentId: entry.studentId,
          subjectId: entry.subjectId,
          quarterId: entry.quarterId,
        },
      };

      ops.push(
        prisma.mark.upsert({
          where: whereUnique,
          update: { score: entry.score },
          create: {
            studentId: entry.studentId,
            subjectId: entry.subjectId,
            quarterId: entry.quarterId,
            score: entry.score,
          },
        })
      );
    }

    const saved: any[] = [];
    const chunkSize = 500;
    for (let i = 0; i < ops.length; i += chunkSize) {
      const chunk = ops.slice(i, i + chunkSize);
      const result = await prisma.$transaction(chunk);
      saved.push(...result);
    }

    res.json({ updated: saved.length, errors });
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
