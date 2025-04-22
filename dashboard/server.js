const express = require('express');
const knex = require('knex')(require('../knexfile').development);
const app = express();
app.use(express.static('public'));
app.use(express.json());

app.get('/api/users', async (req, res) => {
  const users = await knex('users');
  res.json(users);
});

app.get('/api/reminders', async (req, res) => {
  const reminders = await knex('reminders');
  res.json(reminders);
});

app.post('/api/reminders', async (req, res) => {
  const { telegram_id, prayer, offset_minutes } = req.body;
  const user = await knex('users').where({ telegram_id }).first();
  if (!user) return res.status(404).send('User not found');
  await knex('reminders').insert({
    user_id: user.id,
    prayer,
    offset_minutes
  });
  res.send('OK');
});

app.delete('/api/reminders/:id', async (req, res) => {
  await knex('reminders').where({ id: req.params.id }).delete();
  res.send('Deleted');
});

app.listen(3001, () => {
  console.log('Dashboard server running on port 3001');
});