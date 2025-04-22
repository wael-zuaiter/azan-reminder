import knex from 'knex';
import knexConfig from './knexfile.js';

const db = knex(knexConfig.development);

async function runMigrations() {
  try {
    console.log('Running migrations...');
    await db.migrate.latest();
    console.log('Migrations completed successfully');
  } catch (error) {
    console.error('Error running migrations:', error);
    process.exit(1);
  } finally {
    await db.destroy();
  }
}

runMigrations(); 