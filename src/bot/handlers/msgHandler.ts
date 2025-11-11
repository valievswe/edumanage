import { bot } from "../bot";
import { prisma } from "../../db/prisma";
import { get } from "http";

const getStudentId: Record<number, boolean> = {}

export default function msgHandler(){
    bot.on("message", async (msg)=>{
        const chatId = msg.chat.id;
        const txt = msg.text?.trim()

        if(txt === "Student ID"){
            getStudentId[chatId] = true;
            await bot.sendMessage(chatId, "Iltimos o'quvchi IDsini kiriting:");
            return;
        }

        if(getStudentId[chatId]){
            const studentId = msg.text?.trim(); 

            const student = await prisma.student.findUnique({where: {id: studentId}})
        
            if(student){
                await bot.sendMessage(chatId, "Topildi")
            }else{
                await bot.sendMessage(chatId, "Topilmadi")
            }

            getStudentId[chatId] = false;
            return;
        }

        if(txt === "Orqaga"){
            getStudentId[chatId] =false;
            await bot.sendMessage(chatId, "Bekor qilindi!");
            return;
        }


    })
}