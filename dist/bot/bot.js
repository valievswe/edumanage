"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.bot = void 0;
const node_telegram_bot_api_1 = __importDefault(require("node-telegram-bot-api"));
require("dotenv/config");
exports.bot = new node_telegram_bot_api_1.default(process.env.BOT_TOKEN, { polling: true });
