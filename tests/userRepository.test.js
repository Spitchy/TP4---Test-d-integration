// tests/userRepository.test.js
// Exercice 3 — Base de données en mémoire — Prisma + SQLite

const { prisma, resetDb } = require('./helpers/testDb');
const { UserRepository } = require('../src/userRepository');

describe('UserRepository', () => {
  let repo;

  // Test 24 — beforeEach() appelle resetDb() → chaque test part d'une base vide
  beforeEach(async () => {
    await resetDb();
    repo = new UserRepository(prisma);
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  describe('create()', () => {
    // Test 15 — create() avec email valide → utilisateur créé avec id auto-incrémenté
    test('crée un utilisateur avec un email valide et un id auto-incrémenté', async () => {
      // ACT
      const user = await repo.create({ name: 'Alice', email: 'alice@example.com' });

      // ASSERT
      expect(user.id).toBeDefined();
      expect(user.id).toBeGreaterThan(0);
      expect(user.name).toBe('Alice');
      expect(user.email).toBe('alice@example.com');
      expect(user.role).toBe('user'); // valeur par défaut
    });

    // Test 18 — create() avec email sans @ → lève Error('Email invalide')
    test('lève Error("Email invalide") pour un email sans @', async () => {
      await expect(repo.create({ name: 'Bob', email: 'bob-sans-arobase.com' }))
        .rejects
        .toThrow('Email invalide');
    });

    // Test 19 — create() deux fois le même email → Prisma lève erreur contrainte unique
    test('lève une erreur de contrainte unique pour un email dupliqué', async () => {
      // ARRANGE
      await repo.create({ name: 'Alice', email: 'alice@example.com' });

      // ACT & ASSERT
      await expect(repo.create({ name: 'Alice2', email: 'alice@example.com' }))
        .rejects
        .toThrow(); // Prisma lève P2002 (unique constraint)
    });
  });

  describe('findById()', () => {
    // Test 16 — create() puis findById() → retourne le bon utilisateur avec orders:[]
    test('retourne le bon utilisateur avec orders:[] après création', async () => {
      // ARRANGE
      const created = await repo.create({ name: 'Alice', email: 'alice@example.com' });

      // ACT
      const found = await repo.findById(created.id);

      // ASSERT
      expect(found).not.toBeNull();
      expect(found.id).toBe(created.id);
      expect(found.name).toBe('Alice');
      expect(found.email).toBe('alice@example.com');
      expect(found.orders).toEqual([]); // pas de commandes
    });

    test('retourne null pour un id inexistant', async () => {
      const found = await repo.findById(99999);
      expect(found).toBeNull();
    });
  });

  describe('findByEmail()', () => {
    // Test 17 — create() puis findByEmail() → retourne le bon utilisateur
    test('retourne le bon utilisateur après création par email', async () => {
      // ARRANGE
      const created = await repo.create({ name: 'Bob', email: 'bob@example.com' });

      // ACT
      const found = await repo.findByEmail('bob@example.com');

      // ASSERT
      expect(found).not.toBeNull();
      expect(found.id).toBe(created.id);
      expect(found.name).toBe('Bob');
    });
  });

  describe('updateRole()', () => {
    // Test 20 — updateRole(id, 'admin') → role mis à jour en base
    test('met à jour le rôle en "admin" correctement', async () => {
      // ARRANGE
      const user = await repo.create({ name: 'Charlie', email: 'charlie@example.com' });

      // ACT
      const updated = await repo.updateRole(user.id, 'admin');

      // ASSERT
      expect(updated.role).toBe('admin');

      // Vérifier en base
      const fromDb = await repo.findById(user.id);
      expect(fromDb.role).toBe('admin');
    });

    // Test 21 — updateRole(id, 'superuser') → lève Error('Rôle invalide')
    test('lève Error("Rôle invalide") pour un rôle non autorisé', async () => {
      // ARRANGE
      const user = await repo.create({ name: 'Dave', email: 'dave@example.com' });

      // ACT & ASSERT
      await expect(repo.updateRole(user.id, 'superuser'))
        .rejects
        .toThrow('Rôle invalide');
    });
  });

  describe('delete()', () => {
    // Test 22 — delete(id) → utilisateur supprimé, findById retourne null
    test('supprime un utilisateur et findById retourne null', async () => {
      // ARRANGE
      const user = await repo.create({ name: 'Eve', email: 'eve@example.com' });

      // ACT
      await repo.delete(user.id);

      // ASSERT
      const found = await repo.findById(user.id);
      expect(found).toBeNull();
    });
  });

  describe('findAll()', () => {
    // Test 23 — findAll() après 3 créations → retourne 3 utilisateurs
    test('retourne 3 utilisateurs après 3 créations', async () => {
      // ARRANGE
      await repo.create({ name: 'User1', email: 'user1@example.com' });
      await repo.create({ name: 'User2', email: 'user2@example.com' });
      await repo.create({ name: 'User3', email: 'user3@example.com' });

      // ACT
      const all = await repo.findAll();

      // ASSERT
      expect(all).toHaveLength(3);
    });

    test('retourne un tableau vide sur une base vide', async () => {
      const all = await repo.findAll();
      expect(all).toEqual([]);
    });
  });
});
