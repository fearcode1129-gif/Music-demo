import React, { useMemo } from 'react';
import { Link, Navigate, useParams } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import {
  selectFavoriteSongIdsByUser,
  selectRecentHistoryByUser,
  useLibraryStore
} from '../store/libraryStore';
import { usePlayerStore } from '../store/playerStore';

const UserPage = () => {
  const { id } = useParams();
  const currentUser = useAuthStore((state) => state.currentUser);
  const isAuthenticated = Boolean(currentUser);
  const songs = useLibraryStore((state) => state.songCatalog);
  const history = useLibraryStore(selectRecentHistoryByUser(id));
  const favoriteSongIds = useLibraryStore(selectFavoriteSongIdsByUser(currentUser?.id));
  const toggleFavorite = useLibraryStore((state) => state.toggleFavorite);
  const playSong = usePlayerStore((state) => state.playSong);
  const favoriteSongs = useMemo(
    () => songs.filter((song) => favoriteSongIds.includes(song.id)).slice(0, 6),
    [favoriteSongIds, songs]
  );

  if (!isAuthenticated || !currentUser) {
    return <Navigate to="/login" replace />;
  }

  if (currentUser.id !== id) {
    return (
      <div className="page-shell page-space">
        <div className="state-card error">
          当前只允许查看自己的用户页，返回 <Link to="/">歌曲列表</Link>。
        </div>
      </div>
    );
  }

  return (
    <section className="page-shell page-space user-layout">
      <div className="profile-card">
        <img src={currentUser.avatar} alt={currentUser.username} className="profile-avatar" />
        <h1>{currentUser.username}</h1>
        <p>最近播放会在你点击播放歌曲时自动更新到本地缓存，收藏会同步展示在这里。</p>
      </div>

      <div className="history-card">
        <div className="comment-card__header">
          <h2>最近播放</h2>
          <span className="muted-text">共 {history.length} 条</span>
        </div>

        {history.length === 0 && (
          <div className="empty-card">你还没有播放记录，去歌曲列表挑一首开始吧。</div>
        )}

        <div className="history-list">
          {history.map((item) => {
            const song = songs.find((songItem) => songItem.id === item.songId);

            if (!song) {
              return null;
            }

            return (
              <article key={`${item.songId}-${item.playedAt}`} className="history-item">
                <img src={song.cover} alt={song.title} className="history-item__cover" />
                <div>
                  <strong>{song.title}</strong>
                  <p>{song.artist}</p>
                  <span className="muted-text">最近播放: {item.playedAt}</span>
                </div>
                <button type="button" className="secondary-btn" onClick={() => playSong(song, songs)}>
                  再听一次
                </button>
              </article>
            );
          })}
        </div>
      </div>

      <div className="history-card">
        <div className="comment-card__header">
          <h2>最近收藏</h2>
          <span className="muted-text">共 {favoriteSongIds.length} 首</span>
        </div>

        {favoriteSongs.length === 0 ? (
          <div className="empty-card">你还没有收藏歌曲，去列表页点点小爱心吧。</div>
        ) : (
          <div className="history-list">
            {favoriteSongs.map((song) => (
              <article key={song.id} className="history-item">
                <img src={song.cover} alt={song.title} className="history-item__cover" />
                <div>
                  <strong>{song.title}</strong>
                  <p>{song.artist}</p>
                  <span className="muted-text">{song.genre} · {song.album}</span>
                </div>
                <div className="history-item__actions">
                  <button type="button" className="secondary-btn" onClick={() => playSong(song, favoriteSongs)}>
                    播放
                  </button>
                  <button type="button" className="text-btn" onClick={() => toggleFavorite(currentUser?.id, song.id)}>
                    取消收藏
                  </button>
                </div>
              </article>
            ))}
          </div>
        )}
      </div>
    </section>
  );
};

export default UserPage;
