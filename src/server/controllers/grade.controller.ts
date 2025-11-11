import { Request, Response } from "express";
import { prisma } from "../../db/prisma";

export const getGrades = async (_: Request, res: Response) => {
  const grades = await prisma.grade.findMany({
    orderBy: { name: "asc" },
    include: { _count: { select: { students: true } } },
  });
  res.json(grades);
};

export const createGrade = async (req: Request, res: Response) => {
  const { name } = req.body;
  if (!name) return res.status(400).json({ message: "Name is required" });

  const grade = await prisma.grade.create({ data: { name } });
  res.status(201).json(grade);
};

export const updateGrade = async (req: Request, res: Response) => {
  const { id } = req.params;
  const { name } = req.body;
  const grade = await prisma.grade.update({
    where: { id: Number(id) },
    data: { name },
  });
  res.json(grade);
};

export const deleteGrade = async (req: Request, res: Response) => {
  const { id } = req.params;
  await prisma.grade.delete({ where: { id: Number(id) } });
  res.json({ message: "Grade deleted" });
};
