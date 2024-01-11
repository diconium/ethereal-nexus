import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import postgres from "postgres";

const connectionString = `postgres://${process.env.PGUSER}:${process.env.PGPASSWORD}@${process.env.PGHOST}:${process.env.PGPORT}/postgres`
const sql = postgres(connectionString, { max: 1, ssl: true })
const db = drizzle(sql);

await migrate(db, { migrationsFolder: "drizzle" });
await sql.end();