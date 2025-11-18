import tgbot from "node-telegram-bot-api"
import { STUDENT_ID_BUTTON } from "../constants/ui";

export default function help(bot: tgbot){
    bot.onText(/\/help/, async (msg)=>{
        const chatId = msg.chat.id;

        const helptxt = `
    Mavjud buyruqlar:

/start - Botni ishga tushirish
/help - Yordam matnini chiqarish
/student - O'quvchi haqida ma'lumot olish (yoki "${STUDENT_ID_BUTTON}" tugmasidan foydalaning)
        
        `

        bot.sendMessage(chatId, helptxt.trim())
    })
}
