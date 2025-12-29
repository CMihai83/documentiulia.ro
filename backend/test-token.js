const { PrismaClient } = require('@prisma/client');
const jwt = require('jsonwebtoken');
const prisma = new PrismaClient();

async function generateToken() {
  try {
    const user = await prisma.user.findFirst({
      where: { email: 'testuser@documentiulia.ro' }
    });

    if (!user) {
      console.log('ERROR: User not found');
      return;
    }

    const payload = {
      sub: user.id,
      email: user.email,
      role: user.role
    };

    const secret = process.env.JWT_SECRET || 'dev-secret-key-change-in-production';
    const token = jwt.sign(payload, secret, { expiresIn: '24h' });

    console.log(token);
  } catch (e) {
    console.error('ERROR:', e.message);
  } finally {
    await prisma.$disconnect();
  }
}

generateToken();
