import { Prisma } from "@prisma/client";
import { Request, Response } from "express";
import { prisma } from "../../db/prisma";

export const getMonitorings = async (req: Request, res: Response) => {
  try {
    const { studyYearId, gradeId, search } = req.query;
    const where: Prisma.MonitoringWhereInput = {};

    if (studyYearId) where.studyYearId = Number(studyYearId);

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
    const { month, score, studentId, subjectId, studyYearId } = req.body;
    const monitoring = await prisma.monitoring.create({
      data: { month, score, studentId, subjectId, studyYearId },
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
    const { score, month, subjectId, studyYearId } = req.body;
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
