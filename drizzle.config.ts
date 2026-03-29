import { config as loadEnv } from "dotenv";
import { defineConfig } from "drizzle-kit";

loadEnv({ path: ".env" });

const requiredEnvVars = ["PGHOST", "PGDATABASE", "PGUSER", "PGPASSWORD"] as const;

for (const envVar of requiredEnvVars) {
  if (!process.env[envVar]) {
    throw new Error(`Missing required environment variable: ${envVar}`);
  }
}

const url = new URL("postgresql://");
url.hostname = process.env.PGHOST!;
url.pathname = `/${process.env.PGDATABASE!}`;
url.username = process.env.PGUSER!;
url.password = process.env.PGPASSWORD!;

if (process.env.PGPORT) {
  url.port = process.env.PGPORT;
}

if (process.env.PGSSLMODE) {
  url.searchParams.set("sslmode", process.env.PGSSLMODE);
}

if (process.env.PGCHANNELBINDING) {
  url.searchParams.set("channel_binding", process.env.PGCHANNELBINDING);
}

export default defineConfig({
  out: "./drizzle",
  schema: "./src/db/schema.ts",
  dialect: "postgresql",
  dbCredentials: {
    url: url.toString(),
  },
  strict: true,
  verbose: true,
});
