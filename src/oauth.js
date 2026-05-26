// oauth.js

// Initiate OAuth login for work or personal account
export function handleAuth(env, type = "personal") {
  const clientId =
    type === "work" ? env.GOOGLE_CLIENT_ID_WORK : env.GOOGLE_CLIENT_ID_PERSONAL;

  const oauthUrl = new URL("https://accounts.google.com/o/oauth2/v2/auth");
  oauthUrl.searchParams.set("client_id", clientId);
  oauthUrl.searchParams.set("redirect_uri", env.REDIRECT_URI);
  oauthUrl.searchParams.set("response_type", "code");
  oauthUrl.searchParams.set(
    "scope",
    "https://www.googleapis.com/auth/calendar.readonly"
  );
  oauthUrl.searchParams.set("access_type", "offline");
  oauthUrl.searchParams.set("prompt", "consent");
  oauthUrl.searchParams.set("state", type); // keep track of account type

  return Response.redirect(oauthUrl.toString(), 302);
}

// Handle OAuth callback
export async function handleOAuthCallback(url, env) {
  const code = url.searchParams.get("code");
  const type = url.searchParams.get("state") || "personal";

  const clientId =
    type === "work" ? env.GOOGLE_CLIENT_ID_WORK : env.GOOGLE_CLIENT_ID_PERSONAL;
  const clientSecret =
    type === "work"
      ? env.GOOGLE_CLIENT_SECRET_WORK
      : env.GOOGLE_CLIENT_SECRET_PERSONAL;

  const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: env.REDIRECT_URI,
      grant_type: "authorization_code",
    }),
  });

  const tokenJson = await tokenRes.json();

  return new Response(
    JSON.stringify(
      {
        message:
          "Save this refresh_token to your Cloudflare Secrets for type: " + type,
        refresh_token: tokenJson.refresh_token,
      },
      null,
      2
    ),
    { headers: { "Content-Type": "application/json" } }
  );
}

// Get access token using refresh token
export async function getAccessToken(env, type = "personal") {
  const refreshToken =
    type === "work"
      ? env.GOOGLE_REFRESH_TOKEN_WORK
      : env.GOOGLE_REFRESH_TOKEN_PERSONAL;
  const clientId =
    type === "work" ? env.GOOGLE_CLIENT_ID_WORK : env.GOOGLE_CLIENT_ID_PERSONAL;
  const clientSecret =
    type === "work"
      ? env.GOOGLE_CLIENT_SECRET_WORK
      : env.GOOGLE_CLIENT_SECRET_PERSONAL;

  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: refreshToken,
      grant_type: "refresh_token",
    }),
  });

  const data = await res.json();
  return data.access_token;
}
