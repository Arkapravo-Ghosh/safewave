import "server-only";

import { drizzle } from "drizzle-orm/node-postgres";
import { Pool, type PoolConfig } from "pg";

import * as schema from "./schema";

type PgSslMode = "disable" | "allow" | "prefer" | "require" | "verify-ca" | "verify-full";
type ExtendedPoolConfig = PoolConfig & { enableChannelBinding?: boolean };

const requiredEnvVars = ["PGHOST", "PGDATABASE", "PGUSER", "PGPASSWORD"] as const;

for (const envVar of requiredEnvVars) {
  if (!process.env[envVar]) {
    throw new Error(`Missing required environment variable: ${envVar}`);
  }
}

function getSslConfig(mode: string | undefined): PoolConfig["ssl"] {
  const sslMode = (mode ?? "prefer") as PgSslMode;

  if (sslMode === "disable") {
    return false;
  }

  if (sslMode === "verify-ca" || sslMode === "verify-full") {
    return { rejectUnauthorized: true };
  }

  return { rejectUnauthorized: false };
}

const poolConfig: ExtendedPoolConfig = {
  host: process.env.PGHOST,
  database: process.env.PGDATABASE,
  user: process.env.PGUSER,
  password: process.env.PGPASSWORD,
  port: process.env.PGPORT ? Number(process.env.PGPORT) : 5432,
  ssl: getSslConfig(process.env.PGSSLMODE),
  enableChannelBinding:
    process.env.PGCHANNELBINDING === "require" ||
    process.env.PGCHANNELBINDING === "prefer" ||
    process.env.PGCHANNELBINDING === "true",
  };

  const pool = new Pool(poolConfig);

export const db = drizzle(pool, { schema });
export { schema };
