import "dotenv/config";
import { defineConfig } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    // generate/type-checks don't need a live DB — only migrate/studio do.
    // (The env() helper would throw here when DATABASE_URL is unset.)
    url: process.env.DATABASE_URL ?? "",
  },
});
