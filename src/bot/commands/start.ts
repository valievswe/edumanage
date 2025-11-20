import {bot} from "../bot"
import fs from "fs";
import {prisma} from "../../db/prisma"
import tgbot, {SendPhotoOptions } from "node-telegram-bot-api"
import path from "path"
import { MAIN_MENU_KEYBOARD, STUDENT_ID_BUTTON } from "../constants/ui";

export default function startCommand(bot: tgbot){
    bot.onText(/\/start/, async (msg)=>{
        const tgId = String(msg.from?.id);
        const username = msg.from?.username ?? null;
        const fname = msg.from?.first_name ?? null;
        const lname = msg.from?.last_name ?? null;


        const chatId = msg.chat.id;
        const starttxt = `
Assalomu alaykum KLS liderboard botiga xush kelibsiz!

Bu yerda siz o'quvchi ID raqamidan foydalanib chorak (chorak) va monitoring baholarini darhol olishingiz mumkin.

Qidiruvni boshlash uchun "${STUDENT_ID_BUTTON}" tugmasini tanlang.`

      

        const imgPath = path.join(__dirname, "../../../src/assets/image.png")
        const exists = await prisma.user.findUnique({where:{tgId}});
        
        const photoStream = fs.createReadStream(imgPath);
        if(!exists){
            await prisma.user.create({data: {tgId, username ,fname, lname}})
        }

        const rplBtn: SendPhotoOptions = {
            caption: `<b>${starttxt.trim()}</b>`,
            parse_mode: "HTML",
            reply_markup: MAIN_MENU_KEYBOARD,
        }

        bot.sendPhoto(chatId, photoStream, rplBtn)
    })
}
