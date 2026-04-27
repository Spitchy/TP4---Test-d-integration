// src/notificationService.js
class NotificationService {
  constructor(prisma, emailClient) {
    this.db = prisma;
    this.email = emailClient; // axios instance mockée
  }

  // Envoie un email ET sauvegarde en BDD
  async send(userId, subject, body) {
    // Vérifier que l'utilisateur existe
    const user = await this.db.user.findUnique({ where: { id: userId } });
    if (!user) throw new Error('Utilisateur introuvable');

    let status = 'sent';

    try {
      await this.email.post('/mail/send', {
        to: user.email,
        subject,
        body,
      });
    } catch (err) {
      status = 'failed';
    }

    // Persister en base dans tous les cas
    const notification = await this.db.notification.create({
      data: { userId, subject, body, status }
    });

    return notification;
  }

  // Retourne toutes les notifications d'un utilisateur
  async getHistory(userId) {
    return this.db.notification.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' }
    });
  }

  // Renvoie les notifications en échec
  async retry(notificationId) {
    const notification = await this.db.notification.findUnique({
      where: { id: notificationId },
      include: { user: true }
    });

    if (!notification) throw new Error('Notification introuvable');
    if (notification.status === 'sent') throw new Error('Déjà envoyé');

    await this.email.post('/mail/send', {
      to: notification.user.email,
      subject: notification.subject,
      body: notification.body,
    });

    return this.db.notification.update({
      where: { id: notificationId },
      data: { status: 'sent' }
    });
  }
}

module.exports = { NotificationService };
