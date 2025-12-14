"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteGrade = exports.updateGrade = exports.createGrade = exports.getGrades = void 0;
const prisma_1 = require("../../db/prisma");
const getGrades = async (_, res) => {
    const grades = await prisma_1.prisma.grade.findMany({
        orderBy: { name: "asc" },
        include: { _count: { select: { students: true } } },
    });
    res.json(grades);
};
exports.getGrades = getGrades;
const createGrade = async (req, res) => {
    const { name } = req.body;
    if (!name)
        return res.status(400).json({ message: "Name is required" });
    const grade = await prisma_1.prisma.grade.create({ data: { name } });
    res.status(201).json(grade);
};
exports.createGrade = createGrade;
const updateGrade = async (req, res) => {
    const { id } = req.params;
    const { name } = req.body;
    const grade = await prisma_1.prisma.grade.update({
        where: { id: Number(id) },
        data: { name },
    });
    res.json(grade);
};
exports.updateGrade = updateGrade;
const deleteGrade = async (req, res) => {
    const { id } = req.params;
    await prisma_1.prisma.grade.delete({ where: { id: Number(id) } });
    res.json({ message: "Grade deleted" });
};
exports.deleteGrade = deleteGrade;
