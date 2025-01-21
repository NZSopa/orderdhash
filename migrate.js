const { runMigrations } = require('./app/lib/migrations');

async function migrate() {
  try {
    const result = await runMigrations();
    console.log('Migration result:', result);
  } catch (error) {
    console.error('Migration failed:', error);
  }
}

migrate(); 