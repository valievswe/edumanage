"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RESULT_KEYBOARD = exports.CANCEL_KEYBOARD = exports.MAIN_MENU_KEYBOARD = exports.BACK_BUTTON = exports.SEARCH_AGAIN_BUTTON = exports.STUDENT_ID_BUTTON = void 0;
exports.STUDENT_ID_BUTTON = "🔍 O'quvchi ID";
exports.SEARCH_AGAIN_BUTTON = "♻️ Yana ID qidirish";
exports.BACK_BUTTON = "⬅️ Orqaga";
const buildKeyboard = (buttons) => ({
    keyboard: buttons.map((row) => row.map((text) => ({ text }))),
    resize_keyboard: true,
    one_time_keyboard: false,
});
exports.MAIN_MENU_KEYBOARD = buildKeyboard([[exports.STUDENT_ID_BUTTON], [exports.BACK_BUTTON]]);
exports.CANCEL_KEYBOARD = buildKeyboard([[exports.BACK_BUTTON]]);
exports.RESULT_KEYBOARD = buildKeyboard([[exports.SEARCH_AGAIN_BUTTON], [exports.BACK_BUTTON]]);
