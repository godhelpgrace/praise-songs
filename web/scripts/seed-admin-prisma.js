const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  const hashedPassword = await bcrypt.hash('admin123', 10);
  
  try {
    const admin = await prisma.user.upsert({
      where: { username: 'admin' },
      update: {
        password: hashedPassword, // Reset password if exists
        role: 'admin'
      },
      create: {
        username: 'admin',
        password: hashedPassword,
        email: 'admin@example.com',
        phone: '13800000000',
        role: 'admin',
      },
    });
    console.log('Admin user created/updated successfully.');
    console.log('Username: admin');
    console.log('Password: admin123');
  } catch (e) {
    console.error('Error seeding admin:', e);
  } finally {
    await prisma.$disconnect();
  }
}

main();
