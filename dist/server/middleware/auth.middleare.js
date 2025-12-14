"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.verifyAdmin = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const prisma_1 = require("../../db/prisma");
const JWT_SECRET = process.env.JWT_SECRET;
const verifyAdmin = async (req, res, next) => {
    const auth = req.headers.authorization;
    if (!auth || !auth.startsWith("Bearer ")) {
        return res.status(401).json({ message: "No token provided" });
    }
    try {
        const token = auth.split(" ")[1];
        const decoded = jsonwebtoken_1.default.verify(token, JWT_SECRET);
        const admin = await prisma_1.prisma.admin.findUnique({ where: { id: decoded.id } });
        if (!admin)
            return res.status(401).json({ message: "Invalid token" });
        req.admin = admin;
        next();
    }
    catch {
        return res.status(401).json({ message: "Unauthorized" });
    }
};
exports.verifyAdmin = verifyAdmin;
