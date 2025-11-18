import { bot } from "../bot";
import {
  BACK_BUTTON,
  CANCEL_KEYBOARD,
  MAIN_MENU_KEYBOARD,
  RESULT_KEYBOARD,
  SEARCH_AGAIN_BUTTON,
  STUDENT_ID_BUTTON,
} from "../constants/ui";
import { fetchStudentInfo } from "../services/studentInfo";
import { formatStudentInfoMessage } from "../utils/formatStudentInfo";

const awaitingStudentId = new Set<number>();

const isStudentIdTrigger = (text: string) =>
  text === STUDENT_ID_BUTTON || text === "Student ID" || text === "/student";

const isBackTrigger = (text: string) =>
  text === BACK_BUTTON || text === "Orqaga" || text === "Back";

const promptForStudentId = async (chatId: number) => {
  awaitingStudentId.add(chatId);
  await bot.sendMessage(
    chatId,
    "Iltimos o'quvchi ID raqamini kiriting. Bekor qilish uchun \"⬅️ Orqaga\" tugmasidan foydalaning.",
    { reply_markup: CANCEL_KEYBOARD },
  );
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

    const formatted = formatStudentInfoMessage(info);
    awaitingStudentId.delete(chatId);

    await bot.sendMessage(chatId, formatted, {
      parse_mode: "HTML",
      reply_markup: RESULT_KEYBOARD,
    });
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
      await bot.sendMessage(chatId, "Asosiy menyuga qaytdik. Kerakli bo'limni tanlang.", {
        reply_markup: MAIN_MENU_KEYBOARD,
      });
      return;
    }

    if (awaitingStudentId.has(chatId)) {
      await handleStudentLookup(chatId, text);
    }
  });
}
