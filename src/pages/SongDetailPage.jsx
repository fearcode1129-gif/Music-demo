import React, { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import LyricsPanel from '../components/LyricsPanel';
import { fetchSongDetail, fetchSongLyrics } from '../services/musicApi';
import { useAuthStore } from '../store/authStore';
import { selectCommentsBySong, useCommentStore } from '../store/commentStore';
import { selectFavoriteSongIdsByUser, selectLyricsBySongId, useLibraryStore } from '../store/libraryStore';
import { usePlayerStore } from '../store/playerStore';

const SongDetailPage = () => {
  const { id } = useParams();
  const currentUser = useAuthStore((state) => state.currentUser);
  const songs = useLibraryStore((state) => state.songCatalog);
  const registerSongsInCatalog = useLibraryStore((state) => state.registerSongsInCatalog);
  const cacheLyrics = useLibraryStore((state) => state.cacheLyrics);
  const favoriteSongIds = useLibraryStore(selectFavoriteSongIdsByUser(currentUser?.id));
  const cachedLyrics = useLibraryStore(selectLyricsBySongId(id));
  const toggleFavorite = useLibraryStore((state) => state.toggleFavorite);
  const ensureSongComments = useCommentStore((state) => state.ensureSongComments);
  const addComment = useCommentStore((state) => state.addComment);
  const deleteComment = useCommentStore((state) => state.deleteComment);
  const comments = useCommentStore(selectCommentsBySong(id));
  const playSong = usePlayerStore((state) => state.playSong);
  const currentSongId = usePlayerStore((state) => state.currentSongId);
  const currentTime = usePlayerStore((state) => state.currentTime);

  const [newComment, setNewComment] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [lyricsLoading, setLyricsLoading] = useState(true);
  const [lyricsError, setLyricsError] = useState('');
  const [songLoading, setSongLoading] = useState(true);
  const [detailSong, setDetailSong] = useState(null);

  const catalogSong = useMemo(
    () => (Array.isArray(songs) ? songs.find((item) => item.id === id) : null),
    [id, songs]
  );

  const song = detailSong || catalogSong;

  useEffect(() => {
    let active = true;
    setSongLoading(true);
    setDetailSong(null);

    if (!id) {
      setSongLoading(false);
      return;
    }

    if (catalogSong) {
      setSongLoading(false);
      return;
    }

    fetchSongDetail(id)
      .then((nextSong) => {
        if (!active) {
          return;
        }

        if (nextSong) {
          registerSongsInCatalog([nextSong]);
          setDetailSong(nextSong);
        }
      })
      .catch(() => {
        if (active) {
          setDetailSong(null);
        }
      })
      .finally(() => {
        if (active) {
          setSongLoading(false);
        }
      });

    return () => {
      active = false;
    };
  }, [id, catalogSong, registerSongsInCatalog]);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError('');

    Promise.resolve()
      .then(() => {
        if (!id) {
          throw new Error('无效的歌曲编号。');
        }

        return ensureSongComments(id);
      })
      .catch((err) => {
        if (active) {
          setError(err?.message || '评论加载失败。');
        }
      })
      .finally(() => {
        if (active) {
          setLoading(false);
        }
      });

    return () => {
      active = false;
    };
  }, [ensureSongComments, id]);

  useEffect(() => {
    let active = true;
    setLyricsLoading(true);
    setLyricsError('');

    if (!id) {
      setLyricsLoading(false);
      return;
    }

    if (cachedLyrics.length > 0) {
      setLyricsLoading(false);
      return;
    }

    fetchSongLyrics(id)
      .then((nextLyrics) => {
        if (active) {
          cacheLyrics(id, nextLyrics);
        }
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
  }, [cacheLyrics, cachedLyrics.length, id]);

  const handleAddComment = async (event) => {
    event.preventDefault();

    if (!newComment.trim()) {
      setError('评论内容不能为空。');
      return;
    }

    setError('');
    setSubmitting(true);

    try {
      const comment = {
        id: `comment-${Date.now()}`,
        username: currentUser?.username || '匿名用户',
        content: newComment.trim(),
        createdAt: new Date().toLocaleString()
      };

      addComment(id, comment);
      setNewComment('');
    } catch (err) {
      setError(err?.message || '评论发布失败。');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteComment = async (commentId) => {
    setError('');
    setSubmitting(true);

    try {
      deleteComment(id, commentId);
    } catch (err) {
      setError(err?.message || '删除评论失败。');
    } finally {
      setSubmitting(false);
    }
  };

  if (songLoading) {
    return (
      <div className="page-shell page-space">
        <div className="state-card">歌曲详情加载中...</div>
      </div>
    );
  }

  if (!song) {
    return (
      <div className="page-shell page-space">
        <div className="state-card error">
          歌曲不存在，返回 <Link to="/">歌曲列表</Link> 继续浏览。
        </div>
      </div>
    );
  }

  const isFavorite = favoriteSongIds.includes(song.id);
  const isCurrentSong = currentSongId === song.id;

  return (
    <section className="page-shell page-space detail-layout">
      <div className="detail-card">
        <img src={song.cover} alt={song.title} className="detail-cover" />
        <div className="detail-content">
          <span className="eyebrow">{song.genre}</span>
          <div className="detail-content__top">
            <h1>{song.title}</h1>
            <button
              type="button"
              className={`favorite-btn detail-favorite ${isFavorite ? 'is-active' : ''}`}
              onClick={() => toggleFavorite(currentUser?.id, song.id)}
            >
              {isFavorite ? '已收藏' : '收藏'}
            </button>
          </div>
          <p className="detail-subtitle">
            {song.artist} · {song.album} · {song.duration} · {song.year}
          </p>
          <p>{song.description}</p>
          <p className="helper-text">歌词在下方展示。点击“立即播放”后，歌词会随当前播放进度自动高亮。</p>
          <button type="button" className="primary-btn" onClick={() => playSong(song, songs)}>
            立即播放
          </button>
        </div>
      </div>

      <LyricsPanel
        lyrics={cachedLyrics}
        currentTime={isCurrentSong ? currentTime : 0}
        isSyncEnabled={isCurrentSong}
        loading={lyricsLoading}
        error={lyricsError}
      />

      <div className="comment-card">
        <div className="comment-card__header">
          <h2>歌曲评论</h2>
          {loading && <span className="muted-text">评论加载中...</span>}
        </div>

        {error && <div className="message error">{error}</div>}

        <form className="comment-form" onSubmit={handleAddComment}>
          <textarea
            value={newComment}
            onChange={(event) => setNewComment(event.target.value)}
            placeholder="写下你对这首歌的感受..."
            rows={4}
          />
          <button type="submit" className="primary-btn" disabled={submitting}>
            {submitting ? '提交中...' : '添加评论'}
          </button>
        </form>

        <div className="comment-list">
          {comments.length > 0 ? (
            comments.map((comment) => (
              <article key={comment.id} className="comment-item">
                <div>
                  <strong>{comment.username}</strong>
                  <p>{comment.content}</p>
                  <span className="muted-text">{comment.createdAt}</span>
                </div>
                <button
                  type="button"
                  className="text-btn"
                  onClick={() => handleDeleteComment(comment.id)}
                  disabled={submitting}
                >
                  删除
                </button>
              </article>
            ))
          ) : (
            <div className="empty-card">还没有评论，留下第一条评论吧。</div>
          )}
        </div>
      </div>
    </section>
  );
};

export default SongDetailPage;
