const Joi = require('joi');

// Схема для создания/обновления площадки
const playgroundSchema = Joi.object({
  name: Joi.string().min(2).max(255).required(),
  type: Joi.string().valid('volleyball', 'basketball', 'football', 'workout', 'tennis', 'other').required(),
  lat: Joi.number().min(51).max(57).required(),  // Широта Беларуси
  lng: Joi.number().min(23).max(33).required(),  // Долгота Беларуси
  address: Joi.string().allow(''),
  work_hours: Joi.string().allow(''),
  price: Joi.string().allow(''),
  max_players: Joi.number().integer().min(1).max(100),
  equipment: Joi.object().default({}),
  surface: Joi.string().allow(''),
  lighting: Joi.boolean().default(false),
  photos: Joi.array().items(Joi.string()).default([]),
  description: Joi.string().allow('')
});

// Middleware для проверки
const validatePlayground = (req, res, next) => {
  const { error } = playgroundSchema.validate(req.body);
  if (error) {
    return res.status(400).json({
      error: 'Ошибка валидации',
      details: error.details.map(d => d.message)
    });
  }
  next();
};

module.exports = { validatePlayground };