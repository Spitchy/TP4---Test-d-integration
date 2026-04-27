// src/userRepository.js
class UserRepository {
  constructor(prisma) { this.db = prisma; }

  async create(data) {
    if (!data.email?.includes('@')) throw new Error('Email invalide');
    return this.db.user.create({ data });
  }

  async findById(id) {
    return this.db.user.findUnique({ where: { id }, include: { orders: true } });
  }

  async findByEmail(email) {
    return this.db.user.findUnique({ where: { email } });
  }

  async updateRole(id, role) {
    if (!['user', 'admin', 'moderator'].includes(role)) throw new Error('Rôle invalide');
    return this.db.user.update({ where: { id }, data: { role } });
  }

  async delete(id) {
    await this.db.order.deleteMany({ where: { userId: id } });
    return this.db.user.delete({ where: { id } });
  }

  async findAll() { return this.db.user.findMany(); }
}

module.exports = { UserRepository };
