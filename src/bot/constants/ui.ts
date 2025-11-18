import { ReplyKeyboardMarkup } from "node-telegram-bot-api";

export const STUDENT_ID_BUTTON = "🔍 O'quvchi ID";
export const SEARCH_AGAIN_BUTTON = "♻️ Yana ID qidirish";
export const BACK_BUTTON = "⬅️ Orqaga";

const buildKeyboard = (buttons: string[][]): ReplyKeyboardMarkup => ({
  keyboard: buttons.map((row) => row.map((text) => ({ text }))),
  resize_keyboard: true,
  one_time_keyboard: false,
});

export const MAIN_MENU_KEYBOARD = buildKeyboard([[STUDENT_ID_BUTTON], [BACK_BUTTON]]);
export const CANCEL_KEYBOARD = buildKeyboard([[BACK_BUTTON]]);
export const RESULT_KEYBOARD = buildKeyboard([[SEARCH_AGAIN_BUTTON], [BACK_BUTTON]]);

