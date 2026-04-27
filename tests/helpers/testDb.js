// tests/helpers/testDb.js
const { PrismaClient } = require('@prisma/client');

// On utilise l'URL SQLite par défaut
const prisma = new PrismaClient();

async function resetDb() {
  try {
    // NETTOYAGE PUR : Pas de texte [cite] ici !
    await prisma.notification.deleteMany(); 
    await prisma.order.deleteMany(); 
    await prisma.user.deleteMany(); 
  } catch (error) {
    console.log("Note: Les tables n'existent peut-être pas encore. Lancez 'npx prisma db push'.");
  }
}

module.exports = { prisma, resetDb };