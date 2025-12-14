"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteSubject = exports.updateSubject = exports.createSubject = exports.getSubjects = void 0;
const client_1 = require("@prisma/client");
const prisma_1 = require("../../db/prisma");
const isPrismaKnownError = (err) => err instanceof client_1.Prisma.PrismaClientKnownRequestError;
const getSubjects = async (_, res) => {
    try {
        const subjects = await prisma_1.prisma.subject.findMany({ orderBy: { name: "asc" } });
        res.json(subjects);
    }
    catch (err) {
        res.status(500).json({ message: "Failed to fetch subjects", error: err });
    }
};
exports.getSubjects = getSubjects;
const createSubject = async (req, res) => {
    try {
        const { name } = req.body;
        if (!name)
            return res.status(400).json({ message: "Name is required" });
        const subject = await prisma_1.prisma.subject.create({ data: { name } });
        res.status(201).json(subject);
    }
    catch (err) {
        if (err.code === "P2002") {
            return res.status(400).json({ message: "Subject with this name already exists" });
        }
        res.status(500).json({ message: "Failed to create subject", error: err });
    }
};
exports.createSubject = createSubject;
const updateSubject = async (req, res) => {
    try {
        const { id } = req.params;
        const { name } = req.body;
        const subject = await prisma_1.prisma.subject.update({
            where: { id: Number(id) },
            data: { name },
        });
        res.json(subject);
    }
    catch (err) {
        res.status(500).json({ message: "Failed to update subject", error: err });
    }
};
exports.updateSubject = updateSubject;
const deleteSubject = async (req, res) => {
    try {
        const { id } = req.params;
        await prisma_1.prisma.subject.delete({ where: { id: Number(id) } });
        res.json({ message: "Subject deleted" });
    }
    catch (err) {
        if (isPrismaKnownError(err)) {
            if (err.code === "P2025") {
                return res.status(404).json({ message: "Subject not found" });
            }
            if (err.code === "P2003") {
                return res.status(409).json({
                    message: "Cannot delete subject because marks or monitoring records reference it",
                });
            }
        }
        res.status(500).json({ message: "Failed to delete subject", error: err });
    }
};
exports.deleteSubject = deleteSubject;
