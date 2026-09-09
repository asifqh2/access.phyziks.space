// Re-export the adapter-backed singleton from the root lib/prisma.ts.
// All src/ code imports from here; this file is the single source of truth.
// The root lib/prisma.ts uses PrismaPg (the pg adapter) which is required by
// the Prisma config. Keeping one instance avoids connection pool duplication
// and the "two PrismaClient instances" warning during hot reload.
export { prisma } from '../../lib/prisma';
