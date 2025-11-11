import {bot} from "../bot"
import fs from "fs";
import {prisma} from "../../db/prisma"
import tgbot, {SendPhotoOptions } from "node-telegram-bot-api"
import path from "path"

export default function startCommand(bot: tgbot){
    bot.onText(/\/start/, async (msg)=>{
        const tgId = String(msg.from?.id);
        const username = msg.from?.username ?? null;
        const fname = msg.from?.first_name ?? null;
        const lname = msg.from?.last_name ?? null;


        const chatId = msg.chat.id;
        const starttxt = `
Assalomu alaykum KLS liderboardga xush kelibsiz

Ushbu bot orqali siz o'quvchi ID raqami bilan uning chorak va monitoring baholarini olishingiz mumkin!
        `

      

        const imgPath = path.join(__dirname, "../../assets/image.png")
        const exists = await prisma.user.findUnique({where:{tgId}});
        
        const photoStream = fs.createReadStream(imgPath);
        if(!exists){
            await prisma.user.create({data: {tgId, username ,fname, lname}})
        }

        const rplBtn: SendPhotoOptions = {
            caption: `<b>${starttxt}</b>`,
            parse_mode: "HTML",
            reply_markup:{
                keyboard: [
                    [{text: "Student ID"}],
                    [{text: "Back"}]
                ],
                resize_keyboard:true,
                one_time_keyboard:false,
            },

        }

        bot.sendPhoto(chatId, photoStream, rplBtn)
    })
}
