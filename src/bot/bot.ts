import tgbot from "node-telegram-bot-api"
import "dotenv/config"

export const bot = new tgbot(process.env.BOT_TOKEN as string, {polling: true})