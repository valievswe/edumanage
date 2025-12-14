"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.prisma = void 0;
const client_1 = require("@prisma/client");
const adapter_pg_1 = require("@prisma/adapter-pg");
const pg_1 = require("pg");
require("dotenv/config");
const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
    throw new Error("DATABASE_URL is not defined.");
}
const pool = new pg_1.Pool({ connectionString: databaseUrl });
const adapter = new adapter_pg_1.PrismaPg(pool);
exports.prisma = new client_1.PrismaClient({ adapter });
const shutdown = async () => {
    await exports.prisma.$disconnect();
    await pool.end();
    process.exit(0);
};
process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
