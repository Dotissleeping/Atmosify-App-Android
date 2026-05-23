// ── WEATHER SERVICE ──────────────────────────────────────
// Put your OpenWeatherMap API key here:
export const OWM_API_KEY = 'YOUR_API_KEY_HERE';

export const WEATHER_MOODS = {
  clear: 'sunny',
  clouds: 'cloudy',
  rain: 'rainy',
  drizzle: 'rainy',
  thunderstorm: 'stormy',
  snow: 'snowy',
  mist: 'cloudy',
  fog: 'cloudy',
  haze: 'cloudy',
  smoke: 'cloudy',
  dust: 'cloudy',
  sand: 'cloudy',
  ash: 'cloudy',
  squall: 'stormy',
  tornado: 'stormy',
};

export const THEMES = {
  sunny:  { accent: '#FFD54F', rayColor: 'rgba(255,220,100,', label: 'SUNNY' },
  cloudy: { accent: '#90CAF9', rayColor: 'rgba(200,220,255,', label: 'CLOUDY' },
  rainy:  { accent: '#42A5F5', rayColor: 'rgba(100,160,255,', label: 'RAINY' },
  stormy: { accent: '#EF5350', rayColor: 'rgba(255,100,100,', label: 'STORMY' },
  snowy:  { accent: '#E3F2FD', rayColor: 'rgba(220,240,255,', label: 'SNOWY' },
  night:  { accent: '#9FA8DA', rayColor: 'rgba(150,150,255,', label: 'NIGHT' },
};

export const BACKGROUNDS = {
  sunny:  require('../../assets/backgrounds/sunny.png'),
  cloudy: require('../../assets/backgrounds/cloudy.png'),
  rainy:  require('../../assets/backgrounds/rainy.png'),
  stormy: require('../../assets/backgrounds/stormy.png'),
  snowy:  require('../../assets/backgrounds/snowy.png'),
  night:  require('../../assets/backgrounds/night.png'),
};

export function isNight(timezoneOffset) {
  const utcNow = Date.now();
  const localTime = new Date(utcNow + timezoneOffset * 1000);
  const hour = localTime.getUTCHours();
  return hour < 6 || hour >= 19;
}

export function getMood(weatherMain, timezoneOffset) {
  if (isNight(timezoneOffset)) return 'night';
  return WEATHER_MOODS[weatherMain.toLowerCase()] || 'cloudy';
}

export async function fetchWeather(city) {
  const url = `https://api.openweathermap.org/data/2.5/weather?q=${encodeURIComponent(city)}&appid=${OWM_API_KEY}&units=metric`;
  const res = await fetch(url);
  const data = await res.json();

  if (data.cod !== 200) {
    throw new Error(data.message || 'City not found');
  }

  const weatherMain = data.weather[0].main;
  const tzOffset = data.timezone || 0;
  const mood = getMood(weatherMain, tzOffset);

  return {
    city: data.name,
    mood,
    description: data.weather[0].description
      .split(' ')
      .map(w => w.charAt(0).toUpperCase() + w.slice(1))
      .join(' '),
    temp: Math.round(data.main.temp),
    feelsLike: Math.round(data.main.feels_like),
    humidity: data.main.humidity,
    wind: Math.round(data.wind.speed * 10) / 10,
    isNight: isNight(tzOffset),
  };
}
