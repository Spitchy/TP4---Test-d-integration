// tests/notificationService.test.js
// Exercice 6 — BONUS — Pipeline de tests complet
// NotificationService combine API externe (email) ET persistance DB (Prisma)

const { prisma, resetDb } = require('./helpers/testDb');
const { NotificationService } = require('../src/notificationService');

describe('NotificationService', () => {
  let service;
  let mockEmailClient;
  let testUser;

  beforeEach(async () => {
    await resetDb();

    // Mock de l'axios instance (emailClient)
    mockEmailClient = {
      post: jest.fn(),
    };

    service = new NotificationService(prisma, mockEmailClient);

    // Seed : créer un utilisateur de test
    testUser = await prisma.user.create({
      data: { name: 'Test User', email: 'test@example.com' }
    });
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  describe('send()', () => {
    // Test 35 — send() → email envoyé ET notification persistée en base
    test('envoie un email ET persiste la notification avec status "sent"', async () => {
      // ARRANGE
      mockEmailClient.post.mockResolvedValue({ status: 200 });

      // ACT
      const result = await service.send(testUser.id, 'Bienvenue !', 'Bonjour Alice');

      // ASSERT — email envoyé
      expect(mockEmailClient.post).toHaveBeenCalledTimes(1);
      expect(mockEmailClient.post).toHaveBeenCalledWith('/mail/send', {
        to: testUser.email,
        subject: 'Bienvenue !',
        body: 'Bonjour Alice',
      });

      // ASSERT — persistée en base
      expect(result.id).toBeDefined();
      expect(result.userId).toBe(testUser.id);
      expect(result.subject).toBe('Bienvenue !');
      expect(result.status).toBe('sent');

      // Vérifier en base
      const fromDb = await prisma.notification.findUnique({ where: { id: result.id } });
      expect(fromDb).not.toBeNull();
      expect(fromDb.status).toBe('sent');
    });

    // Test 36 — send() avec API email qui échoue → notification sauvée avec status 'failed'
    test('sauvegarde la notification avec status "failed" si l\'API email échoue', async () => {
      // ARRANGE
      mockEmailClient.post.mockRejectedValue(new Error('SendGrid unavailable'));

      // ACT
      const result = await service.send(testUser.id, 'Sujet', 'Corps du message');

      // ASSERT — pas d'exception levée, status = failed
      expect(result.status).toBe('failed');
      expect(result.userId).toBe(testUser.id);

      // Vérifier en base
      const fromDb = await prisma.notification.findUnique({ where: { id: result.id } });
      expect(fromDb.status).toBe('failed');
    });

    // Test 37 — send() avec userId inexistant → Error levée, aucun email envoyé
    test('lève une erreur pour userId inexistant et n\'envoie aucun email', async () => {
      // ACT & ASSERT
      await expect(service.send(99999, 'Sujet', 'Corps'))
        .rejects
        .toThrow('Utilisateur introuvable');

      // Aucun email envoyé
      expect(mockEmailClient.post).not.toHaveBeenCalled();

      // Aucune notification persistée
      const notifs = await prisma.notification.findMany();
      expect(notifs).toHaveLength(0);
    });
  });

  describe('getHistory()', () => {
    // Test 38 — getHistory(userId) → retourne uniquement les notifications de cet utilisateur
    test('retourne uniquement les notifications de l\'utilisateur demandé', async () => {
      // ARRANGE — créer un 2ème utilisateur avec ses propres notifications
      const otherUser = await prisma.user.create({
        data: { name: 'Other', email: 'other@example.com' }
      });

      mockEmailClient.post.mockResolvedValue({ status: 200 });

      await service.send(testUser.id, 'Notif 1', 'Corps 1');
      await service.send(testUser.id, 'Notif 2', 'Corps 2');
      await service.send(otherUser.id, 'Notif Autre', 'Corps Autre');

      // ACT
      const history = await service.getHistory(testUser.id);

      // ASSERT
      expect(history).toHaveLength(2);
      history.forEach(n => expect(n.userId).toBe(testUser.id));

      // L'autre utilisateur n'est pas dans l'historique
      const otherHistory = await service.getHistory(otherUser.id);
      expect(otherHistory).toHaveLength(1);
    });

    test('retourne un tableau vide si l\'utilisateur n\'a pas de notifications', async () => {
      const history = await service.getHistory(testUser.id);
      expect(history).toEqual([]);
    });
  });

  describe('retry()', () => {
    // Test 39 — retry(id) sur notification 'failed' → renvoie l'email
    test('renvoie l\'email et met le status à "sent" pour une notification "failed"', async () => {
      // ARRANGE — créer directement une notification failed
      const failedNotif = await prisma.notification.create({
        data: {
          userId: testUser.id,
          subject: 'Sujet',
          body: 'Corps',
          status: 'failed',
        }
      });
      mockEmailClient.post.mockResolvedValue({ status: 200 });

      // ACT
      const result = await service.retry(failedNotif.id);

      // ASSERT
      expect(mockEmailClient.post).toHaveBeenCalledTimes(1);
      expect(result.status).toBe('sent');

      // Vérifier en base
      const fromDb = await prisma.notification.findUnique({ where: { id: failedNotif.id } });
      expect(fromDb.status).toBe('sent');
    });

    // Test 40 — retry(id) sur notification 'sent' → Error('Déjà envoyé')
    test('lève Error("Déjà envoyé") pour une notification déjà envoyée', async () => {
      // ARRANGE
      const sentNotif = await prisma.notification.create({
        data: {
          userId: testUser.id,
          subject: 'Sujet',
          body: 'Corps',
          status: 'sent',
        }
      });

      // ACT & ASSERT
      await expect(service.retry(sentNotif.id))
        .rejects
        .toThrow('Déjà envoyé');

      // Aucun email envoyé
      expect(mockEmailClient.post).not.toHaveBeenCalled();
    });
  });
});
