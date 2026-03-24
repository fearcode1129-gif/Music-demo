import React, { useEffect, useMemo, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useLibraryStore } from '../store/libraryStore';
import { usePlayerStore } from '../store/playerStore';
import PlayerControls from './PlayerControls';

const Player = () => {
  const audioRef = useRef(null);
  const navigate = useNavigate();
  const location = useLocation();
  const songCatalog = useLibraryStore((state) => state.songCatalog);
  const currentSongId = usePlayerStore((state) => state.currentSongId);
  const isPlaying = usePlayerStore((state) => state.isPlaying);
  const playMode = usePlayerStore((state) => state.playMode);
  const volume = usePlayerStore((state) => state.volume);
  const currentTime = usePlayerStore((state) => state.currentTime);
  const duration = usePlayerStore((state) => state.duration);
  const togglePlay = usePlayerStore((state) => state.togglePlay);
  const playNext = usePlayerStore((state) => state.playNext);
  const playPrevious = usePlayerStore((state) => state.playPrevious);
  const cyclePlayMode = usePlayerStore((state) => state.cyclePlayMode);
  const setVolume = usePlayerStore((state) => state.setVolume);
  const setPlaybackProgress = usePlayerStore((state) => state.setPlaybackProgress);
  const handleSongEnd = usePlayerStore((state) => state.handleSongEnd);
  const seekTarget = usePlayerStore((state) => state.seekTarget);
  const requestSeek = usePlayerStore((state) => state.requestSeek);
  const clearSeekTarget = usePlayerStore((state) => state.clearSeekTarget);
  const playerError = usePlayerStore((state) => state.playerError);
  const setPlayerError = usePlayerStore((state) => state.setPlayerError);
  const clearPlayerError = usePlayerStore((state) => state.clearPlayerError);
  const isImmersiveRoute = location.pathname === '/player';

  const currentSong = useMemo(
    () => songCatalog.find((song) => song.id === currentSongId) || null,
    [currentSongId, songCatalog]
  );
  const currentAudioUrl = currentSong?.audioUrl || '';

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) {
      return;
    }

    if (!currentSongId || !currentAudioUrl) {
      audio.pause();
      return;
    }

    if (audio.src === currentAudioUrl) {
      return;
    }

    audio.src = currentAudioUrl;
    audio.load();
    setPlaybackProgress(0, 0);
  }, [currentSongId, currentAudioUrl, setPlaybackProgress]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) {
      return;
    }

    audio.volume = Math.max(0, Math.min(1, volume ?? 0.8));
  }, [volume]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || !currentAudioUrl) {
      return;
    }

    if (isPlaying) {
      audio.play().catch(() => {
        togglePlay(false);
        setPlayerError('浏览器阻止了自动播放，请手动点击播放。');
      });
      return;
    }

    audio.pause();
  }, [isPlaying, currentAudioUrl, togglePlay, setPlayerError]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || !currentAudioUrl || seekTarget === null) {
      return;
    }

    audio.currentTime = seekTarget;
    setPlaybackProgress(seekTarget, audio.duration || duration || 0);
    clearSeekTarget();
  }, [seekTarget, currentAudioUrl, setPlaybackProgress, clearSeekTarget, duration]);

  const handleTimeUpdate = () => {
    const audio = audioRef.current;
    if (!audio) {
      return;
    }

    setPlaybackProgress(audio.currentTime || 0, audio.duration || 0);
  };

  const handleLoadedMetadata = () => {
    const audio = audioRef.current;
    if (!audio) {
      return;
    }

    setPlaybackProgress(audio.currentTime || 0, audio.duration || 0);
  };

  const handleEnded = () => {
    const audio = audioRef.current;
    if (playMode === 'single-loop' && audio) {
      audio.currentTime = 0;
      setPlaybackProgress(0, audio.duration || 0);
      audio.play().catch(() => {
        togglePlay(false);
      });
      return;
    }

    handleSongEnd();
  };

  return (
    <div className={`player ${isImmersiveRoute ? 'player--immersive-hidden' : ''}`}>
      <audio
        ref={audioRef}
        onTimeUpdate={handleTimeUpdate}
        onLoadedMetadata={handleLoadedMetadata}
        onEnded={handleEnded}
      />

      {!isImmersiveRoute && (
        <>
          <button
            type="button"
            className="player__meta"
            onClick={() => {
              if (currentSong) {
                clearPlayerError();
                navigate('/player');
              }
            }}
            disabled={!currentSong}
          >
            {currentSong ? (
              <>
                <img src={currentSong.cover} alt={currentSong.title} className="player__cover" />
                <div>
                  <strong>{currentSong.title}</strong>
                  <p>{currentSong.artist}</p>
                </div>
              </>
            ) : (
              <div>
                <strong>还没有正在播放的歌曲</strong>
                <p>从列表中选择一首歌曲开始播放</p>
              </div>
            )}
          </button>

          <PlayerControls
            compact
            isPlaying={isPlaying}
            currentTime={currentTime}
            duration={duration}
            volume={volume}
            playMode={playMode}
            disabled={!currentSong}
            onTogglePlay={() => togglePlay(!isPlaying)}
            onPrevious={playPrevious}
            onNext={playNext}
            onCyclePlayMode={cyclePlayMode}
            onSeek={requestSeek}
            onVolumeChange={setVolume}
          />

          {playerError && <div className="player__error">{playerError}</div>}
        </>
      )}
    </div>
  );
};

export default Player;
