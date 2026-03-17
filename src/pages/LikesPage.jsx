import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { selectFavoriteSongIdsByUser, useLibraryStore } from '../store/libraryStore';
import { usePlayerStore } from '../store/playerStore';

const LikesPage = () => {
  const currentUser = useAuthStore((state) => state.currentUser);
  const songs = useLibraryStore((state) => state.songCatalog);
  const favoriteSongIds = useLibraryStore(selectFavoriteSongIdsByUser(currentUser?.id));
  const toggleFavorite = useLibraryStore((state) => state.toggleFavorite);
  const currentSongId = usePlayerStore((state) => state.currentSongId);
  const isPlaying = usePlayerStore((state) => state.isPlaying);
  const playSong = usePlayerStore((state) => state.playSong);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => setLoading(false), 400);
    return () => clearTimeout(timer);
  }, []);

  const likedSongs = useMemo(
    () => songs.filter((song) => favoriteSongIds.includes(song.id)),
    [favoriteSongIds, songs]
  );

  if (loading) {
    return (
      <div className="page-shell page-space">
        <div className="state-card">我的喜欢加载中...</div>
      </div>
    );
  }

  return (
    <section className="page-shell page-space">
      <div className="hero-card">
        <span className="eyebrow">My Favorites</span>
        <h1>我喜欢的音乐</h1>
      </div>

      {likedSongs.length === 0 ? (
        <div className="empty-card">
          你还没有收藏歌曲，先去 <Link to="/">歌曲列表</Link> 挑几首喜欢的吧。
        </div>
      ) : (
        <div className="song-grid">
          {likedSongs.map((song) => {
            const isCurrent = currentSongId === song.id;

            return (
              <article key={song.id} className="song-card">
                <img src={song.cover} alt={song.title} className="song-card__cover" />
                <div className="song-card__body">
                  <div>
                    <div className="song-card__title-row">
                      <h3>{song.title}</h3>
                      <button
                        type="button"
                        className="favorite-btn is-active"
                        onClick={() => toggleFavorite(currentUser?.id, song.id)}
                      >
                        ♥
                      </button>
                    </div>
                    <p>{song.artist} · {song.album}</p>
                  </div>

                  <div className="song-card__meta">
                    <span>{song.genre}</span>
                    <span>{song.duration}</span>
                  </div>

                  <div className="song-card__actions">
                    <button type="button" className="primary-btn" onClick={() => playSong(song, likedSongs)}>
                      {isCurrent && isPlaying ? '暂停播放' : '播放歌曲'}
                    </button>
                    <Link to={`/song/${song.id}`} className="secondary-btn link-btn">
                      查看详情
                    </Link>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
};

export default LikesPage;
