import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import postgres from "postgres";

const sql = postgres(process.env.DRIZZLE_DATABASE_URL!, { max: 1, ssl: true })
const db = drizzle(sql);

await migrate(db, { migrationsFolder: "drizzle" });
await sql.end();