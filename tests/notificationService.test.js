const { prisma, resetDb } = require('./helpers/testDb');
const { NotificationService } = require('../src/notificationService');

describe('NotificationService', () => {
  let service;
  let mockEmailClient;
  let testUser;

  beforeEach(async () => {
    await resetDb(); // Chaque test repart d'une base vide [cite: 168, 253]

    mockEmailClient = {
      post: jest.fn(),
    };

    service = new NotificationService(prisma, mockEmailClient);

    // Seed : créer l'utilisateur nécessaire aux tests
    testUser = await prisma.user.create({
      data: { name: 'Test User', email: 'test@example.com' }
    });
  });

  // IMPORTANT : Fermer la connexion pour éviter les "open handles" [cite: 312, 377]
  afterAll(async () => {
    await prisma.$disconnect();
  });

  describe('send()', () => {
    test('envoie un email ET persiste la notification avec status "sent"', async () => {
      mockEmailClient.post.mockResolvedValue({ status: 200 });

      const result = await service.send(testUser.id, 'Bienvenue !', 'Bonjour Alice');

      expect(mockEmailClient.post).toHaveBeenCalledTimes(1);
      expect(result.status).toBe('sent'); // Vérification du succès [cite: 407]
    });

    test('sauvegarde la notification avec status "failed" si l\'API email échoue', async () => {
      mockEmailClient.post.mockRejectedValue(new Error('SendGrid unavailable'));

      const result = await service.send(testUser.id, 'Sujet', 'Corps');

      expect(result.status).toBe('failed'); // Persistance même en cas d'échec API [cite: 408]
    });
  });

  // Tes autres blocs (getHistory, retry) sont corrects, garde-les tels quels.
});