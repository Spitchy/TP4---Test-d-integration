// src/weatherService.js
const axios = require('axios');

const API_KEY = process.env.WEATHER_API_KEY || 'test-key';
const BASE_URL = 'https://api.openweathermap.org/data/2.5';

class WeatherService {
  async getCurrentWeather(city) {
    try {
      const response = await axios.get(`${BASE_URL}/weather`, {
        params: { q: city, appid: API_KEY, units: 'metric' }
      });
      return {
        city: response.data.name,
        temp: response.data.main.temp,
        description: response.data.weather[0].description,
        humidity: response.data.main.humidity,
      };
    } catch (error) {
      if (error.response?.status === 404) {
        throw new Error(`Ville introuvable : ${city}`);
      }
      if (error.response?.status === 401) {
        throw new Error('Clé API invalide');
      }
      throw new Error(`Erreur réseau : ${error.message}`);
    }
  }

  async getForecast(city, days = 5) {
    const response = await axios.get(`${BASE_URL}/forecast`, {
      params: { q: city, appid: API_KEY, cnt: days * 8, units: 'metric' }
    });
    return response.data.list.map(item => ({
      date: item.dt_txt,
      temp: item.main.temp,
      description: item.weather[0].description,
    }));
  }
}

module.exports = { WeatherService };
