import "dotenv/config";
import { defineConfig, env } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    seed: "tsx prisma/seed.ts",
  },
  datasource: {
    // For Prisma Postgres (pooled.db.prisma.io), DATABASE_URL is used for
    // both the app runtime (via Accelerate extension) and migrations.
    // If you later add a connection pooler with a separate direct URL,
    // set DIRECT_URL and switch this back to env("DIRECT_URL").
    url: env("DATABASE_URL"),
  },
});
