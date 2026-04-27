// tests/orderService.test.js
// Exercice 4 — DB en mémoire avancée — Relations & Transactions

const { prisma, resetDb } = require('./helpers/testDb');
const { OrderService } = require('../src/orderService');

describe('OrderService', () => {
  let service;
  let testUser;

  // Test 34 — Seed de test : créer les données dans beforeEach, vérifier l'isolation entre tests
  beforeEach(async () => {
    await resetDb();
    service = new OrderService(prisma);

    // Seed : créer un utilisateur de test réutilisable dans tous les tests
    testUser = await prisma.user.create({
      data: { name: 'Alice Test', email: 'alice@test.com' }
    });
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  describe('placeOrder()', () => {
    const items = [
      { price: 10, qty: 2 },  // 20
      { price: 5, qty: 3 },   // 15
    ];
    // total attendu : 35

    // Test 25 — placeOrder(userId, items) → commande créée avec le bon total calculé
    test('crée une commande avec le bon total calculé', async () => {
      // ACT
      const order = await service.placeOrder(testUser.id, items);

      // ASSERT
      expect(order.id).toBeDefined();
      expect(order.total).toBe(35);
      expect(order.status).toBe('confirmed');
    });

    // Test 26 — placeOrder() → commande liée au bon utilisateur (relation FK respectée)
    test('lie la commande au bon utilisateur (FK respectée)', async () => {
      // ACT
      const order = await service.placeOrder(testUser.id, items);

      // ASSERT
      expect(order.userId).toBe(testUser.id);

      // Vérifier via getUserOrders
      const userOrders = await service.getUserOrders(testUser.id);
      expect(userOrders).toHaveLength(1);
      expect(userOrders[0].id).toBe(order.id);
    });

    // Test 27 — placeOrder() avec userId inexistant → lève Error('Utilisateur introuvable')
    test('lève Error("Utilisateur introuvable") pour un userId inexistant', async () => {
      await expect(service.placeOrder(99999, items))
        .rejects
        .toThrow('Utilisateur introuvable');
    });

    // Test 28 — placeOrder() avec panier vide → lève Error('Panier vide')
    test('lève Error("Panier vide") pour un panier vide', async () => {
      await expect(service.placeOrder(testUser.id, []))
        .rejects
        .toThrow('Panier vide');
    });

    test('lève Error("Panier vide") quand items est null', async () => {
      await expect(service.placeOrder(testUser.id, null))
        .rejects
        .toThrow('Panier vide');
    });
  });

  describe('getUserOrders()', () => {
    // Test 29 — getUserOrders(userId) → retourne toutes les commandes de l'utilisateur
    test('retourne toutes les commandes de l\'utilisateur', async () => {
      // ARRANGE
      await service.placeOrder(testUser.id, [{ price: 10, qty: 1 }]);
      await service.placeOrder(testUser.id, [{ price: 20, qty: 1 }]);

      // ACT
      const orders = await service.getUserOrders(testUser.id);

      // ASSERT
      expect(orders).toHaveLength(2);
      orders.forEach(o => expect(o.userId).toBe(testUser.id));
    });

    // Test 30 — getUserOrders() après 2 placeOrder → retourne 2 commandes triées par id desc
    test('retourne 2 commandes triées par id desc après 2 placeOrder', async () => {
      // ARRANGE
      const order1 = await service.placeOrder(testUser.id, [{ price: 10, qty: 1 }]);
      const order2 = await service.placeOrder(testUser.id, [{ price: 20, qty: 1 }]);

      // ACT
      const orders = await service.getUserOrders(testUser.id);

      // ASSERT
      expect(orders).toHaveLength(2);
      // Triées par id DESC → order2 en premier
      expect(orders[0].id).toBe(order2.id);
      expect(orders[1].id).toBe(order1.id);
    });

    test('retourne un tableau vide si l\'utilisateur n\'a pas de commandes', async () => {
      const orders = await service.getUserOrders(testUser.id);
      expect(orders).toEqual([]);
    });
  });

  describe('cancelOrder()', () => {
    // Test 31 — cancelOrder(id) → status mis à 'cancelled'
    test('met le status à "cancelled"', async () => {
      // ARRANGE
      const order = await service.placeOrder(testUser.id, [{ price: 15, qty: 2 }]);

      // ACT
      const cancelled = await service.cancelOrder(order.id);

      // ASSERT
      expect(cancelled.status).toBe('cancelled');

      // Vérifier en base
      const fromDb = await prisma.order.findUnique({ where: { id: order.id } });
      expect(fromDb.status).toBe('cancelled');
    });

    // Test 32 — cancelOrder() sur commande 'shipped' → lève Error('Commande déjà expédiée')
    test('lève Error("Commande déjà expédiée") pour une commande shipped', async () => {
      // ARRANGE — créer directement en base avec status shipped
      const shippedOrder = await prisma.order.create({
        data: { userId: testUser.id, total: 50, status: 'shipped' }
      });

      // ACT & ASSERT
      await expect(service.cancelOrder(shippedOrder.id))
        .rejects
        .toThrow('Commande déjà expédiée');
    });

    test('lève Error("Commande introuvable") pour un id inexistant', async () => {
      await expect(service.cancelOrder(99999))
        .rejects
        .toThrow('Commande introuvable');
    });
  });

  describe('getStats()', () => {
    // Test 33 — getStats() après 3 commandes → count=3 et totalRevenue=somme correcte
    test('retourne count=3 et totalRevenue correct après 3 commandes', async () => {
      // ARRANGE
      await service.placeOrder(testUser.id, [{ price: 10, qty: 1 }]);  // 10
      await service.placeOrder(testUser.id, [{ price: 20, qty: 2 }]);  // 40
      await service.placeOrder(testUser.id, [{ price: 5, qty: 6 }]);   // 30
      // total = 80

      // ACT
      const stats = await service.getStats();

      // ASSERT
      expect(stats.count).toBe(3);
      expect(stats.totalRevenue).toBeCloseTo(80, 5);
    });

    test('retourne count=0 et totalRevenue=0 sans commandes', async () => {
      const stats = await service.getStats();
      expect(stats.count).toBe(0);
      expect(stats.totalRevenue).toBe(0);
    });
  });
});
