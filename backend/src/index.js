const express = require('express');
const cors = require('cors');
require('dotenv').config();

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Подключение к базе данных
const db = require('./models/database');

// Тестовый маршрут
app.get('/', (req, res) => {
  res.json({
    message: 'Добро пожаловать на Площадки Бай API!',
    status: 'Сервер работает',
    version: '1.0.0'
  });
});

// Маршрут для проверки работы сервера
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// === ВСТАВЛЯЙТЕ СЮДА ===
// Подключаем роуты площадок
const playgroundsRouter = require('./routes/playgrounds');
app.use('/api/playgrounds', playgroundsRouter);
// === КОНЕЦ ВСТАВКИ ===

// Подключаем роуты авторизации
const authRouter = require('./routes/auth');
app.use('/api/auth', authRouter);




// Запуск сервера
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Сервер запущен на порту ${PORT}`);
  console.log(`📍 http://localhost:${PORT}`);
});