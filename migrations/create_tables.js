export async function up(knex) {
    return knex.schema
      .createTable('users', (table) => {
        table.increments('id').primary();
        table.bigInteger('telegram_id').unique().notNullable();
        table.string('city').notNullable();
        table.float('latitude').notNullable();
        table.float('longitude').notNullable();
      })
      .createTable('reminders', (table) => {
        table.increments('id').primary();
        table.integer('user_id').references('id').inTable('users').onDelete('CASCADE');
        table.string('prayer').notNullable();
        table.integer('offset_minutes').notNullable();
      });
  }
  
  export async function down(knex) {
    return knex.schema
      .dropTableIfExists('reminders')
      .dropTableIfExists('users');
  }