import { Lucia } from 'lucia';
import { PrismaAdapter } from '@lucia-auth/adapter-prisma';
import { prisma } from '@agentworks/db';

const adapter = new PrismaAdapter(prisma.session, prisma.user);

// In production, set cookie domain to .agentworksstudio.com for cross-subdomain auth
const isProduction = process.env.NODE_ENV === 'production';
const cookieDomain = isProduction ? '.agentworksstudio.com' : undefined;

export const lucia = new Lucia(adapter, {
  sessionCookie: {
    attributes: {
      secure: isProduction,
      domain: cookieDomain,
      sameSite: 'lax',
    },
  },
  getUserAttributes: (attributes) => ({
    email: attributes.email,
    name: attributes.name,
    avatarUrl: attributes.avatarUrl,
  }),
});

declare module 'lucia' {
  interface Register {
    Lucia: typeof lucia;
    DatabaseUserAttributes: {
      email: string;
      name: string;
      avatarUrl: string | null;
    };
  }
}
