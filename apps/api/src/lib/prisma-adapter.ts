import type { Adapter, DatabaseSession, DatabaseUser } from 'lucia';
import type { PrismaClient } from '@agentworks/db';

export class PrismaAdapter implements Adapter {
  private prisma: PrismaClient;

  constructor(sessionModel: PrismaClient['session'], userModel: PrismaClient['user']) {
    this.prisma = sessionModel as unknown as PrismaClient;
  }

  async deleteSession(sessionId: string): Promise<void> {
    await this.prisma.session.delete({ where: { id: sessionId } }).catch(() => {});
  }

  async deleteUserSessions(userId: string): Promise<void> {
    await this.prisma.session.deleteMany({ where: { userId } });
  }

  async getSessionAndUser(sessionId: string): Promise<[session: DatabaseSession | null, user: DatabaseUser | null]> {
    const result = await this.prisma.session.findUnique({
      where: { id: sessionId },
      include: { user: true },
    });

    if (!result) return [null, null];

    const session: DatabaseSession = {
      id: result.id,
      userId: result.userId,
      expiresAt: result.expiresAt,
      attributes: {},
    };

    const user: DatabaseUser = {
      id: result.user.id,
      attributes: {
        email: result.user.email,
        name: result.user.name,
        avatarUrl: result.user.avatarUrl,
      },
    };

    return [session, user];
  }

  async getUserSessions(userId: string): Promise<DatabaseSession[]> {
    const sessions = await this.prisma.session.findMany({ where: { userId } });
    return sessions.map((s) => ({
      id: s.id,
      userId: s.userId,
      expiresAt: s.expiresAt,
      attributes: {},
    }));
  }

  async setSession(session: DatabaseSession): Promise<void> {
    await this.prisma.session.create({
      data: {
        id: session.id,
        userId: session.userId,
        expiresAt: session.expiresAt,
      },
    });
  }

  async updateSessionExpiration(sessionId: string, expiresAt: Date): Promise<void> {
    await this.prisma.session.update({
      where: { id: sessionId },
      data: { expiresAt },
    });
  }

  async deleteExpiredSessions(): Promise<void> {
    await this.prisma.session.deleteMany({
      where: { expiresAt: { lt: new Date() } },
    });
  }
}
