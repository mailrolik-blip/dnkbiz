import { loadEnvFile } from "node:process";

import { defineConfig, env } from "prisma/config";

loadEnvFile(".env");

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    seed: "node --env-file=.env prisma/seed.mjs",
  },
  engine: "classic",
  datasource: {
    url: env("DATABASE_URL"),
  },
});
