import React, { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Music, AlertCircle, Loader2, ChevronLeft, ChevronRight, Play, Pause, Maximize2, Minimize2, X } from "lucide-react";

interface Track {
  id: string;
  name: string;
  artist: string;
  album: string;
  image: string;
}

interface AuraPlayerProps {
  onClose: () => void;
  accessToken: string | null;
}

export default function AuraPlayer({ onClose, accessToken }: AuraPlayerProps) {
  const [tracks, setTracks] = useState<Track[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(!!document.fullscreenElement);

  const fetchTracks = useCallback(async () => {
    console.log("Fetching tracks from Spotify...");
    try {
      const headers: HeadersInit = {};
      if (accessToken) {
        headers["Authorization"] = `Bearer ${accessToken}`;
      }
      const response = await fetch("/api/spotify/tracks", { headers });
      if (!response.ok) {
        console.error("Fetch tracks failed with status:", response.status);
        if (response.status === 401) {
          setError("Your session has expired. Please sign out and sign in again.");
          return;
        }
        throw new Error(`Failed to fetch tracks (Status: ${response.status})`);
      }
      const data = await response.json();
      console.log("Fetched tracks count:", data.length);
      if (data.length === 0) {
        setError("No tracks found in your library. Try listening to something on Spotify first!");
      } else {
        setTracks(data.sort(() => Math.random() - 0.5));
      }
    } catch (err: any) {
      console.error("Fetch tracks error:", err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [onClose]);

  useEffect(() => {
    fetchTracks();
  }, [fetchTracks]);

  useEffect(() => {
    if (tracks.length === 0 || !isPlaying) return;

    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % tracks.length);
    }, 10000); // 10 seconds per album

    return () => clearInterval(interval);
  }, [tracks.length, isPlaying]);

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener("fullscreenchange", handleFullscreenChange);
    return () => document.removeEventListener("fullscreenchange", handleFullscreenChange);
  }, []);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
    } else {
      document.exitFullscreen().catch(() => {});
    }
  };

  const nextTrack = () => {
    setCurrentIndex((prev) => (prev + 1) % tracks.length);
  };

  const prevTrack = () => {
    setCurrentIndex((prev) => (prev - 1 + tracks.length) % tracks.length);
  };

  if (loading) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-black">
        <Loader2 className="w-12 h-12 text-white/20 animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="fixed inset-0 flex flex-col items-center justify-center bg-black p-8 text-center">
        <AlertCircle className="w-16 h-16 text-red-500/50 mb-4" />
        <h2 className="text-2xl font-serif mb-2 text-white">Something went wrong</h2>
        <p className="text-white/60 max-w-md mb-8">{error}</p>
        <div className="flex gap-4">
          <button
            onClick={() => {
              setLoading(true);
              setError(null);
              fetchTracks();
            }}
            className="px-6 py-2 bg-white text-black rounded-full hover:bg-white/90 transition-colors"
          >
            Try Again
          </button>
          <button
            onClick={onClose}
            className="px-6 py-2 border border-white/20 rounded-full hover:bg-white/10 transition-colors text-white"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  const currentTrack = tracks[currentIndex];

  return (
    <div className="fixed inset-0 bg-black overflow-hidden group">
      <AnimatePresence mode="wait">
        {currentTrack && (
          <motion.div
            key={currentTrack.id}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 2, ease: "easeInOut" }}
            className="relative w-full h-full flex items-center justify-center"
          >
            {/* Blurred Background */}
            <motion.div
              initial={{ scale: 1.1 }}
              animate={{ scale: 1.2 }}
              transition={{ duration: 15, ease: "linear" }}
              className="absolute inset-0 z-0"
              style={{
                backgroundImage: `url(${currentTrack.image})`,
                backgroundSize: "cover",
                backgroundPosition: "center",
                filter: "blur(80px) brightness(0.4)",
              }}
            />

            {/* Content Container */}
            <div className="relative z-10 flex flex-col items-center gap-8 max-w-[90vw]">
              {/* Album Art */}
              <motion.div
                initial={{ scale: 0.9, opacity: 0, y: 20 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                transition={{ duration: 1.5, ease: "easeOut" }}
                className="relative"
              >
                <div className="absolute inset-0 bg-white/10 blur-3xl rounded-lg -z-10 opacity-50" />
                <img
                  src={currentTrack.image}
                  alt={currentTrack.album}
                  referrerPolicy="no-referrer"
                  className="w-[40vh] h-[40vh] md:w-[55vh] md:h-[55vh] object-cover rounded-lg shadow-2xl shadow-black/50"
                />
              </motion.div>

              {/* Track Info */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5, duration: 1 }}
                className="text-center space-y-2"
              >
                <h1 className="text-3xl md:text-5xl font-serif font-medium tracking-tight text-white">
                  {currentTrack.name}
                </h1>
                <p className="text-xl md:text-2xl text-white/60 font-light">
                  {currentTrack.artist}
                </p>
                <p className="text-sm md:text-base text-white/30 uppercase tracking-[0.2em] font-medium pt-4">
                  {currentTrack.album}
                </p>
              </motion.div>
            </div>

            {/* Subtle Overlay */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-black/20 pointer-events-none" />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Controls Overlay */}
      <div className="absolute inset-0 z-20 flex flex-col justify-between p-8 opacity-0 group-hover:opacity-100 transition-opacity duration-500 bg-black/10">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center">
              <Music className="text-black w-5 h-5" />
            </div>
            <span className="text-lg font-serif italic tracking-tight text-white">Aura</span>
          </div>
          <div className="flex items-center gap-4">
            <button
              onClick={toggleFullscreen}
              className="p-2 text-white/60 hover:text-white transition-colors"
              title="Toggle Fullscreen"
            >
              {isFullscreen ? <Minimize2 className="w-6 h-6" /> : <Maximize2 className="w-6 h-6" />}
            </button>
            <button
              onClick={() => {
                console.log("Close button clicked in AuraPlayer");
                onClose();
              }}
              className="p-2 text-white/60 hover:text-white transition-colors"
              title="Close"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>

        <div className="flex justify-center items-center gap-12">
          <button
            onClick={prevTrack}
            className="p-4 text-white/40 hover:text-white transition-colors"
          >
            <ChevronLeft className="w-10 h-10" />
          </button>
          <button
            onClick={() => setIsPlaying(!isPlaying)}
            className="p-6 bg-white rounded-full text-black hover:scale-110 transition-transform"
          >
            {isPlaying ? <Pause className="w-8 h-8 fill-current" /> : <Play className="w-8 h-8 fill-current" />}
          </button>
          <button
            onClick={nextTrack}
            className="p-4 text-white/40 hover:text-white transition-colors"
          >
            <ChevronRight className="w-10 h-10" />
          </button>
        </div>

        <div className="flex justify-center">
          <div className="text-white/20 text-[10px] uppercase tracking-[0.3em] font-medium">
            {currentIndex + 1} / {tracks.length}
          </div>
        </div>
      </div>
    </div>
  );
}
