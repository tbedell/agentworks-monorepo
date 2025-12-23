import type { FastifyPluginAsync } from 'fastify';
import { prisma } from '@agentworks/db';
import { z } from 'zod';
import { sendWaitlistWelcome } from '../lib/email.js';
import { getNextRotatorAffiliate, assignOrganicLead } from '../lib/rotator.js';

function generateReferralCode(): string {
  return 'AW-' + Math.random().toString(36).substring(2, 8).toUpperCase();
}

const signupSchema = z.object({
  email: z.string().email(),
  name: z.string().optional(),
  referredByCode: z.string().optional(),
  affiliateCode: z.string().optional(),
  utmSource: z.string().optional(),
  utmMedium: z.string().optional(),
  utmCampaign: z.string().optional(),
});

const checkPositionSchema = z.object({
  code: z.string(),
});

export const waitlistRoutes: FastifyPluginAsync = async (app) => {
  app.get('/stats', async () => {
    const totalLeads = await prisma.waitlistLead.count();
    const founderPlans = await prisma.founderPlan.findMany({
      where: { active: true },
      orderBy: { price: 'asc' },
    });
    
    return {
      totalSignups: totalLeads,
      founderPlans: founderPlans.map(plan => ({
        tier: plan.tier,
        name: plan.name,
        price: plan.price,
        totalSpots: plan.totalSpots,
        remainingSpots: plan.remainingSpots,
        features: plan.features,
      })),
    };
  });

  app.post('/signup', async (request, reply) => {
    const body = signupSchema.parse(request.body);
    const ipAddress = request.ip;
    const userAgent = request.headers['user-agent'];

    const existingLead = await prisma.waitlistLead.findUnique({
      where: { email: body.email },
    });

    if (existingLead) {
      return {
        email: existingLead.email,
        position: existingLead.position,
        referralCode: existingLead.referralCode,
        referralCount: existingLead.referralCount,
        status: existingLead.status,
      };
    }

    let affiliateId: string | undefined;
    let isOrganicLead = true; // Track if this is an organic lead (no affiliate/referral)

    if (body.affiliateCode) {
      const affiliate = await prisma.affiliate.findUnique({
        where: { code: body.affiliateCode, status: 'approved' },
      });
      if (affiliate) {
        affiliateId = affiliate.id;
        isOrganicLead = false;
        await prisma.affiliate.update({
          where: { id: affiliate.id },
          data: { totalReferrals: { increment: 1 } },
        });
      }
    }

    if (body.referredByCode) {
      const referrer = await prisma.waitlistLead.findUnique({
        where: { referralCode: body.referredByCode },
      });
      if (referrer) {
        isOrganicLead = false;
        await prisma.waitlistLead.update({
          where: { id: referrer.id },
          data: { referralCount: { increment: 1 } },
        });
      }
    }

    // For organic leads (no affiliate or referral), use the rotator
    if (isOrganicLead && !affiliateId) {
      try {
        const rotatorAffiliate = await getNextRotatorAffiliate();
        if (rotatorAffiliate) {
          affiliateId = rotatorAffiliate.id;
        }
      } catch (error) {
        console.error('Error getting rotator affiliate:', error);
        // Continue without affiliate - rotator is optional
      }
    }

    const currentMaxPosition = await prisma.waitlistLead.aggregate({
      _max: { position: true },
    });
    const nextPosition = (currentMaxPosition._max.position || 0) + 1;

    const lead = await prisma.waitlistLead.create({
      data: {
        email: body.email,
        name: body.name,
        referralCode: generateReferralCode(),
        referredByCode: body.referredByCode,
        position: nextPosition,
        affiliateId,
        ipAddress,
        userAgent,
        utmSource: body.utmSource,
        utmMedium: body.utmMedium,
        utmCampaign: body.utmCampaign,
      },
    });

    // If this was an organic lead assigned via rotator, record the assignment
    if (isOrganicLead && affiliateId) {
      assignOrganicLead(lead.id, affiliateId).catch(console.error);
    }

    sendWaitlistWelcome(lead.email, lead.position, lead.referralCode).catch(console.error);

    return {
      email: lead.email,
      position: lead.position,
      referralCode: lead.referralCode,
      referralCount: lead.referralCount,
      status: lead.status,
    };
  });

  app.get('/position/:code', async (request, reply) => {
    const { code } = request.params as { code: string };

    const lead = await prisma.waitlistLead.findUnique({
      where: { referralCode: code },
    });

    if (!lead) {
      return reply.status(404).send({ error: 'Referral code not found' });
    }

    const referralBonusPosition = Math.max(0, lead.referralCount * 100);
    const effectivePosition = Math.max(1, lead.position - referralBonusPosition);

    return {
      email: lead.email,
      position: lead.position,
      effectivePosition,
      referralCode: lead.referralCode,
      referralCount: lead.referralCount,
      status: lead.status,
    };
  });

  app.get('/referral-tiers', async () => {
    return {
      tiers: [
        { referrals: 3, reward: 'Jump 100 spots', icon: 'zap' },
        { referrals: 5, reward: 'Guaranteed beta access', icon: 'star' },
        { referrals: 10, reward: '20% off lifetime deal', icon: 'gift' },
        { referrals: 25, reward: 'FREE lifetime Pro', icon: 'crown' },
      ],
    };
  });
};
