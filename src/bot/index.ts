import {bot} from "./bot"
import start from "./commands/start"
import help from "./commands/help"
import msgHandler from "./handlers/msgHandler"

// =====================================
start(bot)
help(bot)
msgHandler()

