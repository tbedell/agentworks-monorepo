import type { FastifyPluginAsync } from 'fastify';
import { prisma } from '@agentworks/db';
import { z } from 'zod';

function generateAffiliateCode(name: string): string {
  const base = name.toLowerCase().replace(/[^a-z0-9]/g, '').substring(0, 6);
  const suffix = Math.random().toString(36).substring(2, 5).toUpperCase();
  return `${base}${suffix}`;
}

const applySchema = z.object({
  email: z.string().email(),
  name: z.string().min(1),
  website: z.string().url().optional(),
  socialLinks: z.object({
    twitter: z.string().optional(),
    youtube: z.string().optional(),
    linkedin: z.string().optional(),
    other: z.string().optional(),
  }).optional(),
  paypalEmail: z.string().email().optional(),
  notes: z.string().optional(),
});

const AFFILIATE_TIERS = {
  standard: { rate: 0.30, name: 'Standard', minReferrals: 0 },
  silver: { rate: 0.35, name: 'Silver', minReferrals: 10 },
  gold: { rate: 0.40, name: 'Gold', minReferrals: 25 },
  platinum: { rate: 0.50, name: 'Platinum', minReferrals: 50 },
};

const FOUNDER_BONUSES = {
  founding_50: 150,
  early_bird: 100,
  launch_week: 50,
};

export const affiliateRoutes: FastifyPluginAsync = async (app) => {
  app.get('/program', async () => {
    return {
      name: 'AgentWorks Affiliate Program',
      description: 'Earn generous commissions promoting AgentWorks',
      tiers: Object.entries(AFFILIATE_TIERS).map(([key, tier]) => ({
        id: key,
        name: tier.name,
        commissionRate: tier.rate,
        minReferrals: tier.minReferrals,
      })),
      founderBonuses: Object.entries(FOUNDER_BONUSES).map(([tier, bonus]) => ({
        tier,
        bonus,
      })),
      features: [
        '30-50% recurring commission on all subscriptions',
        'Up to $150 bonus per Founder plan sale',
        '30-day cookie window',
        'Real-time dashboard',
        'Monthly payouts via PayPal or Stripe',
        'Dedicated affiliate support',
      ],
    };
  });

  app.post('/apply', async (request, reply) => {
    const body = applySchema.parse(request.body);

    const existingAffiliate = await prisma.affiliate.findUnique({
      where: { email: body.email },
    });

    if (existingAffiliate) {
      if (existingAffiliate.status === 'pending') {
        return { message: 'Your application is pending review', status: 'pending' };
      }
      if (existingAffiliate.status === 'approved') {
        return { 
          message: 'You are already an approved affiliate',
          status: 'approved',
          code: existingAffiliate.code,
        };
      }
      return reply.status(400).send({ error: 'You have already applied' });
    }

    const affiliate = await prisma.affiliate.create({
      data: {
        email: body.email,
        name: body.name,
        code: generateAffiliateCode(body.name),
        website: body.website,
        socialLinks: body.socialLinks,
        paypalEmail: body.paypalEmail,
        notes: body.notes,
        status: 'pending',
      },
    });

    return {
      message: 'Application submitted successfully',
      status: 'pending',
      id: affiliate.id,
    };
  });

  app.get('/dashboard/:code', async (request, reply) => {
    const { code } = request.params as { code: string };

    const affiliate = await prisma.affiliate.findUnique({
      where: { code },
      include: {
        leads: {
          select: {
            id: true,
            email: true,
            status: true,
            createdAt: true,
          },
          orderBy: { createdAt: 'desc' },
          take: 20,
        },
        conversions: {
          include: {
            founderPlan: true,
          },
          orderBy: { createdAt: 'desc' },
          take: 20,
        },
        payouts: {
          orderBy: { createdAt: 'desc' },
          take: 10,
        },
      },
    });

    if (!affiliate || affiliate.status !== 'approved') {
      return reply.status(404).send({ error: 'Affiliate not found or not approved' });
    }

    const currentTier = Object.entries(AFFILIATE_TIERS)
      .reverse()
      .find(([_, tier]) => affiliate.totalReferrals >= tier.minReferrals);

    return {
      affiliate: {
        id: affiliate.id,
        name: affiliate.name,
        code: affiliate.code,
        tier: currentTier?.[0] || 'standard',
        tierName: currentTier?.[1].name || 'Standard',
        commissionRate: affiliate.commissionRate,
      },
      stats: {
        totalReferrals: affiliate.totalReferrals,
        totalConversions: affiliate.totalConversions,
        lifetimeEarnings: affiliate.lifetimeEarnings,
        pendingEarnings: affiliate.pendingEarnings,
        paidEarnings: affiliate.paidEarnings,
      },
      recentLeads: affiliate.leads.map(lead => ({
        id: lead.id,
        email: lead.email.replace(/(.{2}).*(@.*)/, '$1***$2'),
        status: lead.status,
        date: lead.createdAt,
      })),
      recentConversions: affiliate.conversions.map(conv => ({
        id: conv.id,
        plan: conv.founderPlan?.name || 'Subscription',
        amount: conv.amount,
        commission: conv.commission,
        bonus: conv.bonus,
        status: conv.status,
        date: conv.createdAt,
      })),
      payouts: affiliate.payouts.map(payout => ({
        id: payout.id,
        amount: payout.amount,
        method: payout.method,
        status: payout.status,
        date: payout.processedAt || payout.createdAt,
      })),
      links: {
        waitlist: `https://agentworks.dev/waitlist?aff=${affiliate.code}`,
        signup: `https://agentworks.dev/signup?aff=${affiliate.code}`,
      },
    };
  });

  app.post('/track-conversion', async (request, reply) => {
    const body = z.object({
      affiliateCode: z.string(),
      leadEmail: z.string().email(),
      founderPlanTier: z.string().optional(),
      amount: z.number(),
      stripePaymentId: z.string().optional(),
    }).parse(request.body);

    const affiliate = await prisma.affiliate.findUnique({
      where: { code: body.affiliateCode, status: 'approved' },
    });

    if (!affiliate) {
      return reply.status(404).send({ error: 'Affiliate not found' });
    }

    let founderPlan = null;
    let bonus = 0;
    if (body.founderPlanTier) {
      founderPlan = await prisma.founderPlan.findUnique({
        where: { tier: body.founderPlanTier },
      });
      if (founderPlan) {
        bonus = founderPlan.affiliateBonus;
      }
    }

    const commission = body.amount * affiliate.commissionRate;

    const conversion = await prisma.affiliateConversion.create({
      data: {
        affiliateId: affiliate.id,
        leadEmail: body.leadEmail,
        founderPlanId: founderPlan?.id,
        amount: body.amount,
        commission,
        bonus,
        stripePaymentId: body.stripePaymentId,
        status: 'pending',
      },
    });

    await prisma.affiliate.update({
      where: { id: affiliate.id },
      data: {
        totalConversions: { increment: 1 },
        pendingEarnings: { increment: commission + bonus },
      },
    });

    return {
      conversionId: conversion.id,
      commission,
      bonus,
      total: commission + bonus,
    };
  });
};
