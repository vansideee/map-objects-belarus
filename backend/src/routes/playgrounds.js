const { validatePlayground } = require('../middleware/validation');
const express = require('express');
const router = express.Router();
const db = require('../models/database');

// GET /api/playgrounds — список всех площадок (с фильтрами)
router.get('/', async (req, res) => {
  try {
    const { type, price, lighting } = req.query;
    let query = 'SELECT * FROM playgrounds WHERE 1=1';
    const params = [];

    if (type) {
      params.push(type);
      query += ` AND type = $${params.length}`;
    }

    if (price === 'free') {
      query += ` AND price = 'Бесплатно'`;
    }

    if (lighting === 'true') {
      query += ` AND lighting = true`;
    }

    query += ' ORDER BY created_at DESC';

    const result = await db.query(query, params);
    res.json(result.rows);
  } catch (err) {
    console.error('Ошибка при получении площадок:', err);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

// GET /api/playgrounds/nearby — площадки рядом (геопоиск)
router.get('/nearby', async (req, res) => {
  try {
    const { lat, lng, radius = 5000 } = req.query;

    if (!lat || !lng) {
      return res.status(400).json({ error: 'Необходимо указать lat и lng' });
    }

    const query = `
      SELECT *, 
        ST_Distance(
          coordinates::geography,
          ST_SetSRID(ST_MakePoint($1, $2), 4326)::geography
        ) as distance
      FROM playgrounds
      WHERE ST_DWithin(
        coordinates::geography,
        ST_SetSRID(ST_MakePoint($1, $2), 4326)::geography,
        $3
      )
      ORDER BY distance
    `;

    const result = await db.query(query, [lng, lat, radius]);
    res.json(result.rows);
  } catch (err) {
    console.error('Ошибка при геопоиске:', err);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

// GET /api/playgrounds/:id — одна площадка
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await db.query('SELECT * FROM playgrounds WHERE id = $1', [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Площадка не найдена' });
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error('Ошибка при получении площадки:', err);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

// POST /api/playgrounds — добавить площадку
router.post('/', validatePlayground, async (req, res) => {
  try {
    const {
      name, type, lat, lng, address, work_hours, price,
      max_players, equipment, surface, lighting, photos, description
    } = req.body;

    const query = `
      INSERT INTO playgrounds (
        name, type, coordinates, address, work_hours, price,
        max_players, equipment, surface, lighting, photos, description
      ) VALUES (
        $1, $2, ST_SetSRID(ST_MakePoint($3, $4), 4326), $5, $6, $7, $8, $9, $10, $11, $12, $13
      ) RETURNING *
    `;

    const result = await db.query(query, [
      name, type, lng, lat, address, work_hours, price,
      max_players, JSON.stringify(equipment || {}), surface, lighting || false,
      photos || [], description
    ]);

    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('Ошибка при добавлении площадки:', err);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

// PUT /api/playgrounds/:id — обновить площадку
router.put('/:id', validatePlayground, async (req, res) => {
  try {
    const { id } = req.params;
    const {
      name, type, lat, lng, address, work_hours, price,
      max_players, equipment, surface, lighting, photos, description
    } = req.body;

    const query = `
      UPDATE playgrounds SET
        name = $1,
        type = $2,
        coordinates = ST_SetSRID(ST_MakePoint($3, $4), 4326),
        address = $5,
        work_hours = $6,
        price = $7,
        max_players = $8,
        equipment = $9,
        surface = $10,
        lighting = $11,
        photos = $12,
        description = $13
      WHERE id = $14
      RETURNING *
    `;

    const result = await db.query(query, [
      name, type, lng, lat, address, work_hours, price,
      max_players, JSON.stringify(equipment || {}), surface, lighting || false,
      photos || [], description, id
    ]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Площадка не найдена' });
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error('Ошибка при обновлении площадки:', err);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

// DELETE /api/playgrounds/:id — удалить площадку
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await db.query('DELETE FROM playgrounds WHERE id = $1 RETURNING *', [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Площадка не найдена' });
    }

    res.json({ message: 'Площадка удалена', playground: result.rows[0] });
  } catch (err) {
    console.error('Ошибка при удалении площадки:', err);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

module.exports = router;