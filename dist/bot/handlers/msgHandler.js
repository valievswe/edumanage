"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = msgHandler;
const bot_1 = require("../bot");
const ui_1 = require("../constants/ui");
const studentInfo_1 = require("../services/studentInfo");
const formatStudentInfo_1 = require("../utils/formatStudentInfo");
const studentPdf_1 = require("../utils/studentPdf");
const awaitingStudentId = new Set();
const studentSessions = new Map();
const SESSION_TTL_MS = 15 * 60 * 1000; // 15 minutes
const MONTH_KEYWORDS = [
    "yanvar",
    "fevral",
    "mart",
    "aprel",
    "may",
    "iyun",
    "iyul",
    "avgust",
    "sentyabr",
    "sentabr",
    "oktyabr",
    "noyabr",
    "dekabr",
    "january",
    "february",
    "march",
    "april",
    "june",
    "july",
    "august",
    "september",
    "october",
    "november",
    "december",
];
const parseYearMonth = (value) => {
    const match = value.trim().match(/^(\d{4})-(0[1-9]|1[0-2])$/);
    if (!match)
        return null;
    const year = Number(match[1]);
    const month = Number(match[2]);
    if (!Number.isFinite(year) || !Number.isFinite(month))
        return null;
    return year * 12 + (month - 1);
};
const isStudentIdTrigger = (text) => text === ui_1.STUDENT_ID_BUTTON || text === "Student ID" || text === "/student";
const isBackTrigger = (text) => text === ui_1.BACK_BUTTON || text === "Orqaga" || text === "Back";
const encode = (value) => encodeURIComponent(value);
const decode = (value) => decodeURIComponent(value);
const chunkButtons = (buttons, size = 2) => {
    const rows = [];
    for (let i = 0; i < buttons.length; i += size) {
        rows.push(buttons.slice(i, i + size));
    }
    return rows;
};
const collectMonths = (info) => {
    const seen = new Set();
    const months = [];
    info.monitorings.forEach((subject) => {
        subject.entries.forEach((entry) => {
            const month = entry.month.trim();
            if (!month || seen.has(month))
                return;
            seen.add(month);
            months.push(month);
        });
    });
    return months.sort((a, b) => {
        const ymA = parseYearMonth(a);
        const ymB = parseYearMonth(b);
        if (ymA != null && ymB != null)
            return ymA - ymB;
        if (ymA != null)
            return -1;
        if (ymB != null)
            return 1;
        const rankA = getMonthRank(a);
        const rankB = getMonthRank(b);
        if (rankA === rankB) {
            return a.localeCompare(b, "uz");
        }
        return rankA - rankB;
    });
};
const getMonthRank = (month) => {
    const normalized = month.trim().toLowerCase();
    const index = MONTH_KEYWORDS.findIndex((keyword) => normalized.includes(keyword));
    return index === -1 ? MONTH_KEYWORDS.length + 1 : index;
};
const buildModeKeyboard = () => ({
    inline_keyboard: [
        [
            { text: "🏅 Chorak baholar", callback_data: "mode:quarter" },
            { text: "📊 Monitoring baholar", callback_data: "mode:monitoring" },
        ],
    ],
});
const buildQuarterKeyboard = (info) => {
    const buttons = info.quarters.map((quarter) => ({
        text: quarter.quarterName,
        callback_data: `quarter:${encode(quarter.quarterName)}`,
    }));
    return {
        inline_keyboard: [
            ...chunkButtons(buttons, 2),
            [{ text: "⬅️ Chorak / Monitoring", callback_data: "back:mode" }],
        ],
    };
};
const buildMonitoringKeyboard = (months) => {
    const buttons = months.map((month) => ({
        text: month,
        callback_data: `month:${encode(month)}`,
    }));
    return {
        inline_keyboard: [
            ...chunkButtons(buttons, 2),
            [{ text: "⬅️ Chorak / Monitoring", callback_data: "back:mode" }],
        ],
    };
};
const buildDetailBackKeyboard = (target) => ({
    inline_keyboard: [
        [{ text: "⬅️ Orqaga", callback_data: `back:${target}` }],
        [{ text: "🏠 Chorak / Monitoring", callback_data: "back:mode" }],
    ],
});
const buildBackToModeKeyboard = () => ({
    inline_keyboard: [[{ text: "⬅️ Chorak / Monitoring", callback_data: "back:mode" }]],
});
const getActiveSession = (chatId) => {
    const session = studentSessions.get(chatId);
    if (!session)
        return null;
    if (Date.now() - session.lastAccess > SESSION_TTL_MS) {
        studentSessions.delete(chatId);
        return null;
    }
    session.lastAccess = Date.now();
    return session;
};
const setSession = (chatId, info, studentId) => {
    studentSessions.set(chatId, { studentId, info, lastAccess: Date.now() });
};
const clearSession = (chatId) => {
    studentSessions.delete(chatId);
};
const promptForStudentId = async (chatId) => {
    clearSession(chatId);
    awaitingStudentId.add(chatId);
    await bot_1.bot.sendMessage(chatId, "Iltimos o'quvchi ID raqamini kiriting. Bekor qilish uchun \"⬅️ Orqaga\" tugmasidan foydalaning.", { reply_markup: ui_1.CANCEL_KEYBOARD });
};
const sendModeSelection = async (chatId, info) => {
    const summary = (0, formatStudentInfo_1.formatStudentSummary)(info);
    await bot_1.bot.sendMessage(chatId, summary, {
        parse_mode: "HTML",
        reply_markup: buildModeKeyboard(),
    });
};
const sendQuarterList = async (chatId, info) => {
    if (!info.quarters.length) {
        await bot_1.bot.sendMessage(chatId, "Bu o'quvchi uchun chorak baholari hali kiritilmagan.", {
            reply_markup: buildBackToModeKeyboard(),
        });
        return;
    }
    await bot_1.bot.sendMessage(chatId, "Qaysi chorakni ko'rishni xohlaysiz?", {
        reply_markup: buildQuarterKeyboard(info),
    });
};
const sendMonitoringList = async (chatId, info) => {
    const months = collectMonths(info);
    if (!months.length) {
        await bot_1.bot.sendMessage(chatId, "Bu o'quvchi uchun monitoring natijalari hali kiritilmagan.", {
            reply_markup: buildBackToModeKeyboard(),
        });
        return;
    }
    await bot_1.bot.sendMessage(chatId, "Kerakli oy yoki hisobot davrini tanlang.", {
        reply_markup: buildMonitoringKeyboard(months),
    });
};
const handleStudentLookup = async (chatId, studentId) => {
    try {
        await bot_1.bot.sendChatAction(chatId, "typing");
        const info = await (0, studentInfo_1.fetchStudentInfo)(studentId);
        if (!info) {
            await bot_1.bot.sendMessage(chatId, `❗️ ID <code>${studentId}</code> bo'yicha ma'lumot topilmadi. Iltimos, ID ni tekshirib qayta yuboring.`, { parse_mode: "HTML" });
            return;
        }
        awaitingStudentId.delete(chatId);
        setSession(chatId, info, studentId);
        await bot_1.bot.sendMessage(chatId, "Ma'lumot topildi. Kerakli bo'limni pastdagi tugmalardan tanlang.", {
            reply_markup: ui_1.MAIN_MENU_KEYBOARD,
        });
        await sendModeSelection(chatId, info);
        // Send a PDF snapshot right after the text summary (best-effort).
        try {
            const pdf = await (0, studentPdf_1.buildStudentPdf)(info);
            await bot_1.bot.sendDocument(chatId, pdf, {
                caption: "📄 O'quvchi ma'lumotlari (PDF)",
            }, {
                filename: `student-${info.id}-${info.studyYearName}.pdf`,
                contentType: "application/pdf",
            });
        }
        catch (pdfError) {
            console.error("Failed to generate/send PDF", pdfError);
        }
    }
    catch (error) {
        console.error("Failed to fetch student data", error);
        awaitingStudentId.delete(chatId);
        await bot_1.bot.sendMessage(chatId, "Kutilmagan xatolik yuz berdi. Bir necha soniyadan so'ng qayta urinib ko'ring.", {
            reply_markup: ui_1.MAIN_MENU_KEYBOARD,
        });
    }
};
const parseCallbackData = (data) => {
    const [type, value] = data.split(":");
    if (!type)
        return null;
    switch (type) {
        case "mode":
            if (value === "quarter" || value === "monitoring") {
                return { type: "mode", mode: value };
            }
            return null;
        case "quarter":
            return value ? { type: "quarter", quarter: decode(value) } : null;
        case "month":
            return value ? { type: "month", month: decode(value) } : null;
        case "back":
            if (value === "mode" || value === "quarterList" || value === "monitoringList") {
                return { type: "back", target: value };
            }
            return null;
        default:
            return null;
    }
};
function msgHandler() {
    bot_1.bot.on("message", async (msg) => {
        const chatId = msg.chat.id;
        const text = msg.text?.trim();
        if (!text) {
            if (awaitingStudentId.has(chatId)) {
                await bot_1.bot.sendMessage(chatId, "Iltimos, faqat matn ko'rinishidagi ID yuboring.", {
                    reply_markup: ui_1.CANCEL_KEYBOARD,
                });
            }
            return;
        }
        if (isStudentIdTrigger(text) || text === ui_1.SEARCH_AGAIN_BUTTON) {
            await promptForStudentId(chatId);
            return;
        }
        if (isBackTrigger(text)) {
            awaitingStudentId.delete(chatId);
            clearSession(chatId);
            await bot_1.bot.sendMessage(chatId, "Asosiy menyuga qaytdik. Kerakli bo'limni tanlang.", {
                reply_markup: ui_1.MAIN_MENU_KEYBOARD,
            });
            return;
        }
        if (awaitingStudentId.has(chatId)) {
            await handleStudentLookup(chatId, text);
        }
    });
    bot_1.bot.on("callback_query", async (query) => {
        const chatId = query.message?.chat.id;
        const data = query.data;
        if (!chatId || !data) {
            await bot_1.bot.answerCallbackQuery({ callback_query_id: query.id });
            return;
        }
        const action = parseCallbackData(data);
        if (!action) {
            await bot_1.bot.answerCallbackQuery({
                callback_query_id: query.id,
                text: "Noma'lum buyruq.",
                show_alert: false,
            });
            return;
        }
        const session = getActiveSession(chatId);
        if (!session) {
            await bot_1.bot.answerCallbackQuery({ callback_query_id: query.id });
            await bot_1.bot.sendMessage(chatId, "Sessiya muddati tugagan. Iltimos, o'quvchi ID sini qayta kiriting.", { reply_markup: ui_1.MAIN_MENU_KEYBOARD });
            return;
        }
        switch (action.type) {
            case "mode":
                await bot_1.bot.answerCallbackQuery({ callback_query_id: query.id });
                if (action.mode === "quarter") {
                    await sendQuarterList(chatId, session.info);
                }
                else {
                    await sendMonitoringList(chatId, session.info);
                }
                break;
            case "quarter": {
                const message = (0, formatStudentInfo_1.formatQuarterDetails)(session.info, action.quarter);
                await bot_1.bot.answerCallbackQuery({ callback_query_id: query.id });
                await bot_1.bot.sendMessage(chatId, message, {
                    parse_mode: "HTML",
                    reply_markup: buildDetailBackKeyboard("quarterList"),
                });
                break;
            }
            case "month": {
                const message = (0, formatStudentInfo_1.formatMonitoringDetails)(session.info, action.month);
                await bot_1.bot.answerCallbackQuery({ callback_query_id: query.id });
                await bot_1.bot.sendMessage(chatId, message, {
                    parse_mode: "HTML",
                    reply_markup: buildDetailBackKeyboard("monitoringList"),
                });
                break;
            }
            case "back":
                await bot_1.bot.answerCallbackQuery({ callback_query_id: query.id });
                if (action.target === "mode") {
                    await sendModeSelection(chatId, session.info);
                }
                else if (action.target === "quarterList") {
                    await sendQuarterList(chatId, session.info);
                }
                else {
                    await sendMonitoringList(chatId, session.info);
                }
                break;
        }
    });
}
