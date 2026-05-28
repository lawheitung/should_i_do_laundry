export async function askOpenAI(prompt, env) {
    const body = {
      systemInstruction: {
        parts: [{ text: "You are a concise assistant." }]
      },
      contents: [
        { role: "user", parts: [{ text: prompt }] }
      ],
      generationConfig: {
        maxOutputTokens: 1000
      }
    };

    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${env.GEMINI_API_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body)
      }
    );

    if (!res.ok) throw new Error(await res.text());

    const data = await res.json();
    const text = data.candidates[0].content.parts[0].text;
    return text.replace(/^```json\s*/, "").replace(/```\s*$/, "").trim();
  }
  

  export function laundryPrompt(weatherData, calendarText) {
    const fourDayText = weatherData.forecast_4d
      ?.map(day => {
        return `  • ${day.day}: ${day.forecast}
        - Temp: ${day.temp_low}–${day.temp_high}°C
        - Humidity: ${day.humidity_low}–${day.humidity_high}%
        - Wind: ${day.wind_speed_low}–${day.wind_speed_high} km/h (${day.wind_direction})`;
      })
      .join("\n") || "  • No 4-day outlook data";
  
    return `
  You are a smart household assistant for laundry planning.
  Location: Singapore (GMT+8).
  Apartment: north-facing, ground floor.

  📌 My schedule:
  ==============================
  ${calendarText}
  ==============================
  
  Calendar interpretation rules:
  - "Office" all-day events: user unavailable until ~6pm
  - If the event is all day and it's a festival/holiday, I will not be in the office, ignore the "office" or "home" event.
  - "Home" all-day events: user available all day
  - Timed events: user busy during that period
  - Events at other locations: assume 45 mins travel before laundry can start

  
  ==============================
  🌤 CURRENT CONDITIONS
  ==============================
  - Immediate 2-hour forecast: ${JSON.stringify(weatherData.now.two_hour_forecast)}
  - UV Index: ${weatherData.now.uv?.uv_index ?? "unknown"}
  - Wind Speed: ${weatherData.now.wind_speed ?? "unknown"} km/h
  
  ==============================
  📅 24-HOUR FORECAST (East Region)
  ==============================
  ${weatherData.forecast_24h?.periods?.east_time_periods
      ?.map(p => `  • ${p.start} → ${p.end}: ${p.forecast}`)
      .join("\n") ?? "  • No forecast data"}
  
  ==============================
  🌈 4-DAY OUTLOOK
  ==============================
  ${fourDayText}
  
  ==============================


  Your job:
  - Decide when laundry should be done and estimate drying time (when to move indoors, next best laundry time) based on user's schedule.

  Guidelines:
  - Avoid drying outdoors if rain, drizzle, thundery showers, or hazy conditions are expected.
  - Higher wind speed and UV help drying; low UV or no sun reduces drying speed.
  - Decide if it's a good time to do laundry outdoors now and estimate how long it will take to dry.
  - If rain is possible during the drying time, recommend after how many hours/minutes to move laundry indoors (target: 75% drying outdoors)
  - Consider user's calendar to suggest feasible timing.
  - Explain reasoning briefly

  You MUST respond with ONLY valid JSON in this exact format, no markdown, no extra text:
  {
    "best_time": "Now" or a specific day and time e.g. "Saturday 9am",
    "move_indoors_by": "time to move laundry indoors, or null if no rain risk",
    "next_best_time": "next best day and time if best_time is missed",
    "reasoning": "one short sentence"
  }

  `;
  }
  