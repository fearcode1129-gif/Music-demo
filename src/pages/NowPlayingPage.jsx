import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import LyricsPanel from '../components/LyricsPanel';
import PlayerControls from '../components/PlayerControls';
import VinylDisc from '../components/VinylDisc';
import { fetchSongLyrics } from '../services/musicApi';
import { selectLyricsBySongId, useLibraryStore } from '../store/libraryStore';
import { usePlayerStore } from '../store/playerStore';

const buildBackdropStyle = (cover) =>
  cover
    ? {
        backgroundImage: `linear-gradient(180deg, rgba(8, 12, 20, 0.32), rgba(8, 12, 20, 0.96)), url("${cover}")`
      }
    : undefined;

const NowPlayingPage = () => {
  const navigate = useNavigate();
  const songCatalog = useLibraryStore((state) => state.songCatalog);
  const cacheLyrics = useLibraryStore((state) => state.cacheLyrics);
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
  const requestSeek = usePlayerStore((state) => state.requestSeek);
  const playerError = usePlayerStore((state) => state.playerError);
  const clearPlayerError = usePlayerStore((state) => state.clearPlayerError);
  const lyrics = useLibraryStore(selectLyricsBySongId(currentSongId));

  const [lyricsLoading, setLyricsLoading] = useState(false);
  const [lyricsError, setLyricsError] = useState('');

  const currentSong = useMemo(
    () => songCatalog.find((song) => song.id === currentSongId) || null,
    [songCatalog, currentSongId]
  );

  useEffect(() => {
    let active = true;

    if (!currentSongId || lyrics.length > 0) {
      setLyricsLoading(false);
      setLyricsError('');
      return () => {
        active = false;
      };
    }

    setLyricsLoading(true);
    setLyricsError('');

    fetchSongLyrics(currentSongId)
      .then((nextLyrics) => {
        if (!active) {
          return;
        }

        cacheLyrics(currentSongId, nextLyrics);
      })
      .catch(() => {
        if (active) {
          setLyricsError('歌词加载失败，请稍后重试。');
        }
      })
      .finally(() => {
        if (active) {
          setLyricsLoading(false);
        }
      });

    return () => {
      active = false;
    };
  }, [cacheLyrics, currentSongId, lyrics.length]);

  return (
    <section className="now-playing" style={buildBackdropStyle(currentSong?.cover)}>
      <div className="now-playing__backdrop" />

      <div className="now-playing__content page-shell">
        <header className="now-playing__header">
          <button
            type="button"
            className="secondary-btn now-playing__back"
            onClick={() => {
              clearPlayerError();
              navigate(-1);
            }}
          >
            返回
          </button>

          <div className="now-playing__summary">
            <span className="eyebrow">Now Playing</span>
            <h1>{currentSong?.title || '暂无正在播放的歌曲'}</h1>
            <p>
              {currentSong?.artist || '请选择歌曲开始播放'}
              {currentSong?.album ? ` · ${currentSong.album}` : ''}
            </p>
          </div>
        </header>

        <div className="now-playing__layout">
          <div className="now-playing__vinyl-panel">
            <VinylDisc cover={currentSong?.cover} title={currentSong?.title} isPlaying={Boolean(currentSong) && isPlaying} />
          </div>

          <div className="now-playing__lyrics-panel">
            <LyricsPanel
              lyrics={lyrics}
              currentTime={currentTime}
              isSyncEnabled={Boolean(currentSong)}
              loading={lyricsLoading}
              error={lyricsError}
              variant="immersive"
            />
          </div>
        </div>

        <div className="now-playing__controls">
          <PlayerControls
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

          {playerError && <div className="message error player-error">{playerError}</div>}
        </div>
      </div>
    </section>
  );
};

export default NowPlayingPage;
