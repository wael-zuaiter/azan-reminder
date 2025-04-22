export function up(knex) {
  return knex.schema.createTable('sessions', function(table) {
    table.string('telegram_id').primary();
    table.string('lang').defaultTo('en');
    table.json('data').defaultTo('{}');
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());
  });
}

export function down(knex) {
  return knex.schema.dropTable('sessions');
} 