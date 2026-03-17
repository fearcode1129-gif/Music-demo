import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useLibraryStore } from '../store/libraryStore';
import { usePlayerStore } from '../store/playerStore';

const PLAY_MODE_LABELS = {
  'list-loop': '列表循环',
  'single-loop': '单曲循环',
  shuffle: '随机播放'
};

const formatTime = (timeInSeconds) => {
  if (!Number.isFinite(timeInSeconds) || timeInSeconds < 0) {
    return '00:00';
  }

  const minutes = Math.floor(timeInSeconds / 60);
  const seconds = Math.floor(timeInSeconds % 60);
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
};

const Player = () => {
  const audioRef = useRef(null);
  const songCatalog = useLibraryStore((state) => state.songCatalog);
  const currentSongId = usePlayerStore((state) => state.currentSongId);
  const isPlaying = usePlayerStore((state) => state.isPlaying);
  const playMode = usePlayerStore((state) => state.playMode);
  const volume = usePlayerStore((state) => state.volume);
  const togglePlay = usePlayerStore((state) => state.togglePlay);
  const playNext = usePlayerStore((state) => state.playNext);
  const playPrevious = usePlayerStore((state) => state.playPrevious);
  const cyclePlayMode = usePlayerStore((state) => state.cyclePlayMode);
  const setVolume = usePlayerStore((state) => state.setVolume);
  const handleSongEnd = usePlayerStore((state) => state.handleSongEnd);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);

  const currentSong = useMemo(
    () => songCatalog.find((song) => song.id === currentSongId) || songCatalog[0] || null,
    [currentSongId, songCatalog]
  );

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) {
      return undefined;
    }

    if (!currentSong?.audioUrl) {
      audio.pause();
      setProgress(0);
      setDuration(0);
      return undefined;
    }

    setProgress(0);
    audio.src = currentSong.audioUrl;
    audio.load();

    return undefined;
  }, [currentSong]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) {
      return undefined;
    }

    audio.volume = Math.max(0, Math.min(1, volume ?? 0.8));
    return undefined;
  }, [volume]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || !currentSong?.audioUrl) {
      return undefined;
    }

    if (isPlaying) {
      audio.play().catch(() => {
        togglePlay(false);
      });
    } else {
      audio.pause();
    }

    return undefined;
  }, [isPlaying, currentSong, togglePlay]);

  const handleTimeUpdate = () => {
    const audio = audioRef.current;
    if (!audio) {
      return;
    }
    setProgress(audio.currentTime || 0);
  };

  const handleLoadedMetadata = () => {
    const audio = audioRef.current;
    if (!audio) {
      return;
    }
    setDuration(audio.duration || 0);
  };

  const handleSeek = (event) => {
    const audio = audioRef.current;
    const nextTime = Number(event.target.value);
    if (!audio) {
      return;
    }
    audio.currentTime = nextTime;
    setProgress(nextTime);
  };

  const handleEnded = () => {
    const audio = audioRef.current;
    if (playMode === 'single-loop' && audio) {
      audio.currentTime = 0;
      audio.play().catch(() => {
        togglePlay(false);
      });
      return;
    }

    handleSongEnd();
  };

  return (
    <div className="player">
      <audio
        ref={audioRef}
        onTimeUpdate={handleTimeUpdate}
        onLoadedMetadata={handleLoadedMetadata}
        onEnded={handleEnded}
      />
      <div className="player__meta">
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
            <p>从歌曲列表中选择一首开始播放</p>
          </div>
        )}
      </div>

      <div className="player__controls">
        <div className="player__buttons">
          <button type="button" className="secondary-btn player-btn" onClick={playPrevious} disabled={!currentSong}>
            上一首
          </button>
          <button
            type="button"
            className="primary-btn player-btn"
            onClick={() => togglePlay(!isPlaying)}
            disabled={!currentSong}
          >
            {isPlaying ? '暂停' : '播放'}
          </button>
          <button type="button" className="secondary-btn player-btn" onClick={playNext} disabled={!currentSong}>
            下一首
          </button>
          <button type="button" className="secondary-btn player-btn" onClick={cyclePlayMode} disabled={!currentSong}>
            {PLAY_MODE_LABELS[playMode]}
          </button>
        </div>

        <div className="player__timeline">
          <span>{formatTime(progress)}</span>
          <input
            type="range"
            min="0"
            max={duration || 0}
            value={Math.min(progress, duration || 0)}
            onChange={handleSeek}
            disabled={!currentSong}
          />
          <span>{formatTime(duration)}</span>
        </div>

        <div className="player__volume">
          <span>音量</span>
          <input
            type="range"
            min="0"
            max="1"
            step="0.01"
            value={volume ?? 0.8}
            onChange={(event) => setVolume(event.target.value)}
          />
          <span>{Math.round((volume ?? 0.8) * 100)}%</span>
        </div>
      </div>
    </div>
  );
};

export default Player;
