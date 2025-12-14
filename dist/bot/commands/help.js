"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = help;
const ui_1 = require("../constants/ui");
function help(bot) {
    bot.onText(/\/help/, async (msg) => {
        const chatId = msg.chat.id;
        const helptxt = `
    Mavjud buyruqlar:

/start - Botni ishga tushirish
/help - Yordam matnini chiqarish
/student - O'quvchi haqida ma'lumot olish (yoki "${ui_1.STUDENT_ID_BUTTON}" tugmasidan foydalaning)
        
        `;
        bot.sendMessage(chatId, helptxt.trim());
    });
}
