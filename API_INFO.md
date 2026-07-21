# API Площадки Бай

## Базовый URL
https://ploshadki-bay-api.onrender.com

## Endpoints

| Метод | URL | Описание |
|-------|-----|----------|
| GET | `/api/playgrounds` | Список всех площадок (с пагинацией) |
| GET | `/api/playgrounds?page=1&limit=20` | Пагинация |
| GET | `/api/playgrounds?type=basketball` | Фильтр по типу |
| GET | `/api/playgrounds/nearby?lat=53.9&lng=27.56&radius=5000` | Поиск рядом |
| GET | `/api/playgrounds/1` | Одна площадка |
| POST | `/api/playgrounds` | Добавить площадку |
| PUT | `/api/playgrounds/1` | Обновить площадку |
| DELETE | `/api/playgrounds/1` | Удалить площадку |

## Пример ответа (GET /api/playgrounds)

```json
{
  "data": [
    {
      "id": 1,
      "name": "Площадка Городской вал",
      "type": "basketball",
      "coordinates": "...",
      "address": "Минск, пр. Независимости, 1",
      "work_hours": "08:00-22:00",
      "price": "Бесплатно",
      "max_players": 10,
      "equipment": {"hoops": 2, "backboards": true},
      "surface": "асфальт",
      "lighting": true,
      "photos": [],
      "description": "Крытая площадка в центре города"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 5,
    "totalPages": 1
  }
}