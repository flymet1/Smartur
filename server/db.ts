import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "@shared/schema";

const { Pool } = pg;

// Default database URL for aaPanel deployment
const DEFAULT_DATABASE_URL = "postgresql://smartur:F2YRLr2n4yFnaC4Y@127.0.0.1:5432/smartur";

const connectionString = process.env.DATABASE_URL || DEFAULT_DATABASE_URL;

export const pool = new Pool({ connectionString });
export const db = drizzle(pool, { schema });
