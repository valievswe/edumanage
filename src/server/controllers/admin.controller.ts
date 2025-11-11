// src/server/controllers/admin.controller.ts
import { Request, Response } from "express";
import bcrypt from "bcryptjs";
import jwt, { SignOptions } from "jsonwebtoken";

import { prisma } from "../../db/prisma";
import "dotenv/config";

const JWT_SECRET = process.env.JWT_SECRET as string;
const JWT_EXPIRES = process.env.JWT_EXPIRES || "7d";

if (!JWT_SECRET) {
  throw new Error("JWT_SECRET is not defined in .env");
}

export const registerAdmin = async (req: Request, res: Response) => {
  const { username, email, password } = req.body;

  const existing = await prisma.admin.findFirst({
    where: { OR: [{ username }, { email }] },
  });
  if (existing) return res.status(400).json({ message: "Admin already exists" });

  const hashed = await bcrypt.hash(password, 10);
  const admin = await prisma.admin.create({
    data: { username, email, password: hashed },
  });

  res.status(201).json({ message: "Admin created", admin });
};

export const loginAdmin = async (req: Request, res: Response) => {
  const { email, password } = req.body;

  const admin = await prisma.admin.findUnique({ where: { email } });
  if (!admin) return res.status(404).json({ message: "Admin not found" });

  const valid = await bcrypt.compare(password, admin.password);
  if (!valid) return res.status(401).json({ message: "Invalid password" });

  const token = jwt.sign(
    { id: admin.id, email: admin.email },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES }
  );

  res.json({
    message: "Login successful",
    token,
    admin: { id: admin.id, username: admin.username, email: admin.email },
  });
};

export const getProfile = async (req: Request, res: Response) => {
  const { admin } = req as any; // injected by middleware
  res.json(admin);
};
