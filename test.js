const { PrismaClient } = require('@prisma/client'); const prisma = new PrismaClient(); console.log('OK'); prisma.$disconnect();
