// src/orderService.js
class OrderService {
  constructor(prisma) { this.db = prisma; }

  async placeOrder(userId, items) {
    const user = await this.db.user.findUnique({ where: { id: userId } });
    if (!user) throw new Error('Utilisateur introuvable');
    if (!items?.length) throw new Error('Panier vide');

    const total = items.reduce((s, i) => s + i.price * i.qty, 0);

    return this.db.$transaction(async (tx) => {
      const order = await tx.order.create({
        data: { userId, total, status: 'confirmed' }
      });
      return order;
    });
  }

  async getUserOrders(userId) {
    return this.db.order.findMany({
      where: { userId },
      orderBy: { id: 'desc' }
    });
  }

  async cancelOrder(orderId) {
    const order = await this.db.order.findUnique({ where: { id: orderId } });
    if (!order) throw new Error('Commande introuvable');
    if (order.status === 'shipped') throw new Error('Commande déjà expédiée');
    return this.db.order.update({
      where: { id: orderId }, data: { status: 'cancelled' }
    });
  }

  async getStats() {
    const orders = await this.db.order.findMany();
    const total = orders.reduce((s, o) => s + o.total, 0);
    return { count: orders.length, totalRevenue: total };
  }
}

module.exports = { OrderService };
