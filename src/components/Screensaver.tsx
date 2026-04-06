import React, { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Music, AlertCircle, Loader2 } from "lucide-react";

interface Track {
  id: string;
  name: string;
  artist: string;
  album: string;
  image: string;
}

interface ScreensaverProps {
  onExit: () => void;
}

export default function Screensaver({ onExit }: ScreensaverProps) {
  const [tracks, setTracks] = useState<Track[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isExiting, setIsExiting] = useState(false);

  const fetchTracks = useCallback(async () => {
    try {
      const response = await fetch("/api/spotify/tracks");
      if (!response.ok) {
        if (response.status === 401) {
          onExit(); // Session expired
          return;
        }
        throw new Error("Failed to fetch tracks");
      }
      const data = await response.json();
      if (data.length === 0) {
        setError("No tracks found in your library. Try listening to something on Spotify first!");
      } else {
        // Shuffle tracks
        setTracks(data.sort(() => Math.random() - 0.5));
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [onExit]);

  useEffect(() => {
    fetchTracks();
  }, [fetchTracks]);

  useEffect(() => {
    if (tracks.length === 0) return;

    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % tracks.length);
    }, 8000); // 8 seconds per album

    return () => clearInterval(interval);
  }, [tracks.length]);

  // Exit on interaction
  useEffect(() => {
    const handleInteraction = () => {
      if (isExiting) return;
      setIsExiting(true);
      onExit();
    };

    window.addEventListener("mousemove", handleInteraction);
    window.addEventListener("keydown", handleInteraction);
    window.addEventListener("mousedown", handleInteraction);

    return () => {
      window.removeEventListener("mousemove", handleInteraction);
      window.removeEventListener("keydown", handleInteraction);
      window.removeEventListener("mousedown", handleInteraction);
    };
  }, [onExit, isExiting]);

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
        <h2 className="text-2xl font-serif mb-2">Something went wrong</h2>
        <p className="text-white/60 max-w-md mb-8">{error}</p>
        <button
          onClick={onExit}
          className="px-6 py-2 border border-white/20 rounded-full hover:bg-white/10 transition-colors"
        >
          Go Back
        </button>
      </div>
    );
  }

  const currentTrack = tracks[currentIndex];

  return (
    <div className="fixed inset-0 bg-black overflow-hidden cursor-none">
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
              transition={{ duration: 10, ease: "linear" }}
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
                className="relative group"
              >
                <div className="absolute inset-0 bg-white/10 blur-3xl rounded-lg -z-10 opacity-50" />
                <img
                  src={currentTrack.image}
                  alt={currentTrack.album}
                  referrerPolicy="no-referrer"
                  className="w-[40vh] h-[40vh] md:w-[60vh] md:h-[60vh] object-cover rounded-lg shadow-2xl shadow-black/50"
                />
              </motion.div>

              {/* Track Info */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5, duration: 1 }}
                className="text-center space-y-2"
              >
                <h1 className="text-3xl md:text-5xl font-serif font-medium tracking-tight">
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

      {/* Exit Hint (Subtle) */}
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 text-white/10 text-xs uppercase tracking-widest pointer-events-none">
        Move mouse to exit
      </div>
    </div>
  );
}
