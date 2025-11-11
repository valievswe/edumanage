import tgbot from "node-telegram-bot-api"

export default function help(bot: tgbot){
    bot.onText(/\/help/, async (msg)=>{
        const chatId = msg.chat.id;

        const helptxt = `
    Mavjud buyruqlar to'plami:

/start - Botni ishga tushirish
/help - Yordam tekstini chiqarish
/student - O'quvchi haqida ma'lumot olish
        
        `

        bot.sendMessage(chatId, helptxt.trim())
    })
}