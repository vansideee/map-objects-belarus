const express = require('express');
const router = express.Router({ mergeParams: true });
const db = require('../models/database');
const { authenticateToken } = require('../middleware/auth');

// GET /api/playgrounds/:id/reviews — отзывы к площадке
router.get('/', async (req, res) => {
  try {
    const { id } = req.params;
    
    const result = await db.query(`
      SELECT r.*, u.username 
      FROM reviews r
      JOIN users u ON r.user_id = u.id
      WHERE r.playground_id = $1
      ORDER BY r.created_at DESC
    `, [id]);

    // Считаем средний рейтинг
    const avgResult = await db.query(
      'SELECT AVG(rating)::numeric(3,2) as average, COUNT(*) as count FROM reviews WHERE playground_id = $1',
      [id]
    );

    res.json({
      reviews: result.rows,
      averageRating: avgResult.rows[0].average || 0,
      totalReviews: parseInt(avgResult.rows[0].count)
    });
  } catch (err) {
    console.error('Ошибка при получении отзывов:', err);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

// POST /api/playgrounds/:id/reviews — добавить отзыв (только авторизованные)
router.post('/', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { rating, comment } = req.body;
    const userId = req.user.userId;

    // Проверяем, существует ли площадка
    const playgroundCheck = await db.query('SELECT * FROM playgrounds WHERE id = $1', [id]);
    if (playgroundCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Площадка не найдена' });
    }

    // Добавляем отзыв
    const result = await db.query(`
      INSERT INTO reviews (playground_id, user_id, rating, comment)
      VALUES ($1, $2, $3, $4)
      RETURNING *
    `, [id, userId, rating, comment]);

    res.status(201).json({
      message: 'Отзыв добавлен',
      review: result.rows[0]
    });
  } catch (err) {
    if (err.code === '23505') {
      return res.status(400).json({ error: 'Вы уже оставляли отзыв на эту площадку' });
    }
    console.error('Ошибка при добавлении отзыва:', err);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

// DELETE /api/playgrounds/:id/reviews/:reviewId — удалить отзыв
router.delete('/:reviewId', authenticateToken, async (req, res) => {
  try {
    const { id, reviewId } = req.params;
    const userId = req.user.userId;

    // Проверяем, что отзыв принадлежит пользователю
    const checkResult = await db.query(
      'SELECT * FROM reviews WHERE id = $1 AND playground_id = $2 AND user_id = $3',
      [reviewId, id, userId]
    );

    if (checkResult.rows.length === 0) {
      return res.status(403).json({ error: 'Отзыв не найден или нет прав на удаление' });
    }

    await db.query('DELETE FROM reviews WHERE id = $1', [reviewId]);

    res.json({ message: 'Отзыв удалён' });
  } catch (err) {
    console.error('Ошибка при удалении отзыва:', err);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

module.exports = router;