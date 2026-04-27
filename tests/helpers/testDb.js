// tests/helpers/testDb.js — helper partagé
const { PrismaClient } = require('@prisma/client');

// SQLite en mémoire — une nouvelle DB par suite de tests
const prisma = new PrismaClient({
  datasources: { db: { url: 'file::memory:?cache=shared' } },
  log: [],
});

async function resetDb() {
  // Supprimer dans l'ordre (respecter les FK)
  await prisma.notification.deleteMany();
  await prisma.order.deleteMany();
  await prisma.user.deleteMany();
}

module.exports = { prisma, resetDb };
