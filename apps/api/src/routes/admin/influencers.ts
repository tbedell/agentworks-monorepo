import type { FastifyPluginAsync } from 'fastify';
import { prisma, Prisma } from '@agentworks/db';
import { adminAuthMiddleware } from './auth.js';
import { randomBytes } from 'crypto';

// Types for conversions
interface Conversion {
  id: string;
  amount: number;
  commission: number;
  status: string;
}

// Types for influencer stats
interface InfluencerWithAffiliateConversions {
  affiliate: {
    conversions: Array<{
      amount: number;
      commission: number;
    }>;
  } | null;
}

// Platforms for influencers
const PLATFORMS = ['youtube', 'twitter', 'indie_hackers', 'linkedin', 'tiktok', 'newsletter', 'podcast', 'blog'] as const;

type Platform = typeof PLATFORMS[number];

// Generate unique access code
function generateAccessCode(prefix = 'INF'): string {
  const random = randomBytes(4).toString('hex').toUpperCase();
  return `${prefix}-${random}`;
}

export const adminInfluencersRoutes: FastifyPluginAsync = async (app) => {
  // Protect all routes
  app.addHook('preHandler', adminAuthMiddleware);

  // Get all influencers with stats
  app.get('/', async (request) => {
    const { platform, active, search, limit = 50, offset = 0 } = request.query as {
      platform?: Platform;
      active?: string;
      search?: string;
      limit?: number;
      offset?: number;
    };

    const where: Prisma.InfluencerAccessWhereInput = {};

    if (platform) {
      where.platform = platform;
    }

    if (active !== undefined) {
      where.isActive = active === 'true';
    }

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
        { handle: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [influencers, total] = await Promise.all([
      prisma.influencerAccess.findMany({
        where,
        include: {
          affiliate: {
            include: {
              conversions: {
                select: {
                  id: true,
                  amount: true,
                  commission: true,
                  status: true,
                },
              },
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        take: Number(limit),
        skip: Number(offset),
      }),
      prisma.influencerAccess.count({ where }),
    ]);

    // Calculate stats for each influencer
    const influencersWithStats = influencers.map((inf: typeof influencers[number]) => {
      const conversions = inf.affiliate?.conversions || [];
      const confirmedConversions = conversions.filter((c: Conversion) => c.status === 'confirmed');

      return {
        ...inf,
        stats: {
          totalConversions: conversions.length,
          confirmedConversions: confirmedConversions.length,
          totalRevenue: confirmedConversions.reduce((sum: number, c: Conversion) => sum + c.amount, 0),
          totalCommission: confirmedConversions.reduce((sum: number, c: Conversion) => sum + c.commission, 0),
        },
      };
    });

    return {
      influencers: influencersWithStats,
      total,
      limit: Number(limit),
      offset: Number(offset),
    };
  });

  // Get single influencer details
  app.get('/:id', async (request, reply) => {
    const { id } = request.params as { id: string };

    const influencer = await prisma.influencerAccess.findUnique({
      where: { id },
      include: {
        affiliate: {
          include: {
            conversions: {
              orderBy: { createdAt: 'desc' },
              take: 20,
            },
            rotator: true,
          },
        },
      },
    });

    if (!influencer) {
      return reply.status(404).send({ error: 'Influencer not found' });
    }

    // Calculate stats
    const conversions = influencer.affiliate?.conversions || [];
    const confirmedConversions = conversions.filter((c: { status: string }) => c.status === 'confirmed');

    return {
      ...influencer,
      stats: {
        totalConversions: conversions.length,
        confirmedConversions: confirmedConversions.length,
        totalRevenue: confirmedConversions.reduce((sum: number, c: { amount: number }) => sum + c.amount, 0),
        totalCommission: confirmedConversions.reduce((sum: number, c: { commission: number }) => sum + c.commission, 0),
        inRotator: !!influencer.affiliate?.rotator?.isActive,
      },
      // Also include rotatorEntry for admin UI compatibility
      rotatorEntry: influencer.affiliate?.rotator,
    };
  });

  // Create new influencer
  app.post('/', async (request, reply) => {
    const {
      name,
      email,
      platform,
      handle,
      followers,
      notes,
      expiresAt,
      createAffiliate = true,
      affiliateTier = 'founding',
    } = request.body as {
      name: string;
      email: string;
      platform: Platform;
      handle?: string;
      followers?: number;
      notes?: string;
      expiresAt?: string;
      createAffiliate?: boolean;
      affiliateTier?: string;
    };

    // Validate required fields
    if (!name || !email || !platform) {
      return reply.status(400).send({ error: 'Name, email, and platform are required' });
    }

    // Check if email already exists
    const existing = await prisma.influencerAccess.findUnique({
      where: { email },
    });

    if (existing) {
      return reply.status(400).send({ error: 'An influencer with this email already exists' });
    }

    // Generate unique access code
    let accessCode = generateAccessCode();
    let attempts = 0;
    while (attempts < 10) {
      const codeExists = await prisma.influencerAccess.findUnique({
        where: { accessCode },
      });
      if (!codeExists) break;
      accessCode = generateAccessCode();
      attempts++;
    }

    // Start a transaction to create influencer and optionally an affiliate
    const result = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      let affiliateId: string | null = null;

      if (createAffiliate) {
        // Check if affiliate already exists for this email
        const existingAffiliate = await tx.affiliate.findFirst({
          where: { email },
        });

        if (existingAffiliate) {
          affiliateId = existingAffiliate.id;
        } else {
          // Create a unique affiliate code
          let affiliateCode = `INF${name.slice(0, 4).toUpperCase()}${randomBytes(2).toString('hex').toUpperCase()}`;
          let codeAttempts = 0;
          while (codeAttempts < 10) {
            const codeExists = await tx.affiliate.findUnique({
              where: { code: affiliateCode },
            });
            if (!codeExists) break;
            affiliateCode = `INF${randomBytes(4).toString('hex').toUpperCase()}`;
            codeAttempts++;
          }

          const affiliate = await tx.affiliate.create({
            data: {
              name,
              email,
              code: affiliateCode,
              tier: affiliateTier,
              status: 'approved', // Auto-approve influencers
              notes: `Influencer - ${platform}${handle ? ` @${handle}` : ''}`,
            },
          });

          affiliateId = affiliate.id;

          // Optionally add to rotator
          // For now, we'll let admin do this manually
        }
      }

      // Create the influencer access record
      const influencer = await tx.influencerAccess.create({
        data: {
          name,
          email,
          platform,
          handle,
          accessCode,
          followers,
          notes,
          affiliateId,
          expiresAt: expiresAt ? new Date(expiresAt) : null,
          contentLinks: [],
        },
        include: {
          affiliate: true,
        },
      });

      return influencer;
    });

    return result;
  });

  // Update influencer
  app.put('/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    const {
      name,
      platform,
      handle,
      followers,
      notes,
      isActive,
      expiresAt,
      contentLinks,
    } = request.body as {
      name?: string;
      platform?: Platform;
      handle?: string;
      followers?: number;
      notes?: string;
      isActive?: boolean;
      expiresAt?: string | null;
      contentLinks?: string[];
    };

    const existing = await prisma.influencerAccess.findUnique({
      where: { id },
    });

    if (!existing) {
      return reply.status(404).send({ error: 'Influencer not found' });
    }

    const influencer = await prisma.influencerAccess.update({
      where: { id },
      data: {
        name,
        platform,
        handle,
        followers,
        notes,
        isActive,
        expiresAt: expiresAt === null ? null : expiresAt ? new Date(expiresAt) : undefined,
        contentLinks: contentLinks as Prisma.InputJsonValue,
      },
      include: {
        affiliate: true,
      },
    });

    return influencer;
  });

  // Add content link to influencer
  app.post('/:id/content', async (request, reply) => {
    const { id } = request.params as { id: string };
    const { url, type, title, notes } = request.body as {
      url: string;
      type?: string;
      title?: string;
      notes?: string;
    };

    if (!url) {
      return reply.status(400).send({ error: 'URL is required' });
    }

    const influencer = await prisma.influencerAccess.findUnique({
      where: { id },
    });

    if (!influencer) {
      return reply.status(404).send({ error: 'Influencer not found' });
    }

    const existingLinks = (influencer.contentLinks as Array<{ url: string; type?: string; title?: string; notes?: string; addedAt: string }>) || [];

    const newLink = {
      url,
      type: type || 'video',
      title: title || url,
      notes,
      addedAt: new Date().toISOString(),
    };

    const updated = await prisma.influencerAccess.update({
      where: { id },
      data: {
        contentLinks: [...existingLinks, newLink] as Prisma.InputJsonValue,
      },
    });

    return updated;
  });

  // Remove content link from influencer
  app.delete('/:id/content/:linkIndex', async (request, reply) => {
    const { id, linkIndex } = request.params as { id: string; linkIndex: string };
    const index = parseInt(linkIndex, 10);

    const influencer = await prisma.influencerAccess.findUnique({
      where: { id },
    });

    if (!influencer) {
      return reply.status(404).send({ error: 'Influencer not found' });
    }

    const existingLinks = (influencer.contentLinks as Array<unknown>) || [];

    if (index < 0 || index >= existingLinks.length) {
      return reply.status(400).send({ error: 'Invalid link index' });
    }

    existingLinks.splice(index, 1);

    const updated = await prisma.influencerAccess.update({
      where: { id },
      data: {
        contentLinks: existingLinks as Prisma.InputJsonValue,
      },
    });

    return updated;
  });

  // Regenerate access code
  app.post('/:id/regenerate-code', async (request, reply) => {
    const { id } = request.params as { id: string };

    const existing = await prisma.influencerAccess.findUnique({
      where: { id },
    });

    if (!existing) {
      return reply.status(404).send({ error: 'Influencer not found' });
    }

    let newCode = generateAccessCode();
    let attempts = 0;
    while (attempts < 10) {
      const codeExists = await prisma.influencerAccess.findUnique({
        where: { accessCode: newCode },
      });
      if (!codeExists) break;
      newCode = generateAccessCode();
      attempts++;
    }

    const updated = await prisma.influencerAccess.update({
      where: { id },
      data: { accessCode: newCode },
    });

    return updated;
  });

  // Add influencer's affiliate to rotator
  app.post('/:id/add-to-rotator', async (request, reply) => {
    const { id } = request.params as { id: string };

    const influencer = await prisma.influencerAccess.findUnique({
      where: { id },
      include: { affiliate: true },
    });

    if (!influencer) {
      return reply.status(404).send({ error: 'Influencer not found' });
    }

    if (!influencer.affiliateId || !influencer.affiliate) {
      return reply.status(400).send({ error: 'Influencer does not have an affiliate account' });
    }

    // Check if already in rotator
    const existingEntry = await prisma.affiliateRotator.findUnique({
      where: { affiliateId: influencer.affiliateId },
    });

    if (existingEntry) {
      // Re-activate if exists
      const updated = await prisma.affiliateRotator.update({
        where: { id: existingEntry.id },
        data: { isActive: true },
      });
      return { message: 'Influencer re-activated in rotator', entry: updated };
    }

    // Get highest position
    const highestPosition = await prisma.affiliateRotator.findFirst({
      orderBy: { rotatorPosition: 'desc' },
      select: { rotatorPosition: true },
    });

    const newPosition = (highestPosition?.rotatorPosition || 0) + 1;

    const entry = await prisma.affiliateRotator.create({
      data: {
        affiliateId: influencer.affiliateId,
        rotatorPosition: newPosition,
        isActive: true,
      },
    });

    return { message: 'Influencer added to rotator', entry };
  });

  // Delete influencer
  app.delete('/:id', async (request, reply) => {
    const { id } = request.params as { id: string };

    const existing = await prisma.influencerAccess.findUnique({
      where: { id },
    });

    if (!existing) {
      return reply.status(404).send({ error: 'Influencer not found' });
    }

    await prisma.influencerAccess.delete({
      where: { id },
    });

    return { message: 'Influencer deleted successfully' };
  });

  // Get stats summary
  app.get('/summary/stats', async () => {
    const [total, active, byPlatform] = await Promise.all([
      prisma.influencerAccess.count(),
      prisma.influencerAccess.count({ where: { isActive: true } }),
      prisma.influencerAccess.groupBy({
        by: ['platform'],
        _count: { id: true },
      }),
    ]);

    // Get all influencers with affiliate data for revenue calculation
    const influencersWithAffiliates = await prisma.influencerAccess.findMany({
      where: { affiliateId: { not: null } },
      include: {
        affiliate: {
          include: {
            conversions: {
              where: { status: 'confirmed' },
              select: { amount: true, commission: true },
            },
          },
        },
      },
    });

    let totalRevenue = 0;
    let totalCommission = 0;
    let totalConversions = 0;

    for (const inf of influencersWithAffiliates) {
      if (inf.affiliate) {
        for (const conv of inf.affiliate.conversions) {
          totalRevenue += conv.amount;
          totalCommission += conv.commission;
          totalConversions++;
        }
      }
    }

    return {
      total,
      active,
      inactive: total - active,
      byPlatform: byPlatform.map((p: { platform: string; _count: { id: number } }) => ({
        platform: p.platform,
        count: p._count.id,
      })),
      totalRevenue,
      totalCommission,
      totalConversions,
    };
  });

  // Get available platforms
  app.get('/meta/platforms', async () => {
    return {
      platforms: PLATFORMS.map((p) => ({
        value: p,
        label: p.replace('_', ' ').replace(/\b\w/g, (l) => l.toUpperCase()),
      })),
    };
  });
};
