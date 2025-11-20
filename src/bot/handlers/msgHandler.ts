import type { InlineKeyboardButton, InlineKeyboardMarkup } from "node-telegram-bot-api";
import { bot } from "../bot";
import {
  BACK_BUTTON,
  CANCEL_KEYBOARD,
  MAIN_MENU_KEYBOARD,
  SEARCH_AGAIN_BUTTON,
  STUDENT_ID_BUTTON,
} from "../constants/ui";
import { fetchStudentInfo, StudentInfo } from "../services/studentInfo";
import {
  formatMonitoringDetails,
  formatQuarterDetails,
  formatStudentSummary,
} from "../utils/formatStudentInfo";

const awaitingStudentId = new Set<number>();

type StudentSession = {
  studentId: string;
  info: StudentInfo;
  lastAccess: number;
};

const studentSessions = new Map<number, StudentSession>();
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

const isStudentIdTrigger = (text: string) =>
  text === STUDENT_ID_BUTTON || text === "Student ID" || text === "/student";

const isBackTrigger = (text: string) =>
  text === BACK_BUTTON || text === "Orqaga" || text === "Back";

const encode = (value: string) => encodeURIComponent(value);
const decode = (value: string) => decodeURIComponent(value);

const chunkButtons = (buttons: InlineKeyboardButton[], size = 2): InlineKeyboardButton[][] => {
  const rows: InlineKeyboardButton[][] = [];
  for (let i = 0; i < buttons.length; i += size) {
    rows.push(buttons.slice(i, i + size));
  }
  return rows;
};

const collectMonths = (info: StudentInfo): string[] => {
  const seen = new Set<string>();
  const months: string[] = [];

  info.monitorings.forEach((subject) => {
    subject.entries.forEach((entry) => {
      const month = entry.month.trim();
      if (!month || seen.has(month)) return;
      seen.add(month);
      months.push(month);
    });
  });

  return months.sort((a, b) => {
    const rankA = getMonthRank(a);
    const rankB = getMonthRank(b);
    if (rankA === rankB) {
      return a.localeCompare(b, "uz");
    }
    return rankA - rankB;
  });
};

const getMonthRank = (month: string) => {
  const normalized = month.trim().toLowerCase();
  const index = MONTH_KEYWORDS.findIndex((keyword) => normalized.includes(keyword));
  return index === -1 ? MONTH_KEYWORDS.length + 1 : index;
};

const buildModeKeyboard = (): InlineKeyboardMarkup => ({
  inline_keyboard: [
    [
      { text: "🏅 Chorak baholar", callback_data: "mode:quarter" },
      { text: "📊 Monitoring baholar", callback_data: "mode:monitoring" },
    ],
  ],
});

const buildQuarterKeyboard = (info: StudentInfo): InlineKeyboardMarkup => {
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

const buildMonitoringKeyboard = (months: string[]): InlineKeyboardMarkup => {
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

const buildDetailBackKeyboard = (
  target: "quarterList" | "monitoringList",
): InlineKeyboardMarkup => ({
  inline_keyboard: [
    [{ text: "⬅️ Orqaga", callback_data: `back:${target}` }],
    [{ text: "🏠 Chorak / Monitoring", callback_data: "back:mode" }],
  ],
});

const buildBackToModeKeyboard = (): InlineKeyboardMarkup => ({
  inline_keyboard: [[{ text: "⬅️ Chorak / Monitoring", callback_data: "back:mode" }]],
});

const getActiveSession = (chatId: number): StudentSession | null => {
  const session = studentSessions.get(chatId);
  if (!session) return null;
  if (Date.now() - session.lastAccess > SESSION_TTL_MS) {
    studentSessions.delete(chatId);
    return null;
  }
  session.lastAccess = Date.now();
  return session;
};

const setSession = (chatId: number, info: StudentInfo, studentId: string) => {
  studentSessions.set(chatId, { studentId, info, lastAccess: Date.now() });
};

const clearSession = (chatId: number) => {
  studentSessions.delete(chatId);
};

const promptForStudentId = async (chatId: number) => {
  clearSession(chatId);
  awaitingStudentId.add(chatId);
  await bot.sendMessage(
    chatId,
    "Iltimos o'quvchi ID raqamini kiriting. Bekor qilish uchun \"⬅️ Orqaga\" tugmasidan foydalaning.",
    { reply_markup: CANCEL_KEYBOARD },
  );
};

const sendModeSelection = async (chatId: number, info: StudentInfo) => {
  const summary = formatStudentSummary(info);
  await bot.sendMessage(chatId, summary, {
    parse_mode: "HTML",
    reply_markup: buildModeKeyboard(),
  });
};

const sendQuarterList = async (chatId: number, info: StudentInfo) => {
  if (!info.quarters.length) {
    await bot.sendMessage(chatId, "Bu o'quvchi uchun chorak baholari hali kiritilmagan.", {
      reply_markup: buildBackToModeKeyboard(),
    });
    return;
  }

  await bot.sendMessage(chatId, "Qaysi chorakni ko'rishni xohlaysiz?", {
    reply_markup: buildQuarterKeyboard(info),
  });
};

const sendMonitoringList = async (chatId: number, info: StudentInfo) => {
  const months = collectMonths(info);
  if (!months.length) {
    await bot.sendMessage(chatId, "Bu o'quvchi uchun monitoring natijalari hali kiritilmagan.", {
      reply_markup: buildBackToModeKeyboard(),
    });
    return;
  }

  await bot.sendMessage(chatId, "Kerakli oy yoki hisobot davrini tanlang.", {
    reply_markup: buildMonitoringKeyboard(months),
  });
};

const handleStudentLookup = async (chatId: number, studentId: string) => {
  try {
    await bot.sendChatAction(chatId, "typing");
    const info = await fetchStudentInfo(studentId);

    if (!info) {
      await bot.sendMessage(
        chatId,
        `❗️ ID <code>${studentId}</code> bo'yicha ma'lumot topilmadi. Iltimos, ID ni tekshirib qayta yuboring.`,
        { parse_mode: "HTML" },
      );
      return;
    }

    awaitingStudentId.delete(chatId);
    setSession(chatId, info, studentId);

    await bot.sendMessage(chatId, "Ma'lumot topildi. Kerakli bo'limni pastdagi tugmalardan tanlang.", {
      reply_markup: MAIN_MENU_KEYBOARD,
    });
    await sendModeSelection(chatId, info);
  } catch (error) {
    console.error("Failed to fetch student data", error);
    awaitingStudentId.delete(chatId);
    await bot.sendMessage(
      chatId,
      "Kutilmagan xatolik yuz berdi. Bir necha soniyadan so'ng qayta urinib ko'ring.",
      {
        reply_markup: MAIN_MENU_KEYBOARD,
      },
    );
  }
};

type CallbackAction =
  | { type: "mode"; mode: "quarter" | "monitoring" }
  | { type: "quarter"; quarter: string }
  | { type: "month"; month: string }
  | { type: "back"; target: "mode" | "quarterList" | "monitoringList" };

const parseCallbackData = (data: string): CallbackAction | null => {
  const [type, value] = data.split(":");
  if (!type) return null;

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

export default function msgHandler() {
  bot.on("message", async (msg) => {
    const chatId = msg.chat.id;
    const text = msg.text?.trim();

    if (!text) {
      if (awaitingStudentId.has(chatId)) {
        await bot.sendMessage(chatId, "Iltimos, faqat matn ko'rinishidagi ID yuboring.", {
          reply_markup: CANCEL_KEYBOARD,
        });
      }
      return;
    }

    if (isStudentIdTrigger(text) || text === SEARCH_AGAIN_BUTTON) {
      await promptForStudentId(chatId);
      return;
    }

    if (isBackTrigger(text)) {
      awaitingStudentId.delete(chatId);
      clearSession(chatId);
      await bot.sendMessage(chatId, "Asosiy menyuga qaytdik. Kerakli bo'limni tanlang.", {
        reply_markup: MAIN_MENU_KEYBOARD,
      });
      return;
    }

    if (awaitingStudentId.has(chatId)) {
      await handleStudentLookup(chatId, text);
    }
  });

  bot.on("callback_query", async (query) => {
    const chatId = query.message?.chat.id;
    const data = query.data;

    if (!chatId || !data) {
      await bot.answerCallbackQuery({ callback_query_id: query.id });
      return;
    }

    const action = parseCallbackData(data);
    if (!action) {
      await bot.answerCallbackQuery({
        callback_query_id: query.id,
        text: "Noma'lum buyruq.",
        show_alert: false,
      });
      return;
    }

    const session = getActiveSession(chatId);
    if (!session) {
      await bot.answerCallbackQuery({ callback_query_id: query.id });
      await bot.sendMessage(
        chatId,
        "Sessiya muddati tugagan. Iltimos, o'quvchi ID sini qayta kiriting.",
        { reply_markup: MAIN_MENU_KEYBOARD },
      );
      return;
    }

    switch (action.type) {
      case "mode":
        await bot.answerCallbackQuery({ callback_query_id: query.id });
        if (action.mode === "quarter") {
          await sendQuarterList(chatId, session.info);
        } else {
          await sendMonitoringList(chatId, session.info);
        }
        break;
      case "quarter": {
        const message = formatQuarterDetails(session.info, action.quarter);
        await bot.answerCallbackQuery({ callback_query_id: query.id });
        await bot.sendMessage(chatId, message, {
          parse_mode: "HTML",
          reply_markup: buildDetailBackKeyboard("quarterList"),
        });
        break;
      }
      case "month": {
        const message = formatMonitoringDetails(session.info, action.month);
        await bot.answerCallbackQuery({ callback_query_id: query.id });
        await bot.sendMessage(chatId, message, {
          parse_mode: "HTML",
          reply_markup: buildDetailBackKeyboard("monitoringList"),
        });
        break;
      }
      case "back":
        await bot.answerCallbackQuery({ callback_query_id: query.id });
        if (action.target === "mode") {
          await sendModeSelection(chatId, session.info);
        } else if (action.target === "quarterList") {
          await sendQuarterList(chatId, session.info);
        } else {
          await sendMonitoringList(chatId, session.info);
        }
        break;
    }
  });
}
