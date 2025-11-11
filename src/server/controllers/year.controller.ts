import { Request, Response } from "express";
import { prisma } from "../../db/prisma";

export const getYears = async (_: Request, res: Response) => {
  const years = await prisma.studyYear.findMany({
    orderBy: { startDate: "desc" },
    include: {
      quarters: {
        orderBy: { startDate: "asc" },
      },
    },
  });
  res.json(years);
};

export const createYear = async (req: Request, res: Response) => {
  const { name, startDate, endDate } = req.body;

  const start = new Date(startDate);
  const end = new Date(endDate);

  if (!name || isNaN(start.getTime()) || isNaN(end.getTime())) {
    return res.status(400).json({ message: "Invalid name or dates" });
  }

  const year = await prisma.studyYear.create({
    data: {
      name,
      startDate: start,
      endDate: end,
    },
  });
  res.status(201).json(year);
};

export const deleteYear = async (req: Request, res: Response) => {
  const { id } = req.params;
  await prisma.studyYear.delete({ where: { id: Number(id) } });
  res.json({ message: "Study year deleted" });
};

export const updateYear = async (req: Request, res: Response) => {
  const { id } = req.params;
  const { name, startDate, endDate } = req.body;

  const data: any = {};
  if (name) data.name = name;
  if (startDate) data.startDate = new Date(startDate);
  if (endDate) data.endDate = new Date(endDate);

  const year = await prisma.studyYear.update({
    where: { id: Number(id) },
    data,
    include: { quarters: { orderBy: { startDate: "asc" } } },
  });

  res.json(year);
};
