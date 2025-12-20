import { PrismaClient } from '@prisma/client';
import * as argon2 from 'argon2';

const prisma = new PrismaClient();

async function resetPassword() {
  const email = process.argv[2] || 'thomas@thomasbedell.com';
  const newPassword = process.argv[3] || 'Password123!';

  console.log(`Resetting password for: ${email}`);

  const hashedPassword = await argon2.hash(newPassword);

  const user = await prisma.user.update({
    where: { email },
    data: { password: hashedPassword },
  });

  console.log(`Password reset successfully for user: ${user.name} (${user.email})`);
  console.log(`New password: ${newPassword}`);

  await prisma.$disconnect();
}

resetPassword().catch((e) => {
  console.error('Error:', e);
  process.exit(1);
});
