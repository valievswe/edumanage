"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getProfile = exports.loginAdmin = exports.registerAdmin = void 0;
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const prisma_1 = require("../../db/prisma");
require("dotenv/config");
const JWT_SECRET = process.env.JWT_SECRET;
const JWT_EXPIRES = process.env.JWT_EXPIRES || "7d";
if (!JWT_SECRET) {
    throw new Error("JWT_SECRET is not defined in .env");
}
const registerAdmin = async (req, res) => {
    const { username, email, password } = req.body;
    const existing = await prisma_1.prisma.admin.findFirst({
        where: { OR: [{ username }, { email }] },
    });
    if (existing)
        return res.status(400).json({ message: "Admin already exists" });
    const hashed = await bcryptjs_1.default.hash(password, 10);
    const admin = await prisma_1.prisma.admin.create({
        data: { username, email, password: hashed },
    });
    res.status(201).json({ message: "Admin created", admin });
};
exports.registerAdmin = registerAdmin;
const loginAdmin = async (req, res) => {
    const { email, password } = req.body;
    const admin = await prisma_1.prisma.admin.findUnique({ where: { email } });
    if (!admin)
        return res.status(404).json({ message: "Admin not found" });
    const valid = await bcryptjs_1.default.compare(password, admin.password);
    if (!valid)
        return res.status(401).json({ message: "Invalid password" });
    const token = jsonwebtoken_1.default.sign({ id: admin.id, email: admin.email }, JWT_SECRET, { expiresIn: JWT_EXPIRES });
    res.json({
        message: "Login successful",
        token,
        admin: { id: admin.id, username: admin.username, email: admin.email },
    });
};
exports.loginAdmin = loginAdmin;
const getProfile = async (req, res) => {
    const { admin } = req; // injected by middleware
    res.json(admin);
};
exports.getProfile = getProfile;
