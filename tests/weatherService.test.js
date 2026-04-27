// tests/weatherService.test.js
// Exercice 1 — Mock d'API externe — Axios

jest.mock('axios'); // ← DOIT être en haut, avant les imports

const axios = require('axios');
const { WeatherService } = require('../src/weatherService');

describe('WeatherService', () => {
  let service;

  beforeEach(() => {
    service = new WeatherService();
    jest.clearAllMocks();
  });

  describe('getCurrentWeather()', () => {
    const mockResponse = {
      data: {
        name: 'Paris',
        main: { temp: 18.5, humidity: 72 },
        weather: [{ description: 'nuageux' }],
      }
    };

    // Test 1 — Réponse 200 → retourne { city, temp, description, humidity }
    test('retourne les données météo pour une ville valide', async () => {
      // ARRANGE
      axios.get.mockResolvedValue(mockResponse);

      // ACT
      const result = await service.getCurrentWeather('Paris');

      // ASSERT
      expect(result).toEqual({
        city: 'Paris',
        temp: 18.5,
        description: 'nuageux',
        humidity: 72,
      });
    });

    // Test 2 — axios.get() appelé avec la bonne URL et les bons params
    test('appelle axios.get avec la bonne URL et les bons paramètres', async () => {
      // ARRANGE
      axios.get.mockResolvedValue(mockResponse);

      // ACT
      await service.getCurrentWeather('Paris');

      // ASSERT
      expect(axios.get).toHaveBeenCalledWith(
        'https://api.openweathermap.org/data/2.5/weather',
        {
          params: {
            q: 'Paris',
            appid: expect.any(String),
            units: 'metric',
          }
        }
      );
    });

    // Test 3 — Réponse 404 → lève Error('Ville introuvable : XYZ')
    test('lève une erreur 404 pour ville introuvable', async () => {
      // ARRANGE
      axios.get.mockRejectedValue({ response: { status: 404 } });

      // ACT & ASSERT
      await expect(service.getCurrentWeather('XYZ'))
        .rejects
        .toThrow('Ville introuvable : XYZ');
    });

    // Test 4 — Réponse 401 → lève Error('Clé API invalide')
    test('lève une erreur 401 pour clé API invalide', async () => {
      // ARRANGE
      axios.get.mockRejectedValue({ response: { status: 401 } });

      // ACT & ASSERT
      await expect(service.getCurrentWeather('Paris'))
        .rejects
        .toThrow('Clé API invalide');
    });

    // Test 5 — Erreur réseau (axios rejette sans response)
    test('lève une erreur réseau quand axios rejette sans response', async () => {
      // ARRANGE
      axios.get.mockRejectedValue(new Error('Network Error'));

      // ACT & ASSERT
      await expect(service.getCurrentWeather('Paris'))
        .rejects
        .toThrow('Erreur réseau : Network Error');
    });
  });

  describe('getForecast()', () => {
    // Test 6 — getForecast('Paris', 3) → retourne un tableau de 3 objets
    test('retourne un tableau de 3 objets { date, temp, description } pour 3 jours', async () => {
      // ARRANGE
      const mockForecastResponse = {
        data: {
          list: [
            { dt_txt: '2024-01-01 12:00:00', main: { temp: 10 }, weather: [{ description: 'ensoleillé' }] },
            { dt_txt: '2024-01-02 12:00:00', main: { temp: 12 }, weather: [{ description: 'nuageux' }] },
            { dt_txt: '2024-01-03 12:00:00', main: { temp: 8 }, weather: [{ description: 'pluvieux' }] },
          ]
        }
      };
      axios.get.mockResolvedValue(mockForecastResponse);

      // ACT
      const result = await service.getForecast('Paris', 3);

      // ASSERT
      expect(result).toHaveLength(3);
      expect(result[0]).toEqual({
        date: '2024-01-01 12:00:00',
        temp: 10,
        description: 'ensoleillé',
      });
      expect(result[1]).toEqual({
        date: '2024-01-02 12:00:00',
        temp: 12,
        description: 'nuageux',
      });
      expect(result[2]).toEqual({
        date: '2024-01-03 12:00:00',
        temp: 8,
        description: 'pluvieux',
      });
    });

    // Test 7 — getForecast() → axios.get() appelé avec le bon endpoint /forecast
    test('appelle axios.get avec le bon endpoint /forecast', async () => {
      // ARRANGE
      const mockForecastResponse = {
        data: { list: [] }
      };
      axios.get.mockResolvedValue(mockForecastResponse);

      // ACT
      await service.getForecast('Paris', 3);

      // ASSERT
      expect(axios.get).toHaveBeenCalledWith(
        'https://api.openweathermap.org/data/2.5/forecast',
        {
          params: {
            q: 'Paris',
            appid: expect.any(String),
            cnt: 24, // 3 jours * 8
            units: 'metric',
          }
        }
      );
    });
  });
});
