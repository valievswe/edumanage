import { Prisma } from "@prisma/client";
import { Request, Response } from "express";
import { prisma } from "../../db/prisma";

export const getStudents = async (req: Request, res: Response) => {
  try {
    const { search, studyYearId, gradeId } = req.query;
    const where: Prisma.StudentWhereInput = {};

    if (studyYearId) where.studyYearId = Number(studyYearId);
    if (gradeId) where.gradeId = Number(gradeId);
    if (search && typeof search === "string") {
      where.OR = [
        { fullName: { contains: search, mode: "insensitive" } },
        { id: { contains: search, mode: "insensitive" } },
      ];
    }

    const students = await prisma.student.findMany({
      where,
      include: { marks: true, monitorings: true, grade: true },
      orderBy: { fullName: "asc" },
    });
    res.json(students);
  } catch (err) {
    res.status(500).json({ message: "Failed to fetch students", error: err });
  }
};

export const getStudentById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const student = await prisma.student.findUnique({
      where: { id },
      include: { marks: true, monitorings: true, grade: true },
    });
    if (!student) return res.status(404).json({ message: "Student not found" });
    res.json(student);
  } catch (err) {
    res.status(500).json({ message: "Failed to fetch student", error: err });
  }
};

export const createStudent = async (req: Request, res: Response) => {
  try {
    const { id, fullName, gradeId, studyYearId } = req.body;
    const existing = await prisma.student.findUnique({ where: { id } });
    if (existing)
      return res.status(400).json({ message: "Student with this ID already exists" });

    const student = await prisma.student.create({
      data: { id, fullName, gradeId, studyYearId },
      include: { grade: true },
    });
    res.status(201).json(student);
  } catch (err) {
    res.status(500).json({ message: "Failed to create student", error: err });
  }
};

export const getStudentMarks = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const student = await prisma.student.findUnique({
      where: { id },
      include: {
        marks: {
          include: { subject: true, quarter: true },
        },
        monitorings: {
          include: { subject: true },
        },
        grade: true,
      },
    });

    if (!student) return res.status(404).json({ message: "Student not found" });

    res.json({
      id: student.id,
      name: student.fullName,
      grade: student.grade?.name,
      marks: student.marks.map((m) => ({
        subject: m.subject.name,
        quarter: m.quarter.name,
        score: m.score,
      })),
      monitoring: student.monitorings.map((m) => ({
        subject: m.subject.name,
        month: m.month,
        score: m.score,
      })),
    });
  } catch (err) {
    res.status(500).json({ message: "Error fetching marks", error: err });
  }
};

export const updateStudent = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { fullName, gradeId } = req.body;
    const student = await prisma.student.update({
      where: { id },
      data: { fullName, gradeId },
      include: { grade: true },
    });
    res.json(student);
  } catch (err) {
    res.status(500).json({ message: "Failed to update student", error: err });
  }
};

export const deleteStudent = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    await prisma.student.delete({ where: { id } });
    res.json({ message: "Student deleted" });
  } catch (err) {
    res.status(500).json({ message: "Failed to delete student", error: err });
  }
};
