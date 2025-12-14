import { Request, Response } from "express";
import { prisma } from "../../db/prisma";

type PrismaKnownError = { code?: string };
const isPrismaKnownError = (err: unknown): err is PrismaKnownError =>
  Boolean(err && typeof (err as any).code === "string");

export const getSubjects = async (_: Request, res: Response) => {
  try {
    const subjects = await prisma.subject.findMany({ orderBy: { name: "asc" } });
    res.json(subjects);
  } catch (err) {
    res.status(500).json({ message: "Failed to fetch subjects", error: err });
  }
};

export const createSubject = async (req: Request, res: Response) => {
  try {
    const { name } = req.body;
    if (!name) return res.status(400).json({ message: "Name is required" });

    const subject = await prisma.subject.create({ data: { name } });
    res.status(201).json(subject);
  } catch (err: any) {
    if (err.code === "P2002") {
      return res.status(400).json({ message: "Subject with this name already exists" });
    }
    res.status(500).json({ message: "Failed to create subject", error: err });
  }
};

export const updateSubject = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { name } = req.body;
    const subject = await prisma.subject.update({
      where: { id: Number(id) },
      data: { name },
    });
    res.json(subject);
  } catch (err) {
    res.status(500).json({ message: "Failed to update subject", error: err });
  }
};

export const deleteSubject = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    await prisma.subject.delete({ where: { id: Number(id) } });
    res.json({ message: "Subject deleted" });
  } catch (err) {
    if (isPrismaKnownError(err)) {
      if (err.code === "P2025") {
        return res.status(404).json({ message: "Subject not found" });
      }
      if (err.code === "P2003") {
        return res.status(409).json({
          message:
            "Cannot delete subject because marks or monitoring records reference it",
        });
      }
    }
    res.status(500).json({ message: "Failed to delete subject", error: err });
  }
};
