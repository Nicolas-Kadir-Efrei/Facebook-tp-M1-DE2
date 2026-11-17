const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

const testDbPath = path.join(__dirname, '..', 'prisma', 'test.db');

process.env.DATABASE_URL = `file:${testDbPath}`;
process.env.NODE_ENV = 'test';

beforeAll(() => {
  for (const f of [testDbPath, `${testDbPath}-journal`, `${testDbPath}-wal`, `${testDbPath}-shm`]) {
    if (fs.existsSync(f)) fs.unlinkSync(f);
  }
  // Création d'une DB de test vide (fichier absent) — pas de --force-reset
  execSync('npx prisma db push --skip-generate', {
    cwd: path.join(__dirname, '..'),
    env: { ...process.env, DATABASE_URL: `file:${testDbPath}` },
    stdio: 'pipe',
  });
});

afterAll(async () => {
  const prisma = require('../src/prisma');
  await prisma.$disconnect();
  for (const f of [testDbPath, `${testDbPath}-journal`, `${testDbPath}-wal`, `${testDbPath}-shm`]) {
    if (fs.existsSync(f)) fs.unlinkSync(f);
  }
});
