import 'dotenv/config';
import { PrismaClient } from '../generated/prisma/client';
import { PrismaPg }     from '@prisma/adapter-pg';

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma  = new PrismaClient({ adapter });

async function main() {
  const chapters = await prisma.chapter.findMany({
    // ← Change this to the chapter name you want
    where: { name: { contains: process.argv[2] ?? '', mode: 'insensitive' } },
    select: {
      id:      true,
      name:    true,
      slug:    true,
      subject: { select: { name: true, class: { select: { name: true } } } },
    },
  });
  console.log(JSON.stringify(chapters, null, 2));
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
