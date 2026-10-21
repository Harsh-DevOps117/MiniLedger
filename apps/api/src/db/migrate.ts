import { createHash } from 'node:crypto';
import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import type { Pool } from 'pg';
import { createPool, inTransaction } from './pool';
import { readConfig } from '../config';

export async function migrate(pool: Pool): Promise<void> {
  await inTransaction(pool, async (client) => {
    await client.query('SELECT pg_advisory_xact_lock(724091)');
    await client.query(
      'CREATE TABLE IF NOT EXISTS schema_migrations (name TEXT PRIMARY KEY, checksum TEXT NOT NULL, applied_at TIMESTAMPTZ NOT NULL DEFAULT now())',
    );
    const folder = path.resolve(__dirname, '../../migrations');
    const files = (await readdir(folder)).filter((name) => name.endsWith('.sql')).sort();
    for (const name of files) {
      const sql = await readFile(path.join(folder, name), 'utf8');
      const checksum = createHash('sha256').update(sql).digest('hex');
      const previous = await client.query<{ checksum: string }>(
        'SELECT checksum FROM schema_migrations WHERE name = $1',
        [name],
      );
      if (previous.rows[0]) {
        if (previous.rows[0].checksum !== checksum)
          throw new Error(`Applied migration changed: ${name}. Add a new migration instead.`);
        continue;
      }
      await client.query(sql);
      await client.query('INSERT INTO schema_migrations (name, checksum) VALUES ($1, $2)', [
        name,
        checksum,
      ]);
    }
  });
}
if (require.main === module) {
  const pool = createPool(readConfig().DATABASE_URL);
  migrate(pool)
    .then(() => console.info('Migrations complete'))
    .catch((error: unknown) => {
      console.error(error);
      process.exitCode = 1;
    })
    .finally(() => pool.end());
}
