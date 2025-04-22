export function up(knex) {
  return knex.schema
    .createTable('users', (table) => {
      table.increments('id').primary();
      table.bigInteger('telegram_id').unique();
      table.string('city');
      table.float('latitude');
      table.float('longitude');
      table.string('timezone').defaultTo('UTC');
      table.timestamp('created_at').defaultTo(knex.fn.now());
      table.timestamp('updated_at').defaultTo(knex.fn.now());
    })
    .createTable('reminders', (table) => {
      table.increments('id').primary();
      table.integer('user_id').references('id').inTable('users');
      table.string('prayer');
      table.integer('offset_minutes');
      table.timestamp('created_at').defaultTo(knex.fn.now());
      table.timestamp('updated_at').defaultTo(knex.fn.now());
    })
    .createTable('sessions', (table) => {
      table.bigInteger('telegram_id').primary();
      table.string('lang');
      table.jsonb('data');
      table.timestamp('created_at').defaultTo(knex.fn.now());
      table.timestamp('updated_at').defaultTo(knex.fn.now());
    });
}

export function down(knex) {
  return knex.schema
    .dropTable('sessions')
    .dropTable('reminders')
    .dropTable('users');
} 