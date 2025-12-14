"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const bot_1 = require("./bot");
const start_1 = __importDefault(require("./commands/start"));
const help_1 = __importDefault(require("./commands/help"));
const msgHandler_1 = __importDefault(require("./handlers/msgHandler"));
// =====================================
(0, start_1.default)(bot_1.bot);
(0, help_1.default)(bot_1.bot);
(0, msgHandler_1.default)();
