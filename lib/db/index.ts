import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from 'pg';

import * as schema from "@/lib/db/schema";

const pool = new Pool({
    connectionString: process.env.DATABASE_URL!,
    ssl: {
        rejectUnauthorized: false,
    },
    max: 20,
    idleTimeoutMillis: 300000,
    connectionTimeoutMillis: 20000,
});

const db = drizzle(pool, {
    schema: schema,
});

export default db;