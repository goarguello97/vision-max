import { PrismaClient, Role } from '@prisma/client';
import { hashPassword } from '../src/utils/bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting seed...');

  const adminPassword = await hashPassword('admin123');
  const admin = await prisma.user.upsert({
    where: { email: 'admin@visionmax.com' },
    update: {},
    create: {
      email: 'admin@visionmax.com',
      username: 'admin',
      passwordHash: adminPassword,
      role: Role.ADMIN,
    },
  });

  console.log(`✅ Admin created: ${admin.email} (password: admin123)`);

  const testPassword = await hashPassword('user123');
  const testUser = await prisma.user.upsert({
    where: { email: 'user@test.com' },
    update: {},
    create: {
      email: 'user@test.com',
      username: 'testuser',
      passwordHash: testPassword,
      role: Role.USER,
    },
  });

  console.log(`✅ Test user created: ${testUser.email} (password: user123)`);

  console.log('🎉 Seed completed!');
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });