import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";
import session from "express-session";
import cookieParser from "cookie-parser";
import axios from "axios";
import dotenv from "dotenv";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3000;

// Spotify Config
const CLIENT_ID = process.env.SPOTIFY_CLIENT_ID;
const CLIENT_SECRET = process.env.SPOTIFY_CLIENT_SECRET;
const REDIRECT_URI = `${process.env.APP_URL}/auth/callback`;

app.use(express.json());
app.use(cookieParser());
app.use(
  session({
    secret: "spotify-screensaver-secret",
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: true,
      sameSite: "none",
      httpOnly: true,
      maxAge: 24 * 60 * 60 * 1000, // 24 hours
    },
  })
);

// Auth Routes
app.get("/api/auth/url", (req, res) => {
  if (!CLIENT_ID) {
    return res.status(500).json({ error: "SPOTIFY_CLIENT_ID not configured" });
  }

  const scopes = [
    "user-read-recently-played",
    "user-library-read",
    "user-top-read",
  ].join(" ");

  const params = new URLSearchParams({
    client_id: CLIENT_ID,
    response_type: "code",
    redirect_uri: REDIRECT_URI,
    scope: scopes,
    show_dialog: "true",
  });

  res.json({ url: `https://accounts.spotify.com/authorize?${params.toString()}` });
});

app.get(["/auth/callback", "/auth/callback/"], async (req, res) => {
  const { code } = req.query;

  if (!code) {
    return res.send("No code provided");
  }

  try {
    const response = await axios.post(
      "https://accounts.spotify.com/api/token",
      new URLSearchParams({
        grant_type: "authorization_code",
        code: code as string,
        redirect_uri: REDIRECT_URI,
      }).toString(),
      {
        headers: {
          Authorization: `Basic ${Buffer.from(`${CLIENT_ID}:${CLIENT_SECRET}`).toString("base64")}`,
          "Content-Type": "application/x-www-form-urlencoded",
        },
      }
    );

    const { access_token, refresh_token, expires_in } = response.data;
    (req.session as any).accessToken = access_token;
    (req.session as any).refreshToken = refresh_token;
    (req.session as any).expiresAt = Date.now() + expires_in * 1000;

    res.send(`
      <html>
        <body>
          <script>
            if (window.opener) {
              window.opener.postMessage({ type: 'OAUTH_AUTH_SUCCESS' }, '*');
              window.close();
            } else {
              window.location.href = '/';
            }
          </script>
          <p>Authentication successful. This window should close automatically.</p>
        </body>
      </html>
    `);
  } catch (error: any) {
    console.error("Token exchange error:", error.response?.data || error.message);
    res.status(500).send("Authentication failed");
  }
});

app.get("/api/auth/status", (req, res) => {
  const sessionData = req.session as any;
  res.json({ authenticated: !!sessionData.accessToken });
});

app.post("/api/auth/logout", (req, res) => {
  req.session.destroy(() => {
    res.json({ success: true });
  });
});

// Spotify Data Routes
app.get("/api/spotify/tracks", async (req, res) => {
  const sessionData = req.session as any;
  const accessToken = sessionData.accessToken;

  if (!accessToken) {
    return res.status(401).json({ error: "Not authenticated" });
  }

  try {
    const headers = { Authorization: `Bearer ${accessToken}` };

    // Fetch from 3 sources
    const [recentRes, likedRes, topRes] = await Promise.all([
      axios.get("https://api.spotify.com/v1/me/player/recently-played?limit=20", { headers }).catch(() => ({ data: { items: [] } })),
      axios.get("https://api.spotify.com/v1/me/tracks?limit=20", { headers }).catch(() => ({ data: { items: [] } })),
      axios.get("https://api.spotify.com/v1/me/top/tracks?limit=20&time_range=short_term", { headers }).catch(() => ({ data: { items: [] } })),
    ]);

    const tracks: any[] = [];

    // Process Recently Played
    recentRes.data.items.forEach((item: any) => {
      const track = item.track;
      tracks.push({
        id: track.id,
        name: track.name,
        artist: track.artists.map((a: any) => a.name).join(", "),
        album: track.album.name,
        image: track.album.images[0]?.url,
      });
    });

    // Process Liked Songs
    likedRes.data.items.forEach((item: any) => {
      const track = item.track;
      tracks.push({
        id: track.id,
        name: track.name,
        artist: track.artists.map((a: any) => a.name).join(", "),
        album: track.album.name,
        image: track.album.images[0]?.url,
      });
    });

    // Process Top Tracks
    topRes.data.items.forEach((track: any) => {
      tracks.push({
        id: track.id,
        name: track.name,
        artist: track.artists.map((a: any) => a.name).join(", "),
        album: track.album.name,
        image: track.album.images[0]?.url,
      });
    });

    // De-duplicate by album image or ID
    const uniqueTracks = Array.from(new Map(tracks.map((t) => [t.image, t])).values());

    res.json(uniqueTracks);
  } catch (error: any) {
    console.error("Spotify API error:", error.response?.data || error.message);
    if (error.response?.status === 401) {
      req.session.destroy(() => {});
      return res.status(401).json({ error: "Session expired" });
    }
    res.status(500).json({ error: "Failed to fetch tracks" });
  }
});

// Vite middleware
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
