// src/server/middlewares/auth.middleware.ts
import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { prisma } from "../../db/prisma";

const JWT_SECRET = process.env.JWT_SECRET as string;

export const verifyAdmin = async (req: Request, res: Response, next: NextFunction) => {
  const auth = req.headers.authorization;
  if (!auth || !auth.startsWith("Bearer ")) {
    return res.status(401).json({ message: "No token provided" });
  }

  try {
    const token = auth.split(" ")[1];
    const decoded = jwt.verify(token, JWT_SECRET) as { id: number };
    const admin = await prisma.admin.findUnique({ where: { id: decoded.id } });
    if (!admin) return res.status(401).json({ message: "Invalid token" });

    (req as any).admin = admin;
    next();
  } catch {
    return res.status(401).json({ message: "Unauthorized" });
  }
};
