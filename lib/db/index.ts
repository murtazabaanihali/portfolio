import { drizzle } from "drizzle-orm/neon-http";
import { neon } from "@neondatabase/serverless";

import * as schema from "@/lib/db/schema";

const connectionString =
  process.env.DATABASE_URL ||
  "postgresql://placeholder:placeholder@placeholder.neon.tech/neondb";

const sql = neon(connectionString);

const db = drizzle(sql, { schema });

export default db;
