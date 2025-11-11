// src/main.ts
import { bot } from "./bot/bot";
import "./bot"; 
import app from "./server/app"



const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server started on port ${PORT}`));

console.log("bot is yuryapti!!!");
