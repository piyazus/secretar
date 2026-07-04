// lib/db.ts
// Единый пул соединений PostgreSQL (self-hosted, ТЗ §5 — данные локально).

import { Pool } from "pg";

let pool: Pool | null = null;

export function getPool(): Pool {
  if (!pool) {
    pool = new Pool({
      host: process.env.POSTGRES_HOST ?? "postgres",
      port: Number(process.env.POSTGRES_PORT ?? 5432),
      database: process.env.POSTGRES_DB ?? "secretar",
      user: process.env.POSTGRES_USER ?? "secretar",
      password: process.env.POSTGRES_PASSWORD,
      max: 5,
    });
  }
  return pool;
}

export async function query<T = unknown>(
  text: string,
  params?: unknown[]
): Promise<{ rows: T[] }> {
  const res = await getPool().query(text, params as never[]);
  return { rows: res.rows as T[] };
}
