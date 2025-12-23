// Polyfill for global crypto (required by Lucia in Node.js)
import { webcrypto } from 'node:crypto';
if (typeof globalThis.crypto === 'undefined') {
  (globalThis as unknown as { crypto: typeof webcrypto }).crypto = webcrypto;
}

import { config } from 'dotenv';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

// Load .env from repo root (apps/api/src -> apps/api -> apps -> root)
config({ path: resolve(__dirname, '..', '..', '..', '.env') });

import Fastify from 'fastify';
import cors from '@fastify/cors';
import cookie from '@fastify/cookie';
import websocket from '@fastify/websocket';
import multipart from '@fastify/multipart';
import { authRoutes } from './routes/auth.js';
import { workspaceRoutes } from './routes/workspaces.js';
import { projectRoutes } from './routes/projects.js';
import { boardRoutes } from './routes/boards.js';
import { cardRoutes } from './routes/cards.js';
import { agentRoutes } from './routes/agents.js';
import { usageRoutes } from './routes/usage.js';
import { websocketRoutes } from './routes/websocket.js';
import { chatRoutes } from './routes/chat.js';
import { mediaRoutes } from './routes/media.js';
import { adminRoutes } from './routes/admin/index.js';
import { waitlistRoutes } from './routes/waitlist.js';
import { affiliateRoutes } from './routes/affiliate.js';
import { checkoutRoutes } from './routes/checkout.js';
import { copilotRoutes } from './routes/copilot.js';
import uiAgentRoutes from './routes/ui-agent.js';
import { byoaRoutes } from './routes/byoa.js';
import { projectFilesRoutes } from './routes/project-files.js';
import { styleGuideRoutes } from './routes/style-guide.js';
import { gitRoutes } from './routes/git.js';
import { userRoutes } from './routes/user.js';
import { providersRoutes } from './routes/providers.js';
import { filesystemRoutes } from './routes/filesystem.js';
import { githubRoutes } from './routes/github.js';
import { contextRoutes } from './routes/context.js';
import { collaborationRoutes } from './routes/collaboration.js';
import { databaseRoutes } from './routes/database.js';
import { launchRoutes } from './routes/launch.js';

const app = Fastify({
  logger: true,
});

await app.register(cors, {
  origin: [
    process.env.FRONTEND_URL || 'http://localhost:5173',
    process.env.ADMIN_URL || 'http://localhost:3020',
    process.env.MARKETING_URL || 'http://localhost:3012',
  ],
  credentials: true,
});

await app.register(cookie, {
  secret: process.env.COOKIE_SECRET || 'super-secret-cookie-key-change-in-production',
});

await app.register(websocket);

await app.register(multipart, {
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB max for profile photos
  },
});

app.get('/health', async () => ({ status: 'ok' }));

await app.register(authRoutes, { prefix: '/api/auth' });
await app.register(workspaceRoutes, { prefix: '/api/workspaces' });
await app.register(projectRoutes, { prefix: '/api/projects' });
await app.register(boardRoutes, { prefix: '/api/boards' });
await app.register(cardRoutes, { prefix: '/api/cards' });
await app.register(agentRoutes, { prefix: '/api/agents' });
await app.register(usageRoutes, { prefix: '/api/usage' });
await app.register(chatRoutes, { prefix: '/api/chat' });
await app.register(mediaRoutes, { prefix: '/api/media' });
await app.register(adminRoutes, { prefix: '/api/admin' });
await app.register(waitlistRoutes, { prefix: '/api/waitlist' });
await app.register(affiliateRoutes, { prefix: '/api/affiliate' });
await app.register(checkoutRoutes, { prefix: '/api/checkout' });
await app.register(copilotRoutes, { prefix: '/api/copilot' });
await app.register(uiAgentRoutes, { prefix: '/api/ui-agent' });
await app.register(byoaRoutes, { prefix: '/api/byoa' });
await app.register(projectFilesRoutes, { prefix: '/api/projects' });
await app.register(styleGuideRoutes, { prefix: '/api/projects' });
await app.register(gitRoutes, { prefix: '/api/projects' });
await app.register(userRoutes, { prefix: '/api/user' });
await app.register(providersRoutes, { prefix: '/api/providers' });
await app.register(filesystemRoutes, { prefix: '/api/filesystem' });
await app.register(githubRoutes, { prefix: '/api/github' });
await app.register(contextRoutes, { prefix: '/api/context' });
await app.register(collaborationRoutes, { prefix: '/api/collaboration' });
await app.register(databaseRoutes, { prefix: '/api/database' });
await app.register(launchRoutes, { prefix: '/api/launch' });
await app.register(websocketRoutes);

const port = parseInt(process.env.PORT || '3010', 10);
const host = process.env.HOST || '0.0.0.0';

try {
  await app.listen({ port, host });
  console.log(`Server running at http://${host}:${port}`);
} catch (err) {
  app.log.error(err);
  process.exit(1);
}
