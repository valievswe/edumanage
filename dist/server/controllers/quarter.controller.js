"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteQuarter = exports.createQuarter = exports.getQuarters = void 0;
const client_1 = require("@prisma/client");
const prisma_1 = require("../../db/prisma");
const isPrismaKnownError = (err) => err instanceof client_1.Prisma.PrismaClientKnownRequestError;
const getQuarters = async (_, res) => {
    const quarters = await prisma_1.prisma.quarter.findMany({
        include: { studyYear: true },
        orderBy: { id: "desc" },
    });
    res.json(quarters);
};
exports.getQuarters = getQuarters;
const createQuarter = async (req, res) => {
    const { name, studyYearId, startDate, endDate } = req.body;
    const start = startDate ? new Date(startDate) : null;
    const end = endDate ? new Date(endDate) : null;
    if (!name || !studyYearId) {
        return res.status(400).json({ message: "Name and studyYearId are required" });
    }
    const quarter = await prisma_1.prisma.quarter.create({
        data: {
            name,
            studyYearId: Number(studyYearId),
            startDate: start ?? undefined,
            endDate: end ?? undefined,
        },
    });
    res.status(201).json(quarter);
};
exports.createQuarter = createQuarter;
const deleteQuarter = async (req, res) => {
    try {
        const { id } = req.params;
        await prisma_1.prisma.quarter.delete({ where: { id: Number(id) } });
        res.json({ message: "Quarter deleted" });
    }
    catch (err) {
        if (isPrismaKnownError(err)) {
            if (err.code === "P2025") {
                return res.status(404).json({ message: "Quarter not found" });
            }
            if (err.code === "P2003") {
                return res.status(409).json({
                    message: "Cannot delete quarter while marks reference it",
                });
            }
        }
        res.status(500).json({ message: "Failed to delete quarter", error: err });
    }
};
exports.deleteQuarter = deleteQuarter;
