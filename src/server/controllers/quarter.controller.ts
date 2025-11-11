import { Request, Response } from "express";
import { prisma } from "../../db/prisma";

export const getQuarters = async (_: Request, res: Response) => {
  const quarters = await prisma.quarter.findMany({
    include: { studyYear: true },
    orderBy: { id: "desc" },
  });
  res.json(quarters);
};

export const createQuarter = async (req: Request, res: Response) => {
  const { name, studyYearId, startDate, endDate } = req.body;

  const start = startDate ? new Date(startDate) : null;
  const end = endDate ? new Date(endDate) : null;

  if (!name || !studyYearId) {
    return res.status(400).json({ message: "Name and studyYearId are required" });
  }

  const quarter = await prisma.quarter.create({
    data: {
      name,
      studyYearId: Number(studyYearId),
      startDate: start ?? undefined,
      endDate: end ?? undefined,
    },
  });
  res.status(201).json(quarter);
};

export const deleteQuarter = async (req: Request, res: Response) => {
  const { id } = req.params;
  await prisma.quarter.delete({ where: { id: Number(id) } });
  res.json({ message: "Quarter deleted" });
};
