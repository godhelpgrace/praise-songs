'use client';

import { createContext, useContext, useState, useRef, useEffect } from 'react';

export type Song = {
  id: string;
  title: string;
  artist: string;
  cover?: string;
  src?: string;
  lrc?: string;
};

type PlayerContextType = {
  currentSong: Song | null;
  playlist: Song[];
  isPlaying: boolean;
  playSong: (song: Song) => void;
  addToPlaylist: (song: Song) => void;
  removeFromPlaylist: (id: string) => void;
  clearPlaylist: () => void;
  togglePlay: () => void;
  playNext: () => void;
  playPrev: () => void;
  seek: (time: number) => void;
  setVolume: (volume: number) => void; // 0-1
  volume: number;
  audioRef: React.RefObject<HTMLAudioElement | null>;
  currentTime: number;
  duration: number;
  playMode: 'sequence' | 'shuffle' | 'single';
  togglePlayMode: () => void;
  replacePlaylist: (songs: Song[]) => void;
};

const PlayerContext = createContext<PlayerContextType | undefined>(undefined);

export function PlayerProvider({ children }: { children: React.ReactNode }) {
  const [currentSong, setCurrentSong] = useState<Song | null>(null);
  const [playlist, setPlaylist] = useState<Song[]>([]);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolumeState] = useState(1);
  const [playMode, setPlayMode] = useState<'sequence' | 'shuffle' | 'single'>('sequence');
  const audioRef = useRef<HTMLAudioElement>(null);
  const [isPlayerWindow, setIsPlayerWindow] = useState(false);
  const [waitingForInteraction, setWaitingForInteraction] = useState(false);

  const handlePlayError = (e: any) => {
    if (e.name === 'NotAllowedError') {
      console.warn("Autoplay blocked by browser. User interaction required.");
      setWaitingForInteraction(true);
    } else {
      console.error("Playback failed:", e);
    }
    setIsPlaying(false);
  };

  // Global interaction listener to recover from Autoplay Policy
  useEffect(() => {
    if (!waitingForInteraction) return;

    const resumePlayback = () => {
      if (audioRef.current && currentSong) {
        // Attempt to play
        const playPromise = audioRef.current.play();
        if (playPromise !== undefined) {
           playPromise
             .then(() => {
                setIsPlaying(true);
                setWaitingForInteraction(false); // Success!
             })
             .catch(e => {
                // If still blocked, keep waiting
                console.warn("Resume failed, still waiting for interaction:", e);
             });
        }
      }
    };

    // Listen for any user interaction
    const events = ['click', 'keydown', 'touchstart'];
    const options = { once: true, capture: true }; // Capture phase to ensure we catch it early
    
    events.forEach(event => document.addEventListener(event, resumePlayback, options));

    return () => {
      events.forEach(event => document.removeEventListener(event, resumePlayback, options as any));
    };
  }, [waitingForInteraction, currentSong]);

  const playSong = (song: Song) => {
    setPlaylist(prev => {
      // Check if song exists in playlist
      const existingIndex = prev.findIndex(s => s.id === song.id);
      
      // If it exists, just return current playlist (we will play it by ID)
      // Or we can move it to end? No, usually we just play it.
      if (existingIndex !== -1) return prev;
      
      // If not, add to end
      return [...prev, song];
    });
    setCurrentSong(song);
    setIsPlaying(true);
  };

  const addToPlaylist = (song: Song) => {
    setPlaylist(prev => {
      if (prev.find(s => s.id === song.id)) return prev;
      return [...prev, song];
    });
  };

  const removeFromPlaylist = (id: string) => {
    setPlaylist(prev => prev.filter(s => s.id !== id));
  };

  const replacePlaylist = (songs: Song[]) => {
    setPlaylist(songs);
    if (songs.length > 0) {
      setCurrentSong(songs[0]);
      setIsPlaying(true);
    } else {
      setCurrentSong(null);
      setIsPlaying(false);
    }
  };

  const clearPlaylist = () => {
    setPlaylist([]);
    setCurrentSong(null);
    setIsPlaying(false);
  };

  const togglePlay = () => {
    if (isPlaying) {
      audioRef.current?.pause();
    } else {
      const playPromise = audioRef.current?.play();
      if (playPromise !== undefined) {
        playPromise.catch(handlePlayError);
      }
    }
    setIsPlaying(!isPlaying);
  };

  const togglePlayMode = () => {
    const modes: ('sequence' | 'shuffle' | 'single')[] = ['sequence', 'shuffle', 'single'];
    const nextIndex = (modes.indexOf(playMode) + 1) % modes.length;
    setPlayMode(modes[nextIndex]);
  };

  const playNext = () => {
    if (!currentSong || playlist.length === 0) return;
    
    if (playMode === 'single') {
      // Replay current song
      if (audioRef.current) {
        audioRef.current.currentTime = 0;
        const playPromise = audioRef.current.play();
        if (playPromise !== undefined) {
            playPromise.catch(handlePlayError);
        }
      }
      return;
    }

    if (playMode === 'shuffle') {
      const nextIndex = Math.floor(Math.random() * playlist.length);
      setCurrentSong(playlist[nextIndex]);
      setIsPlaying(true);
      return;
    }

    const currentIndex = playlist.findIndex(s => s.id === currentSong.id);
    const nextIndex = (currentIndex + 1) % playlist.length;
    setCurrentSong(playlist[nextIndex]);
    setIsPlaying(true);
  };

  const playPrev = () => {
    if (!currentSong || playlist.length === 0) return;

    if (playMode === 'single') {
      if (audioRef.current) {
        audioRef.current.currentTime = 0;
        const playPromise = audioRef.current.play();
        if (playPromise !== undefined) {
          playPromise.catch(handlePlayError);
        }
      }
      return;
    }

    if (playMode === 'shuffle') {
      const prevIndex = Math.floor(Math.random() * playlist.length);
      setCurrentSong(playlist[prevIndex]);
      setIsPlaying(true);
      return;
    }

    const currentIndex = playlist.findIndex(s => s.id === currentSong.id);
    const prevIndex = (currentIndex - 1 + playlist.length) % playlist.length;
    setCurrentSong(playlist[prevIndex]);
    setIsPlaying(true);
  };

  const seek = (time: number) => {
    if (audioRef.current) {
      audioRef.current.currentTime = time;
      setCurrentTime(time);
    }
  };

  const setVolume = (v: number) => {
    const newVolume = Math.max(0, Math.min(1, v));
    setVolumeState(newVolume);
    if (audioRef.current) {
      audioRef.current.volume = newVolume;
    }
  };

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    if (isPlaying) {
      // If we are supposed to be playing, but audio is paused, play it
      // Note: we don't just call play() blindly because it might be already playing (although we checked paused)
      // or it might be loading.
      if (audio.paused) {
          const playPromise = audio.play();
          if (playPromise !== undefined) {
            playPromise.catch(handlePlayError);
          }
      }
    } else {
      if (!audio.paused) {
        audio.pause();
      }
    }
  }, [currentSong, isPlaying]);

  // Initialize volume on load
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = volume;
    }
  }, []);

  const isPlayingRef = useRef(isPlaying);
  useEffect(() => {
    isPlayingRef.current = isPlaying;
  }, [isPlaying]);

  // Heartbeat for player status detection
  useEffect(() => {
    // Only run heartbeat if we are in the player window
    // We can detect this by checking if we are NOT the main window
    // But context is shared? No, PlayerContext is unique per window.
    // We need to know if THIS instance is the "Player Window".
    // The player window has a specific URL pattern /song/*
    const isPlayer = window.location.pathname.startsWith('/song/');
    setIsPlayerWindow(isPlayer);
    
    if (!isPlayer) return;

    const updateHeartbeat = () => {
      localStorage.setItem('music_player_active', 'true');
      localStorage.setItem('music_player_heartbeat', Date.now().toString());
    };

    // Initial update
    updateHeartbeat();

    // Update every 1 second
    const interval = setInterval(updateHeartbeat, 1000);

    // Cleanup on unmount
    return () => {
      clearInterval(interval);
      localStorage.setItem('music_player_active', 'false');
    };
  }, []);

  // BroadcastChannel for cross-tab communication
  useEffect(() => {
    const channel = new BroadcastChannel('music_player_channel');
    
    channel.onmessage = (event) => {
      const { type, song } = event.data;
      
      if (type === 'PING') {
        channel.postMessage({ type: 'PONG' });
      } else if (type === 'PLAY_SONG') {
        // Check if song is already in playlist
        setPlaylist(prev => {
          if (prev.find(s => s.id === song.id)) return prev;
          return [...prev, song];
        });
        
        // Requirement: 
        // 1. If first open (handled by client auto-play), play immediately.
        // 2. If subsequent add (window exists):
        //    - Append to playlist (done above)
        //    - Do NOT interrupt if playing
        //    - Play if nothing is playing (or paused?)
        
        setCurrentSong(prev => {
            // If no current song, or if player is paused, play the new song
            // "unless currently no song is playing" -> implies if player is idle/paused, we play.
            const shouldPlay = !prev || !isPlayingRef.current;
            
            if (shouldPlay) {
                setIsPlaying(true);
                return song;
            }
            // If playing, keep playing current song
            return prev;
        });
        
        // Focus window if possible (some browsers block this)
        window.focus();
      } else if (type === 'ADD_TO_QUEUE') {
         setPlaylist(prev => {
          if (prev.find(s => s.id === song.id)) return prev;
          return [...prev, song];
        });
        // If nothing is playing, play this one
        if (!currentSong) {
            setCurrentSong(song);
            setIsPlaying(true);
        }
      } else if (type === 'REPLACE_PLAYLIST') {
         const { songs } = event.data;
         if (songs && Array.isArray(songs)) {
            replacePlaylist(songs);
         }
      }
    };

    return () => {
      channel.close();
    };
  }, [currentSong]);

  return (
    <PlayerContext.Provider value={{ 
      currentSong, 
      playlist,
      isPlaying, 
      playSong, 
      addToPlaylist,
      removeFromPlaylist,
      clearPlaylist,
      togglePlay,
      playNext,
      playPrev,
      seek,
      setVolume,
      volume,
      audioRef,
      currentTime,
      duration,
      playMode,
      togglePlayMode,
      replacePlaylist
    }}>
      {children}
      {/* Only render audio element if we are in the player window */}
      {/* We check this via a state initialized in useEffect to match SSR */}
      {isPlayerWindow && (
        <audio
          ref={(element) => {
            (audioRef as any).current = element;
            if (element && isPlaying && element.paused) {
                const playPromise = element.play();
                if (playPromise !== undefined) {
                    playPromise.catch(handlePlayError);
                }
            }
          }}
          src={currentSong?.src || undefined}
          autoPlay={isPlaying}
          preload="auto"
          onTimeUpdate={(e) => setCurrentTime(e.currentTarget.currentTime)}
          onLoadedMetadata={(e) => setDuration(e.currentTarget.duration)}
          onEnded={playNext}
          onError={(e) => {
            console.error("Audio playback error:", e);
            setIsPlaying(false);
          }}
        />
      )}
    </PlayerContext.Provider>
  );
}

export function usePlayer() {
  const context = useContext(PlayerContext);
  if (context === undefined) {
    throw new Error('usePlayer must be used within a PlayerProvider');
  }
  return context;
}
