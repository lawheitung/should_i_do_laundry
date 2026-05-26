import { handleAuth, handleOAuthCallback } from "./oauth.js";
import { formatCalendarForPrompt, getGroupedEventsSGT } from "./calendar.js";
import { laundryPrompt, askOpenAI } from "./chatgpt.js";
import { getAllWeatherData } from "./weather.js";

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (url.pathname === "/auth") {
      // Pass ?type=work or ?type=personal for OAuth
      const type = url.searchParams.get("type") || "personal";
      return handleAuth(env, type);
    }

    if (url.pathname === "/oauth/callback") {
      return handleOAuthCallback(url, env);
    }

    if (url.pathname === "/api/events") {
      const calendarData = await getGroupedEventsSGT(env);
      return new Response(JSON.stringify(calendarData, null, 2), {
        headers: { "Content-Type": "application/json" },
      });
    }

    if (url.pathname === "/debug-env") {
      return new Response(
        `KEY: ${env.CHATGPT_API_KEY ? "Loaded" : "Missing"}`
      );
    }

    if (url.pathname === "/weather") {
      const data = await getAllWeatherData({
        district: env.district,
        wind_station: env.wind_station,
        area: env.area,
      });
      return new Response(JSON.stringify(data, null, 2), {
        headers: { "Content-Type": "application/json" },
      });
    }

    // Test OpenAI
    if (url.pathname === "/ai-test") {
      const answer = await askOpenAI(
        "Give a very short tip for doing laundry.",
        env
      );
      return json({ result: answer });
    }

    // Laundry advice with weather + combined calendar
    if (url.pathname === "/laundry-advice") {
      const weatherData = await getAllWeatherData({
        district: env.district,
        wind_station: env.wind_station,
        area: env.area,
      });

      const calendarData = await getGroupedEventsSGT(env);
      const calendarText = formatCalendarForPrompt(calendarData);
      const prompt = laundryPrompt(weatherData, calendarText);
      const recommendation = await askOpenAI(prompt, env);

      return json({ result: recommendation });
    }

    return new Response("Worker is running", { status: 200 });
  },
};

function json(obj) {
  return new Response(JSON.stringify(obj, null, 2), {
    headers: { "Content-Type": "application/json" },
  });
}
