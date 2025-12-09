import { prisma } from '@agentworks/db';
import * as argon2 from 'argon2';

async function createAdmin() {
  const password = await argon2.hash('11Method11');
  
  const admin = await prisma.adminUser.upsert({
    where: { email: 'admin@agentworksstudio.com' },
    update: {
      name: 'Thomas Bedell',
      password,
      role: 'super_admin',
    },
    create: {
      email: 'admin@agentworksstudio.com',
      name: 'Thomas Bedell',
      password,
      role: 'super_admin',
    },
  });

  console.log('Admin user created:', admin.email);
  await prisma.$disconnect();
}

createAdmin().catch(console.error);
