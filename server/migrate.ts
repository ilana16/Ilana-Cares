import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

/**
 * Run database migrations automatically on startup
 * This ensures tables are created when deploying to production
 */
export async function runMigrations() {
  if (!process.env.DATABASE_URL) {
    console.log('[Migration] No DATABASE_URL found, skipping migrations');
    return;
  }

  try {
    console.log('[Migration] Running database migrations...');
    const { stdout, stderr } = await execAsync('pnpm db:push');
    
    if (stdout) console.log('[Migration]', stdout);
    if (stderr) console.error('[Migration]', stderr);
    
    console.log('[Migration] Database migrations completed successfully');
  } catch (error) {
    console.error('[Migration] Failed to run migrations:', error);
    // Don't throw - allow app to start even if migrations fail
    // Tables might already exist
  }
}

