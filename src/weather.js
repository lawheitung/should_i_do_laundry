const API_BASE_URL = "https://api-open.data.gov.sg/v2/real-time/api/";


// Utility function for making API requests
export async function fetchDataFromApi(endpoint) {
  const url = `${API_BASE_URL}${endpoint}`;
  try {
    const response = await fetch(url);
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
    return await response.json();
  } catch (error) {
    console.error(`Error fetching data from ${url}:`, error);
    return null;
  }
}

// Fetch 2-Hour Forecast
export async function get2hForecast(area) {
  const data = await fetchDataFromApi("two-hr-forecast");
  if (data && data.code === 0) {
    const items = data.data.items || [];
    for (const item of items) {
      for (const forecast of item.forecasts || []) {
        if (forecast.area === area) {
          return forecast.forecast;
        }
      }
    }
  }
  return null;
}

// Fetch UV Index
export async function getUvIndex() {
  const data = await fetchDataFromApi("uv");
  if (data && data.data && data.data.records.length > 0) {
    const uvData = data.data.records[0].index[0];
    return {
      uv_index: uvData.value,
      timestamp: uvData.hour,
    };
  }
}


// Fetch Wind Speed
export async function getWindSpeed(stationId) {
  const data = await fetchDataFromApi("wind-speed");
  if (data && data.data && data.data.readings.length > 0) {
    const readings = data.data.readings[0].data || [];
    const windSpeed = readings.find((item) => item.stationId === stationId);
    return windSpeed ? windSpeed.value : null;
  }
  return null;
}


// Fetch 24-hour Forecast
export async function get24hForecast(area) {
  const data = await fetchDataFromApi("twenty-four-hr-forecast");
  if (data && data.code === 0) {
    const record = data.data.records[0];
    const generalForecast = {
      temperature: record.general.temperature,
      forecast: record.general.forecast,
      wind: record.general.wind,
      humidity:
        (record.general.relativeHumidity.low +
          record.general.relativeHumidity.high) /
        2,
    };

    const eastForecast = record.periods.map((period) => ({
      start: period.timePeriod.start,
      end: period.timePeriod.end,
      forecast: period.regions[area]?.text || "",
    }));

    return [generalForecast, { east_time_periods: eastForecast }];
  }
  return [null, null];
}

// Fetch 4 day outlook
export async function getFourDayOutlook() {
  const data = await fetchDataFromApi("four-day-outlook");
  if (!data || data.code !== 0) return null;

  const record = data.data.records?.[0];
  if (!record || !record.forecasts) return null;

  // Transform each day's forecast into a clean object
  const outlook = record.forecasts.map((item) => ({
    day: item.day,                                 // e.g., "Thursday"
    forecast: item.forecast.text,                  // e.g., "Thundery Showers"
    temp_low: item.temperature.low,                // numeric
    temp_high: item.temperature.high,              // numeric
    humidity_low: item.relativeHumidity.low,       // numeric
    humidity_high: item.relativeHumidity.high,     // numeric
    wind_speed_low: item.wind.speed.low,           // numeric
    wind_speed_high: item.wind.speed.high,         // numeric
    wind_direction: item.wind.direction            // e.g., "NNW"
  }));

  return outlook;
}

export async function getAllWeatherData({ area, district, wind_station }) {
  const [general24h, periods24h] = await get24hForecast(area);
  const fourDayOutlook = await getFourDayOutlook();

  return {
    now:{
      two_hour_forecast: await get2hForecast(district),
      uv: await getUvIndex(),
      wind_speed: await getWindSpeed(wind_station)
    },
    forecast_24h: {
      general: general24h,
      periods: periods24h,
    },
    forecast_4d: fourDayOutlook || []   // ensure it always returns an array
  };
}
