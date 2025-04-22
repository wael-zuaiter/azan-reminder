export function up(knex) {
  return knex.schema.alterTable('users', function(table) {
    table.string('timezone').defaultTo('UTC');
  });
}

export function down(knex) {
  return knex.schema.alterTable('users', function(table) {
    table.dropColumn('timezone');
  });
} 