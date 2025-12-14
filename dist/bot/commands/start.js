"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = startCommand;
const fs_1 = __importDefault(require("fs"));
const prisma_1 = require("../../db/prisma");
const path_1 = __importDefault(require("path"));
const ui_1 = require("../constants/ui");
function startCommand(bot) {
    bot.onText(/\/start/, async (msg) => {
        const tgId = String(msg.from?.id);
        const username = msg.from?.username ?? null;
        const fname = msg.from?.first_name ?? null;
        const lname = msg.from?.last_name ?? null;
        const chatId = msg.chat.id;
        const starttxt = `
Assalomu alaykum KLS liderboard botiga xush kelibsiz!

Bu yerda siz o'quvchi ID raqamidan foydalanib chorak (chorak) va monitoring baholarini darhol olishingiz mumkin.

Qidiruvni boshlash uchun "${ui_1.STUDENT_ID_BUTTON}" tugmasini tanlang.`;
        const imgPath = path_1.default.join(__dirname, "../../../src/assets/image.png");
        const exists = await prisma_1.prisma.user.findUnique({ where: { tgId } });
        const photoStream = fs_1.default.createReadStream(imgPath);
        if (!exists) {
            await prisma_1.prisma.user.create({ data: { tgId, username, fname, lname } });
        }
        const rplBtn = {
            caption: `<b>${starttxt.trim()}</b>`,
            parse_mode: "HTML",
            reply_markup: ui_1.MAIN_MENU_KEYBOARD,
        };
        bot.sendPhoto(chatId, photoStream, rplBtn);
    });
}
