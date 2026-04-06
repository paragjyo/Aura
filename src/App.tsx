import React, { useState, useEffect } from "react";
import { Music, Play, LogOut, Maximize2, Github } from "lucide-react";
import Screensaver from "./components/Screensaver";

export default function App() {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [isScreensaverActive, setIsScreensaverActive] = useState(false);

  useEffect(() => {
    checkAuth();

    const handleMessage = (event: MessageEvent) => {
      if (event.data?.type === "OAUTH_AUTH_SUCCESS") {
        setIsAuthenticated(true);
      }
    };
    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, []);

  const checkAuth = async () => {
    try {
      const response = await fetch("/api/auth/status");
      const data = await response.json();
      setIsAuthenticated(data.authenticated);
    } catch (err) {
      setIsAuthenticated(false);
    }
  };

  const handleLogin = async () => {
    try {
      const response = await fetch("/api/auth/url");
      const { url } = await response.json();
      window.open(url, "spotify_auth", "width=600,height=800");
    } catch (err) {
      console.error("Failed to get auth URL", err);
    }
  };

  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    setIsAuthenticated(false);
  };

  const startScreensaver = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch((err) => {
        console.warn(`Error attempting to enable full-screen mode: ${err.message}`);
      });
    }
    setIsScreensaverActive(true);
  };

  const stopScreensaver = () => {
    if (document.fullscreenElement) {
      document.exitFullscreen().catch(() => {});
    }
    setIsScreensaverActive(false);
  };

  if (isScreensaverActive) {
    return <Screensaver onExit={stopScreensaver} />;
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white font-sans selection:bg-white/20 selection:text-white">
      {/* Background Atmosphere */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-500/10 rounded-full blur-[120px]" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-purple-500/10 rounded-full blur-[120px]" />
      </div>

      <main className="relative z-10 max-w-5xl mx-auto px-6 py-20 min-h-screen flex flex-col">
        <header className="flex justify-between items-center mb-24">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center">
              <Music className="text-black w-6 h-6" />
            </div>
            <span className="text-xl font-serif italic tracking-tight">Aura</span>
          </div>
          {isAuthenticated && (
            <button
              onClick={handleLogout}
              className="text-sm text-white/40 hover:text-white transition-colors flex items-center gap-2"
            >
              <LogOut className="w-4 h-4" />
              Sign Out
            </button>
          )}
        </header>

        <div className="flex-1 flex flex-col justify-center items-center text-center">
          <h1 className="text-6xl md:text-8xl font-serif font-medium tracking-tighter mb-8 leading-[0.9]">
            Your Music,<br />
            <span className="italic opacity-50">Atmospherically.</span>
          </h1>
          
          <p className="text-lg md:text-xl text-white/40 max-w-xl mb-12 font-light leading-relaxed">
            A minimal, animated screensaver that transforms your Spotify library into a cinematic visual experience.
          </p>

          {isAuthenticated === null ? (
            <div className="animate-pulse text-white/20 uppercase tracking-widest text-xs">Loading...</div>
          ) : isAuthenticated ? (
            <div className="flex flex-col items-center gap-6">
              <button
                onClick={startScreensaver}
                className="group relative px-12 py-5 bg-white text-black rounded-full font-medium text-lg overflow-hidden transition-all hover:scale-105 active:scale-95"
              >
                <div className="absolute inset-0 bg-gradient-to-r from-blue-400 to-purple-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                <span className="relative z-10 flex items-center gap-3">
                  <Play className="w-5 h-5 fill-current" />
                  Launch Screensaver
                </span>
              </button>
              <p className="text-xs text-white/20 uppercase tracking-widest flex items-center gap-2">
                <Maximize2 className="w-3 h-3" />
                Fullscreen recommended
              </p>
            </div>
          ) : (
            <button
              onClick={handleLogin}
              className="px-10 py-4 border border-white/20 rounded-full hover:bg-white hover:text-black transition-all duration-500 flex items-center gap-3 text-lg"
            >
              <Music className="w-5 h-5" />
              Connect with Spotify
            </button>
          )}
        </div>

        <footer className="mt-24 pt-8 border-t border-white/5 flex flex-col md:flex-row justify-between items-center gap-6 text-white/20 text-xs uppercase tracking-widest">
          <div className="flex items-center gap-6">
            <span>© 2026 Aura Visuals</span>
            <span>Inspired by macOS</span>
          </div>
          <div className="flex items-center gap-6">
            <a href="#" className="hover:text-white transition-colors">Privacy</a>
            <a href="#" className="hover:text-white transition-colors">Terms</a>
            <a href="https://github.com" className="hover:text-white transition-colors flex items-center gap-1">
              <Github className="w-3 h-3" />
              Source
            </a>
          </div>
        </footer>
      </main>
    </div>
  );
}
