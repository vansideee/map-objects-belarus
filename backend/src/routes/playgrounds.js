const { validatePlayground } = require('../middleware/validation');
const cloudinary = require('../config/cloudinary');
const upload = require('../middleware/upload');
const express = require('express');
const router = express.Router();
const db = require('../models/database');


// GET /api/playgrounds — список всех площадок (с фильтрами и пагинацией)
router.get('/', async (req, res) => {
  try {
    const { type, price, lighting, search, page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;
    
    let whereClause = 'WHERE 1=1';
    const params = [];

    // Поиск по названию и адресу
    if (search) {
      params.push(`%${search}%`);
      whereClause += ` AND (name ILIKE $${params.length} OR address ILIKE $${params.length})`;
    }

    if (type) {
      params.push(type);
      whereClause += ` AND type = $${params.length}`;
    }

    if (price === 'free') {
      whereClause += ` AND price = 'Бесплатно'`;
    }

    if (lighting === 'true') {
      whereClause += ` AND lighting = true`;
    }

    // Считаем общее количество
    const countQuery = `SELECT COUNT(*) FROM playgrounds ${whereClause}`;
    const countResult = await db.query(countQuery, params);
    const total = parseInt(countResult.rows[0].count);

    // Получаем страницу
    params.push(limit);
    params.push(offset);
    const dataQuery = `
      SELECT * FROM playgrounds 
      ${whereClause} 
      ORDER BY created_at DESC 
      LIMIT $${params.length - 1} OFFSET $${params.length}
    `;
    
    const result = await db.query(dataQuery, params);

    res.json({
      data: result.rows,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        totalPages: Math.ceil(total / limit)
      }
    });
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


// POST /api/playgrounds/:id/photos — загрузить фото площадки
router.post('/:id/photos', upload.single('photo'), async (req, res) => {
  try {
    const { id } = req.params;

    // Проверяем, существует ли площадка
    const playgroundCheck = await db.query('SELECT * FROM playgrounds WHERE id = $1', [id]);
    if (playgroundCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Площадка не найдена' });
    }

    // Загружаем фото в Cloudinary
    const result = await cloudinary.uploader.upload(req.file.path, {
      folder: 'ploshadki-bay',
      public_id: `playground-${id}-${Date.now()}`,
    });

    // Добавляем URL фото в массив photos
    const photoUrl = result.secure_url;
    const updateQuery = `
      UPDATE playgrounds 
      SET photos = array_append(photos, $1)
      WHERE id = $2
      RETURNING *
    `;
    
    const updateResult = await db.query(updateQuery, [photoUrl, id]);

    res.json({
      message: 'Фото загружено',
      photoUrl: photoUrl,
      playground: updateResult.rows[0]
    });
  } catch (err) {
    console.error('Ошибка при загрузке фото:', err);
    res.status(500).json({ error: 'Ошибка при загрузке фото' });
  }
});

module.exports = router;