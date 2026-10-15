import 'reflect-metadata';
import * as argon2 from 'argon2';
import { PrismaClient } from '@prisma/client';

async function main() {
  const email = process.env.ADMIN_EMAIL?.trim().toLowerCase();
  const name = process.env.ADMIN_NAME?.trim();
  const password = process.env.ADMIN_PASSWORD;
  if (!email || !name || !password || password.length < 14) {
    throw new Error('Configura ADMIN_EMAIL, ADMIN_NAME y ADMIN_PASSWORD (mínimo 14 caracteres) solo para este comando.');
  }
  const prisma = new PrismaClient();
  try {
    if (await prisma.user.count({ where: { role: 'ADMIN' } })) throw new Error('Ya existe un administrador; este comando solo crea el primero.');
    const user = await prisma.user.create({ data: { email, name, passwordHash: await argon2.hash(password, { type: argon2.argon2id }), role: 'ADMIN' }, select: { id: true, email: true, name: true } });
    console.info(`Administrador creado: ${user.email} (${user.id})`);
  } finally { await prisma.$disconnect(); }
}
main().catch((error) => { console.error(error.message); process.exitCode = 1; });
