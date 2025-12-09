import type { FastifyPluginAsync } from 'fastify';
import { prisma } from '@agentworks/db';
import { z } from 'zod';

const createCheckoutSchema = z.object({
  founderPlanTier: z.string(),
  email: z.string().email(),
  affiliateCode: z.string().optional(),
  successUrl: z.string().url(),
  cancelUrl: z.string().url(),
});

export const checkoutRoutes: FastifyPluginAsync = async (app) => {
  app.post('/founder-plan', async (request, reply) => {
    const body = createCheckoutSchema.parse(request.body);

    const founderPlan = await prisma.founderPlan.findUnique({
      where: { tier: body.founderPlanTier },
    });

    if (!founderPlan) {
      return reply.status(404).send({ error: 'Founder plan not found' });
    }

    if (founderPlan.remainingSpots <= 0) {
      return reply.status(400).send({ error: 'No spots remaining for this plan' });
    }

    const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
    if (!stripeSecretKey) {
      return reply.status(500).send({ error: 'Stripe not configured' });
    }

    try {
      const stripe = await import('stripe').then(m => new m.default(stripeSecretKey));
      
      const metadata: Record<string, string> = {
        founderPlanTier: body.founderPlanTier,
        founderPlanId: founderPlan.id,
        email: body.email,
      };

      if (body.affiliateCode) {
        const affiliate = await prisma.affiliate.findUnique({
          where: { code: body.affiliateCode, status: 'approved' },
        });
        if (affiliate) {
          metadata.affiliateId = affiliate.id;
          metadata.affiliateCode = body.affiliateCode;
        }
      }

      const session = await stripe.checkout.sessions.create({
        mode: 'payment',
        customer_email: body.email,
        line_items: [
          {
            price_data: {
              currency: 'usd',
              product_data: {
                name: `AgentWorks ${founderPlan.name} - Lifetime Access`,
                description: founderPlan.features.join(', '),
              },
              unit_amount: Math.round(founderPlan.price * 100),
            },
            quantity: 1,
          },
        ],
        metadata,
        success_url: `${body.successUrl}?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: body.cancelUrl,
      });

      return { 
        checkoutUrl: session.url,
        sessionId: session.id,
      };
    } catch (err) {
      console.error('Stripe error:', err);
      return reply.status(500).send({ error: 'Failed to create checkout session' });
    }
  });

  app.post('/webhook', async (request, reply) => {
    const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
    
    if (!stripeSecretKey || !webhookSecret) {
      return reply.status(500).send({ error: 'Stripe not configured' });
    }

    const stripe = await import('stripe').then(m => new m.default(stripeSecretKey));
    const signature = request.headers['stripe-signature'] as string;

    let event;
    try {
      event = stripe.webhooks.constructEvent(
        request.body as string,
        signature,
        webhookSecret
      );
    } catch (err) {
      console.error('Webhook signature verification failed:', err);
      return reply.status(400).send({ error: 'Webhook signature verification failed' });
    }

    if (event.type === 'checkout.session.completed') {
      const session = event.data.object as { 
        metadata: Record<string, string>;
        amount_total: number;
        payment_intent: string;
      };
      
      const { founderPlanTier, founderPlanId, email, affiliateId, affiliateCode } = session.metadata;

      await prisma.founderPlan.update({
        where: { id: founderPlanId },
        data: { remainingSpots: { decrement: 1 } },
      });

      const lead = await prisma.waitlistLead.findUnique({
        where: { email },
      });

      if (lead) {
        await prisma.waitlistLead.update({
          where: { id: lead.id },
          data: {
            status: 'converted',
            founderPlanId,
            convertedAt: new Date(),
          },
        });
      }

      if (affiliateId) {
        const affiliate = await prisma.affiliate.findUnique({
          where: { id: affiliateId },
        });

        if (affiliate) {
          const founderPlan = await prisma.founderPlan.findUnique({
            where: { id: founderPlanId },
          });

          const amount = (session.amount_total || 0) / 100;
          const commission = amount * affiliate.commissionRate;
          const bonus = founderPlan?.affiliateBonus || 0;

          await prisma.affiliateConversion.create({
            data: {
              affiliateId,
              leadEmail: email,
              founderPlanId,
              amount,
              commission,
              bonus,
              stripePaymentId: session.payment_intent,
              status: 'pending',
            },
          });

          await prisma.affiliate.update({
            where: { id: affiliateId },
            data: {
              totalConversions: { increment: 1 },
              pendingEarnings: { increment: commission + bonus },
            },
          });
        }
      }

      console.log(`Founder plan purchase completed: ${email} - ${founderPlanTier}`);
    }

    return { received: true };
  });

  app.get('/session/:sessionId', async (request, reply) => {
    const { sessionId } = request.params as { sessionId: string };

    const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
    if (!stripeSecretKey) {
      return reply.status(500).send({ error: 'Stripe not configured' });
    }

    try {
      const stripe = await import('stripe').then(m => new m.default(stripeSecretKey));
      const session = await stripe.checkout.sessions.retrieve(sessionId);
      
      return {
        status: session.status,
        email: session.customer_email,
        plan: session.metadata?.founderPlanTier,
      };
    } catch (err) {
      return reply.status(404).send({ error: 'Session not found' });
    }
  });
};
