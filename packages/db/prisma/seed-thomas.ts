import { PrismaClient } from '@prisma/client';
import * as argon2 from 'argon2';

const prisma = new PrismaClient();

async function main() {
  console.log('Creating thomas@thomasbedell.com user account...');

  // Check if user already exists
  const existingUser = await prisma.user.findUnique({
    where: { email: 'thomas@thomasbedell.com' },
  });

  if (existingUser) {
    console.log('User already exists:', existingUser.email);
    return;
  }

  // Get the Starter plan
  const starterPlan = await prisma.plan.findFirst({
    where: { name: 'Starter' },
  });

  if (!starterPlan) {
    console.error('Starter plan not found! Run seed-admin.ts first.');
    process.exit(1);
  }

  // Hash the password with argon2
  const hashedPassword = await argon2.hash('agentworks123');

  // Generate a simple user ID
  const userId = `user_${Date.now().toString(36)}`;

  // Create tenant, user, workspace, and settings in a transaction
  const result = await prisma.$transaction(async (tx) => {
    // Create tenant
    const tenant = await tx.tenant.create({
      data: {
        name: "Thomas Bedell's AgentWorks",
        slug: `thomas-agentworks-${Date.now().toString(36)}`,
        status: 'trial',
        planId: starterPlan.id,
        tokenLimit: starterPlan.tokenLimit || 500000,
        tokenBalance: starterPlan.tokenLimit || 500000,
      },
    });
    console.log('Created tenant:', tenant.name);

    // Create tenant settings
    await tx.tenantSettings.create({
      data: {
        tenantId: tenant.id,
        defaultAgentProvider: 'anthropic',
        defaultAgentModel: 'claude-sonnet-4-20250514',
        onboardingCompleted: false,
        onboardingStep: 0,
        tourCompleted: false,
        tourStep: 0,
      },
    });
    console.log('Created tenant settings');

    // Create user
    const user = await tx.user.create({
      data: {
        id: userId,
        email: 'thomas@thomasbedell.com',
        name: 'Thomas Bedell',
        password: hashedPassword,
        tenantId: tenant.id,
      },
    });
    console.log('Created user:', user.email);

    // Create workspace
    const workspace = await tx.workspace.create({
      data: {
        name: "Thomas Bedell's Workspace",
        ownerId: user.id,
        tenantId: tenant.id,
      },
    });
    console.log('Created workspace:', workspace.name);

    // Create workspace member
    await tx.workspaceMember.create({
      data: {
        workspaceId: workspace.id,
        userId: user.id,
        role: 'owner',
      },
    });
    console.log('Created workspace member');

    // Create subscription
    const now = new Date();
    const trialEnd = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000);
    await tx.subscription.create({
      data: {
        tenantId: tenant.id,
        planId: starterPlan.id,
        status: 'trialing',
        currentPeriodStart: now,
        currentPeriodEnd: trialEnd,
      },
    });
    console.log('Created subscription (14-day trial)');

    return { user, tenant, workspace };
  });

  console.log('\n✅ User created successfully!');
  console.log('Email: thomas@thomasbedell.com');
  console.log('Password: agentworks123');
  console.log('User ID:', result.user.id);
  console.log('Tenant ID:', result.tenant.id);
  console.log('Workspace ID:', result.workspace.id);
}

main()
  .catch((e) => {
    console.error('Error creating user:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
