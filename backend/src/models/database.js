const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

// Проверка подключения
pool.connect((err, client, release) => {
  if (err) {
    console.error('Ошибка подключения к базе данных:', err.stack);
  } else {
    console.log('✅ Подключение к PostgreSQL успешно!');
    release();
  }
});

module.exports = {
  query: (text, params) => pool.query(text, params),
};