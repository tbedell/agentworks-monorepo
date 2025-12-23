import { prisma, Prisma } from '@agentworks/db';
import type { Affiliate, AffiliateRotator } from '@agentworks/db';

export interface RotatorStats {
  totalInRotator: number;
  activeInRotator: number;
  totalAssignments: number;
  recentAssignments: {
    affiliateId: string;
    affiliateName: string;
    leadId: string;
    assignedAt: Date;
  }[];
}

export interface RotatorEntry {
  id: string;
  affiliateId: string;
  affiliate: {
    id: string;
    name: string;
    email: string;
    code: string;
    tier: string;
  };
  rotatorPosition: number;
  lastAssigned: Date | null;
  totalAssigned: number;
  isActive: boolean;
}

/**
 * Get the next affiliate in the rotation queue
 * Uses a fair round-robin algorithm that prioritizes:
 * 1. Affiliates who haven't received a lead recently (lastAssigned ASC)
 * 2. Then by their position in the queue (rotatorPosition ASC)
 */
export async function getNextRotatorAffiliate(): Promise<Affiliate | null> {
  const entry = await prisma.affiliateRotator.findFirst({
    where: { isActive: true },
    orderBy: [
      { lastAssigned: { sort: 'asc', nulls: 'first' } },
      { rotatorPosition: 'asc' }
    ],
    include: { affiliate: true }
  });

  return entry?.affiliate || null;
}

/**
 * Assign an organic lead to the next affiliate in the rotator
 * Updates the rotator entry with the assignment timestamp and increments counter
 */
export async function assignOrganicLead(
  leadId: string,
  affiliateId: string
): Promise<void> {
  // Update the rotator entry
  await prisma.affiliateRotator.update({
    where: { affiliateId },
    data: {
      lastAssigned: new Date(),
      totalAssigned: { increment: 1 }
    }
  });

  // Create assignment history record
  const rotator = await prisma.affiliateRotator.findUnique({
    where: { affiliateId },
    select: { rotatorPosition: true }
  });

  await prisma.organicLeadAssignment.create({
    data: {
      leadId,
      affiliateId,
      rotatorPosition: rotator?.rotatorPosition || 0
    }
  });

  // Update affiliate's total referrals
  await prisma.affiliate.update({
    where: { id: affiliateId },
    data: {
      totalReferrals: { increment: 1 }
    }
  });
}

/**
 * Add a founding member to the rotator queue
 * Position is assigned based on the order they join (can be reordered by admin)
 */
export async function addFounderToRotator(affiliateId: string): Promise<AffiliateRotator> {
  // Check if already in rotator
  const existing = await prisma.affiliateRotator.findUnique({
    where: { affiliateId }
  });

  if (existing) {
    return existing;
  }

  // Get the next position
  const lastPosition = await prisma.affiliateRotator.aggregate({
    _max: { rotatorPosition: true }
  });

  const nextPosition = (lastPosition._max.rotatorPosition || 0) + 1;

  return prisma.affiliateRotator.create({
    data: {
      affiliateId,
      rotatorPosition: nextPosition,
      isActive: true
    }
  });
}

/**
 * Remove an affiliate from the rotator queue
 */
export async function removeFromRotator(affiliateId: string): Promise<void> {
  await prisma.affiliateRotator.delete({
    where: { affiliateId }
  }).catch(() => {
    // Ignore if not found
  });
}

/**
 * Toggle an affiliate's active status in the rotator
 */
export async function toggleRotatorStatus(
  affiliateId: string,
  isActive: boolean
): Promise<AffiliateRotator | null> {
  try {
    return await prisma.affiliateRotator.update({
      where: { affiliateId },
      data: { isActive }
    });
  } catch {
    return null;
  }
}

/**
 * Reorder the rotator queue
 * Takes an array of affiliateIds in the desired order
 */
export async function reorderRotator(
  affiliateIds: string[]
): Promise<void> {
  await prisma.$transaction(
    affiliateIds.map((affiliateId, index) =>
      prisma.affiliateRotator.update({
        where: { affiliateId },
        data: { rotatorPosition: index + 1 }
      })
    )
  );
}

/**
 * Get all entries in the rotator queue
 */
export async function getRotatorQueue(): Promise<RotatorEntry[]> {
  const entries = await prisma.affiliateRotator.findMany({
    orderBy: { rotatorPosition: 'asc' },
    include: {
      affiliate: {
        select: {
          id: true,
          name: true,
          email: true,
          code: true,
          tier: true
        }
      }
    }
  });

  return entries.map(entry => ({
    id: entry.id,
    affiliateId: entry.affiliateId,
    affiliate: entry.affiliate,
    rotatorPosition: entry.rotatorPosition,
    lastAssigned: entry.lastAssigned,
    totalAssigned: entry.totalAssigned,
    isActive: entry.isActive
  }));
}

/**
 * Get rotator statistics
 */
export async function getRotatorStats(): Promise<RotatorStats> {
  const [total, active, assignments, recentAssignments] = await Promise.all([
    prisma.affiliateRotator.count(),
    prisma.affiliateRotator.count({ where: { isActive: true } }),
    prisma.organicLeadAssignment.count(),
    prisma.organicLeadAssignment.findMany({
      take: 10,
      orderBy: { createdAt: 'desc' },
    })
  ]);

  // Get affiliate names for recent assignments
  const affiliateIds = recentAssignments.map(a => a.affiliateId);
  const affiliates = await prisma.affiliate.findMany({
    where: { id: { in: affiliateIds } },
    select: { id: true, name: true }
  });
  const affiliateMap = Object.fromEntries(affiliates.map(a => [a.id, a.name]));

  return {
    totalInRotator: total,
    activeInRotator: active,
    totalAssignments: assignments,
    recentAssignments: recentAssignments.map(a => ({
      affiliateId: a.affiliateId,
      affiliateName: affiliateMap[a.affiliateId] || 'Unknown',
      leadId: a.leadId,
      assignedAt: a.createdAt
    }))
  };
}

/**
 * Get assignment history for an affiliate
 */
export async function getAffiliateAssignmentHistory(
  affiliateId: string,
  limit = 50
): Promise<{ leadId: string; assignedAt: Date; rotatorPosition: number }[]> {
  const assignments = await prisma.organicLeadAssignment.findMany({
    where: { affiliateId },
    orderBy: { createdAt: 'desc' },
    take: limit
  });

  return assignments.map(a => ({
    leadId: a.leadId,
    assignedAt: a.createdAt,
    rotatorPosition: a.rotatorPosition
  }));
}
