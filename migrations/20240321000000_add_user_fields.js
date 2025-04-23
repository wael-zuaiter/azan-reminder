export function up(knex) {
  return knex.schema.alterTable('users', (table) => {
    table.string('full_name').nullable();
    table.string('username').nullable();
  });
}

export function down(knex) {
  return knex.schema.alterTable('users', (table) => {
    table.dropColumn('full_name');
    table.dropColumn('username');
  });
} 