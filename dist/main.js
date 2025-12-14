"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
require("./bot");
const app_1 = __importDefault(require("./server/app"));
const PORT = process.env.PORT || 3000;
app_1.default.listen(PORT, () => console.log(`Server started on port ${PORT}`));
console.log("bot is yuryapti!!!");
