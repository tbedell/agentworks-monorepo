import type { FastifyPluginAsync } from 'fastify';
import { prisma, Prisma } from '@agentworks/db';
import { adminAuthMiddleware } from './auth.js';

interface CampaignFilters {
  status?: string;
  founderTier?: string;
  hasReferrals?: boolean;
  minReferrals?: number;
  affiliateOnly?: boolean;
}

// Pre-built email templates
const EMAIL_TEMPLATES = {
  pre_launch_day_10: {
    name: 'The Problem with Affiliate Marketing',
    subject: 'Why most affiliate programs FAIL (and what we\'re doing differently)',
    description: 'Day 10 before launch - Set up the problem',
  },
  pre_launch_day_7: {
    name: 'The Rotator Explained',
    subject: 'How you\'ll earn from EVERY organic signup',
    description: 'Day 7 before launch - Explain the rotator system',
  },
  pre_launch_day_3: {
    name: 'The 11 Agents',
    subject: 'Meet the AI team that will build your business',
    description: 'Day 3 before launch - Feature showcase',
  },
  launch_alert: {
    name: 'Launch Alert',
    subject: '🚀 DOORS ARE OPEN - Founding Member spots available NOW',
    description: 'Launch day announcement',
  },
  fomo_50_percent: {
    name: '50% Sold Alert',
    subject: '⚠️ Half the spots are GONE',
    description: 'FOMO trigger at 50% sold',
  },
  fomo_75_percent: {
    name: '75% Sold Alert',
    subject: '🔥 Only 25% of spots remaining!',
    description: 'FOMO trigger at 75% sold',
  },
  fomo_90_percent: {
    name: 'Almost Sold Out',
    subject: '🚨 FINAL WARNING: Less than 10% of spots left',
    description: 'FOMO trigger at 90% sold',
  },
  last_chance: {
    name: 'Last Chance',
    subject: '⏰ FINAL HOURS to become a Founding Member',
    description: 'Final hours before closing',
  },
  closed: {
    name: 'Doors Closed',
    subject: 'Founding Member launch is CLOSED',
    description: 'Post-launch follow-up',
  },
};

export const adminCampaignsRoutes: FastifyPluginAsync = async (app) => {
  // Protect all routes
  app.addHook('preHandler', adminAuthMiddleware);

  // Get email templates
  app.get('/templates', async () => {
    return Object.entries(EMAIL_TEMPLATES).map(([id, template]) => ({
      id,
      ...template,
    }));
  });

  // List campaigns
  app.get('/', async (request) => {
    const { status, page = 1, limit = 20 } = request.query as {
      status?: string;
      page?: number;
      limit?: number;
    };

    const where: Prisma.EmailCampaignWhereInput = {};
    if (status) {
      where.status = status;
    }

    const [campaigns, total] = await Promise.all([
      prisma.emailCampaign.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.emailCampaign.count({ where }),
    ]);

    return {
      campaigns,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  });

  // Get campaign by ID
  app.get('/:id', async (request, reply) => {
    const { id } = request.params as { id: string };

    const campaign = await prisma.emailCampaign.findUnique({
      where: { id },
    });

    if (!campaign) {
      return reply.status(404).send({ error: 'Campaign not found' });
    }

    // Get email sends for this campaign
    const sends = await prisma.emailSend.findMany({
      where: { campaignId: id },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });

    const stats = {
      totalSent: sends.filter(s => s.status !== 'pending').length,
      opened: sends.filter(s => s.status === 'opened' || s.status === 'clicked').length,
      clicked: sends.filter(s => s.status === 'clicked').length,
      bounced: sends.filter(s => s.status === 'bounced').length,
    };

    return {
      ...campaign,
      sends: sends.slice(0, 50),
      stats,
    };
  });

  // Create campaign
  app.post('/', async (request, reply) => {
    const { name, subject, template, targetAudience, filters, scheduledFor } = request.body as {
      name: string;
      subject: string;
      template: string;
      targetAudience: 'waitlist' | 'founders' | 'affiliates' | 'all';
      filters?: CampaignFilters;
      scheduledFor?: string;
    };

    try {
      // Calculate recipient count
      let recipientCount = 0;
      if (targetAudience === 'waitlist' || targetAudience === 'all') {
        const waitlistWhere: Prisma.WaitlistLeadWhereInput = { status: 'waiting' };
        if (filters?.founderTier) {
          waitlistWhere.founderPlan = { tier: filters.founderTier };
        }
        if (filters?.hasReferrals) {
          waitlistWhere.referralCount = { gt: 0 };
        }
        if (filters?.minReferrals) {
          waitlistWhere.referralCount = { gte: filters.minReferrals };
        }
        if (filters?.affiliateOnly) {
          waitlistWhere.affiliateId = { not: null };
        }
        recipientCount += await prisma.waitlistLead.count({ where: waitlistWhere });
      }

      if (targetAudience === 'founders') {
        const founderWhere: Prisma.WaitlistLeadWhereInput = {
          founderPlanId: { not: null },
        };
        if (filters?.founderTier) {
          founderWhere.founderPlan = { tier: filters.founderTier };
        }
        recipientCount = await prisma.waitlistLead.count({ where: founderWhere });
      }

      if (targetAudience === 'affiliates') {
        recipientCount = await prisma.affiliate.count({ where: { status: 'approved' } });
      }

      const campaign = await prisma.emailCampaign.create({
        data: {
          name,
          subject,
          template,
          targetAudience,
          filters: filters as Prisma.InputJsonValue,
          status: scheduledFor ? 'scheduled' : 'draft',
          scheduledFor: scheduledFor ? new Date(scheduledFor) : null,
          totalRecipients: recipientCount,
        },
      });

      // Log action
      const admin = (request as any).adminUser;
      await prisma.adminAuditLog.create({
        data: {
          adminId: admin.id,
          action: 'campaign_created',
          resourceType: 'campaign',
          resourceId: campaign.id,
          ipAddress: request.ip || 'unknown',
          details: { name, template, targetAudience, recipients: recipientCount },
        },
      });

      return campaign;
    } catch (error) {
      console.error('Error creating campaign:', error);
      return reply.status(500).send({ error: 'Failed to create campaign' });
    }
  });

  // Update campaign
  app.put('/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    const updates = request.body as Partial<{
      name: string;
      subject: string;
      template: string;
      targetAudience: string;
      filters: CampaignFilters;
      scheduledFor: string;
    }>;

    try {
      const campaign = await prisma.emailCampaign.findUnique({ where: { id } });
      if (!campaign) {
        return reply.status(404).send({ error: 'Campaign not found' });
      }

      if (campaign.status === 'sent' || campaign.status === 'sending') {
        return reply.status(400).send({ error: 'Cannot modify a sent or sending campaign' });
      }

      const updated = await prisma.emailCampaign.update({
        where: { id },
        data: {
          ...(updates.name && { name: updates.name }),
          ...(updates.subject && { subject: updates.subject }),
          ...(updates.template && { template: updates.template }),
          ...(updates.targetAudience && { targetAudience: updates.targetAudience }),
          ...(updates.filters && { filters: updates.filters as Prisma.InputJsonValue }),
          ...(updates.scheduledFor && {
            scheduledFor: new Date(updates.scheduledFor),
            status: 'scheduled',
          }),
        },
      });

      return updated;
    } catch (error) {
      console.error('Error updating campaign:', error);
      return reply.status(500).send({ error: 'Failed to update campaign' });
    }
  });

  // Delete campaign
  app.delete('/:id', async (request, reply) => {
    const { id } = request.params as { id: string };

    try {
      const campaign = await prisma.emailCampaign.findUnique({ where: { id } });
      if (!campaign) {
        return reply.status(404).send({ error: 'Campaign not found' });
      }

      if (campaign.status === 'sent' || campaign.status === 'sending') {
        return reply.status(400).send({ error: 'Cannot delete a sent or sending campaign' });
      }

      await prisma.emailCampaign.delete({ where: { id } });

      return { success: true };
    } catch (error) {
      console.error('Error deleting campaign:', error);
      return reply.status(500).send({ error: 'Failed to delete campaign' });
    }
  });

  // Send campaign immediately
  app.post('/:id/send', async (request, reply) => {
    const { id } = request.params as { id: string };

    try {
      const campaign = await prisma.emailCampaign.findUnique({ where: { id } });
      if (!campaign) {
        return reply.status(404).send({ error: 'Campaign not found' });
      }

      if (campaign.status === 'sent' || campaign.status === 'sending') {
        return reply.status(400).send({ error: 'Campaign has already been sent' });
      }

      // Update status to sending
      await prisma.emailCampaign.update({
        where: { id },
        data: { status: 'sending' },
      });

      // Get recipients based on target audience
      const filters = campaign.filters as CampaignFilters | null;
      let recipients: { email: string; name?: string | null }[] = [];

      if (campaign.targetAudience === 'waitlist' || campaign.targetAudience === 'all') {
        const waitlistWhere: Prisma.WaitlistLeadWhereInput = { status: 'waiting' };
        if (filters?.founderTier) {
          waitlistWhere.founderPlan = { tier: filters.founderTier };
        }
        if (filters?.hasReferrals) {
          waitlistWhere.referralCount = { gt: 0 };
        }
        if (filters?.minReferrals) {
          waitlistWhere.referralCount = { gte: filters.minReferrals };
        }
        if (filters?.affiliateOnly) {
          waitlistWhere.affiliateId = { not: null };
        }

        const waitlistLeads = await prisma.waitlistLead.findMany({
          where: waitlistWhere,
          select: { email: true, name: true },
        });
        recipients = [...recipients, ...waitlistLeads];
      }

      if (campaign.targetAudience === 'founders') {
        const founderWhere: Prisma.WaitlistLeadWhereInput = {
          founderPlanId: { not: null },
        };
        if (filters?.founderTier) {
          founderWhere.founderPlan = { tier: filters.founderTier };
        }
        const founders = await prisma.waitlistLead.findMany({
          where: founderWhere,
          select: { email: true, name: true },
        });
        recipients = founders;
      }

      if (campaign.targetAudience === 'affiliates') {
        const affiliates = await prisma.affiliate.findMany({
          where: { status: 'approved' },
          select: { email: true, name: true },
        });
        recipients = affiliates;
      }

      // Deduplicate by email
      const uniqueRecipients = Array.from(
        new Map(recipients.map(r => [r.email, r])).values()
      );

      // Create email send records
      const emailSends = await Promise.all(
        uniqueRecipients.map(recipient =>
          prisma.emailSend.create({
            data: {
              campaignId: id,
              email: recipient.email,
              template: campaign.template,
              status: 'pending',
            },
          })
        )
      );

      // In a real implementation, you would queue these for sending via Resend
      // For now, we'll just mark them as sent
      await prisma.emailSend.updateMany({
        where: { campaignId: id },
        data: { status: 'sent' },
      });

      // Update campaign status
      await prisma.emailCampaign.update({
        where: { id },
        data: {
          status: 'sent',
          sentAt: new Date(),
          sentCount: uniqueRecipients.length,
          totalRecipients: uniqueRecipients.length,
        },
      });

      // Log action
      const admin = (request as any).adminUser;
      await prisma.adminAuditLog.create({
        data: {
          adminId: admin.id,
          action: 'campaign_sent',
          resourceType: 'campaign',
          resourceId: id,
          ipAddress: request.ip || 'unknown',
          details: { recipientCount: uniqueRecipients.length },
        },
      });

      return {
        success: true,
        message: `Campaign sent to ${uniqueRecipients.length} recipients`,
        sentCount: uniqueRecipients.length,
      };
    } catch (error) {
      console.error('Error sending campaign:', error);
      // Revert status on error
      await prisma.emailCampaign.update({
        where: { id },
        data: { status: 'draft' },
      });
      return reply.status(500).send({ error: 'Failed to send campaign' });
    }
  });

  // Schedule campaign
  app.post('/:id/schedule', async (request, reply) => {
    const { id } = request.params as { id: string };
    const { scheduledFor } = request.body as { scheduledFor: string };

    try {
      const campaign = await prisma.emailCampaign.findUnique({ where: { id } });
      if (!campaign) {
        return reply.status(404).send({ error: 'Campaign not found' });
      }

      if (campaign.status === 'sent' || campaign.status === 'sending') {
        return reply.status(400).send({ error: 'Campaign has already been sent' });
      }

      const scheduledDate = new Date(scheduledFor);
      if (scheduledDate <= new Date()) {
        return reply.status(400).send({ error: 'Scheduled time must be in the future' });
      }

      const updated = await prisma.emailCampaign.update({
        where: { id },
        data: {
          status: 'scheduled',
          scheduledFor: scheduledDate,
        },
      });

      return {
        success: true,
        message: `Campaign scheduled for ${scheduledDate.toISOString()}`,
        campaign: updated,
      };
    } catch (error) {
      console.error('Error scheduling campaign:', error);
      return reply.status(500).send({ error: 'Failed to schedule campaign' });
    }
  });

  // Get campaign stats
  app.get('/:id/stats', async (request, reply) => {
    const { id } = request.params as { id: string };

    try {
      const campaign = await prisma.emailCampaign.findUnique({ where: { id } });
      if (!campaign) {
        return reply.status(404).send({ error: 'Campaign not found' });
      }

      const sends = await prisma.emailSend.findMany({
        where: { campaignId: id },
      });

      const stats = {
        totalRecipients: campaign.totalRecipients,
        sentCount: campaign.sentCount,
        openCount: campaign.openCount,
        clickCount: campaign.clickCount,
        openRate: campaign.sentCount > 0
          ? ((campaign.openCount / campaign.sentCount) * 100).toFixed(1) + '%'
          : '0%',
        clickRate: campaign.sentCount > 0
          ? ((campaign.clickCount / campaign.sentCount) * 100).toFixed(1) + '%'
          : '0%',
        byStatus: {
          pending: sends.filter(s => s.status === 'pending').length,
          sent: sends.filter(s => s.status === 'sent').length,
          opened: sends.filter(s => s.status === 'opened').length,
          clicked: sends.filter(s => s.status === 'clicked').length,
          bounced: sends.filter(s => s.status === 'bounced').length,
        },
      };

      return stats;
    } catch (error) {
      console.error('Error getting campaign stats:', error);
      return reply.status(500).send({ error: 'Failed to get campaign stats' });
    }
  });

  // Send test email
  app.post('/:id/test', async (request, reply) => {
    const { id } = request.params as { id: string };
    const { email } = request.body as { email: string };

    try {
      const campaign = await prisma.emailCampaign.findUnique({ where: { id } });
      if (!campaign) {
        return reply.status(404).send({ error: 'Campaign not found' });
      }

      // In a real implementation, you would send the test email via Resend
      // For now, just acknowledge the request
      return {
        success: true,
        message: `Test email for campaign "${campaign.name}" would be sent to ${email}`,
      };
    } catch (error) {
      console.error('Error sending test email:', error);
      return reply.status(500).send({ error: 'Failed to send test email' });
    }
  });

  // Get recipient preview
  app.post('/preview-recipients', async (request, reply) => {
    const { targetAudience, filters } = request.body as {
      targetAudience: 'waitlist' | 'founders' | 'affiliates' | 'all';
      filters?: CampaignFilters;
    };

    try {
      let count = 0;
      let sample: { email: string; name?: string | null }[] = [];

      if (targetAudience === 'waitlist' || targetAudience === 'all') {
        const waitlistWhere: Prisma.WaitlistLeadWhereInput = { status: 'waiting' };
        if (filters?.founderTier) {
          waitlistWhere.founderPlan = { tier: filters.founderTier };
        }
        if (filters?.hasReferrals) {
          waitlistWhere.referralCount = { gt: 0 };
        }
        if (filters?.minReferrals) {
          waitlistWhere.referralCount = { gte: filters.minReferrals };
        }
        if (filters?.affiliateOnly) {
          waitlistWhere.affiliateId = { not: null };
        }

        count += await prisma.waitlistLead.count({ where: waitlistWhere });
        const leads = await prisma.waitlistLead.findMany({
          where: waitlistWhere,
          select: { email: true, name: true },
          take: 5,
        });
        sample = [...sample, ...leads];
      }

      if (targetAudience === 'founders') {
        const founderWhere: Prisma.WaitlistLeadWhereInput = {
          founderPlanId: { not: null },
        };
        if (filters?.founderTier) {
          founderWhere.founderPlan = { tier: filters.founderTier };
        }
        count = await prisma.waitlistLead.count({ where: founderWhere });
        sample = await prisma.waitlistLead.findMany({
          where: founderWhere,
          select: { email: true, name: true },
          take: 5,
        });
      }

      if (targetAudience === 'affiliates') {
        count = await prisma.affiliate.count({ where: { status: 'approved' } });
        sample = await prisma.affiliate.findMany({
          where: { status: 'approved' },
          select: { email: true, name: true },
          take: 5,
        });
      }

      return {
        count,
        sample: sample.slice(0, 5),
      };
    } catch (error) {
      console.error('Error previewing recipients:', error);
      return reply.status(500).send({ error: 'Failed to preview recipients' });
    }
  });
};
