import React, { useDeferredValue, useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  resolvePlayableSong,
  searchAlbums,
  searchArtists,
  searchComplexResults,
  searchSongs
} from '../services/musicApi';
import { useAuthStore } from '../store/authStore';
import { selectFavoriteSongIdsByUser, useLibraryStore } from '../store/libraryStore';
import { usePlayerStore } from '../store/playerStore';
import { useSearchStore } from '../store/searchStore';

const SEARCH_TABS = [
  { id: 'all', label: '全部' },
  { id: 'song', label: '歌曲' },
  { id: 'artist', label: '歌手' },
  { id: 'album', label: '专辑' }
];

const PAGE_SIZE = 9;
const DEFAULT_GENRE = '全部';

const getUniqueItems = (items, key) => {
  const map = new Map();

  items.forEach((item) => {
    const value = item?.[key];
    if (!value || map.has(value)) {
      return;
    }

    map.set(value, item);
  });

  return Array.from(map.values());
};

const buildSuggestionItems = (songs, history, keyword, activeTab) => {
  const normalizedKeyword = keyword.trim().toLowerCase();
  const songSuggestions = getUniqueItems(songs, 'title').map((song) => ({
    id: `song-${song.id}`,
    value: song.title,
    type: 'song'
  }));
  const artistSuggestions = getUniqueItems(songs, 'artist').map((song) => ({
    id: `artist-${song.artist}`,
    value: song.artist,
    type: 'artist'
  }));
  const albumSuggestions = getUniqueItems(songs, 'album').map((song) => ({
    id: `album-${song.album}`,
    value: song.album,
    type: 'album'
  }));
  const historySuggestions = history.map((item) => ({
    id: `history-${item}`,
    value: item,
    type: 'history'
  }));

  let pool = [...historySuggestions, ...songSuggestions, ...artistSuggestions, ...albumSuggestions];

  if (activeTab !== 'all') {
    pool = pool.filter((item) => item.type === activeTab || item.type === 'history');
  }

  const uniqueMap = new Map();
  pool.forEach((item) => {
    const uniqueKey = `${item.type}-${item.value}`;
    if (!uniqueMap.has(uniqueKey)) {
      uniqueMap.set(uniqueKey, item);
    }
  });

  return Array.from(uniqueMap.values())
    .filter((item) => !normalizedKeyword || item.value.toLowerCase().includes(normalizedKeyword))
    .slice(0, 10);
};

const highlightText = (text, keyword) => {
  if (!keyword.trim()) {
    return text;
  }

  const rawText = String(text || '');
  const normalizedText = rawText.toLowerCase();
  const normalizedKeyword = keyword.trim().toLowerCase();
  const index = normalizedText.indexOf(normalizedKeyword);

  if (index === -1) {
    return rawText;
  }

  return (
    <>
      {rawText.slice(0, index)}
      <mark className="search-highlight">{rawText.slice(index, index + normalizedKeyword.length)}</mark>
      {rawText.slice(index + normalizedKeyword.length)}
    </>
  );
};

const buildCollapsedPages = (currentPage, totalPages) => {
  if (totalPages <= 7) {
    return Array.from({ length: totalPages }, (_, index) => index + 1);
  }

  const pages = new Set([1, totalPages, currentPage, currentPage - 1, currentPage + 1]);
  const filtered = Array.from(pages).filter((page) => page >= 1 && page <= totalPages).sort((a, b) => a - b);
  const collapsed = [];

  filtered.forEach((page, index) => {
    const previous = filtered[index - 1];
    if (typeof previous === 'number' && page - previous > 1) {
      collapsed.push('...');
    }
    collapsed.push(page);
  });

  return collapsed;
};

const SongListPage = () => {
  const containerRef = useRef(null);
  const requestIdRef = useRef(0);
  const currentUser = useAuthStore((state) => state.currentUser);
  const songs = useLibraryStore((state) => state.songCatalog);
  const catalogLoading = useLibraryStore((state) => state.catalogLoading);
  const catalogError = useLibraryStore((state) => state.catalogError);
  const registerSongsInCatalog = useLibraryStore((state) => state.registerSongsInCatalog);
  const favoriteSongIds = useLibraryStore(selectFavoriteSongIdsByUser(currentUser?.id));
  const toggleFavorite = useLibraryStore((state) => state.toggleFavorite);
  const searchHistory = useSearchStore((state) => state.searchHistory);
  const saveSearchKeyword = useSearchStore((state) => state.saveKeyword);
  const removeSearchKeyword = useSearchStore((state) => state.removeKeyword);
  const currentSongId = usePlayerStore((state) => state.currentSongId);
  const isPlaying = usePlayerStore((state) => state.isPlaying);
  const playSong = usePlayerStore((state) => state.playSong);

  const [displaySongs, setDisplaySongs] = useState([]);
  const [artistResults, setArtistResults] = useState([]);
  const [albumResults, setAlbumResults] = useState([]);
  const [error, setError] = useState('');
  const [inputValue, setInputValue] = useState('');
  const [submittedKeyword, setSubmittedKeyword] = useState('');
  const [selectedGenre, setSelectedGenre] = useState(DEFAULT_GENRE);
  const [activeTab, setActiveTab] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [searchTotal, setSearchTotal] = useState(0);
  const [isSearching, setIsSearching] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [activeSuggestionIndex, setActiveSuggestionIndex] = useState(-1);
  const [isComposing, setIsComposing] = useState(false);

  const deferredInputValue = useDeferredValue(inputValue);
  const deferredSubmittedKeyword = useDeferredValue(submittedKeyword);
  const keyword = submittedKeyword.trim();
  const searchKeyword = deferredSubmittedKeyword || deferredInputValue;
  const requestPage = activeTab === 'all' ? 1 : currentPage;

  useEffect(() => {
    if (!keyword) {
      const nextSongs = Array.isArray(songs) ? songs : [];
      setDisplaySongs(nextSongs);
      setArtistResults([]);
      setAlbumResults([]);
      setSearchTotal(nextSongs.length);
      setError(catalogError);
    }
  }, [songs, catalogError, keyword]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setShowSuggestions(false);
        setActiveSuggestionIndex(-1);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const searchSuggestions = useMemo(
    () => buildSuggestionItems(songs, searchHistory, deferredInputValue, activeTab),
    [songs, searchHistory, deferredInputValue, activeTab]
  );

  useEffect(() => {
    setActiveSuggestionIndex(searchSuggestions.length > 0 ? 0 : -1);
  }, [searchSuggestions]);

  useEffect(() => {
    if (!keyword) {
      return;
    }

    const requestId = requestIdRef.current + 1;
    requestIdRef.current = requestId;
    const offset = (requestPage - 1) * PAGE_SIZE;

    setIsSearching(true);
    setError('');

    const task =
      activeTab === 'artist'
        ? searchArtists(keyword, { limit: PAGE_SIZE, offset })
        : activeTab === 'album'
          ? searchAlbums(keyword, { limit: PAGE_SIZE, offset })
          : activeTab === 'all'
            ? searchComplexResults(keyword, { limit: 30, offset: 0 })
            : searchSongs(keyword, { limit: PAGE_SIZE, offset });

    task
      .then((result) => {
        if (requestIdRef.current !== requestId) {
          return;
        }

        if (Array.isArray(result.songs) && result.songs.length > 0) {
          registerSongsInCatalog(result.songs);
        }

        if (activeTab === 'artist') {
          setDisplaySongs([]);
          setArtistResults(result.artists || []);
          setAlbumResults([]);
          setSearchTotal(result.total || 0);
          return;
        }

        if (activeTab === 'album') {
          setDisplaySongs([]);
          setArtistResults([]);
          setAlbumResults(result.albums || []);
          setSearchTotal(result.total || 0);
          return;
        }

        if (activeTab === 'all') {
          setDisplaySongs(result.songs || []);
          setArtistResults(result.artists || []);
          setAlbumResults(result.albums || []);
          setSearchTotal(result.songs?.length || 0);
          return;
        }

        setDisplaySongs(result.songs || []);
        setArtistResults([]);
        setAlbumResults([]);
        setSearchTotal(result.total || 0);
      })
      .catch(() => {
        if (requestIdRef.current !== requestId) {
          return;
        }

        setDisplaySongs([]);
        setArtistResults([]);
        setAlbumResults([]);
        setSearchTotal(0);
        setError('搜索失败，请稍后重试。');
      })
      .finally(() => {
        if (requestIdRef.current === requestId) {
          setIsSearching(false);
        }
      });
  }, [keyword, requestPage, activeTab, registerSongsInCatalog]);

  const filteredSongs = useMemo(() => {
    const sourceSongs = Array.isArray(displaySongs) ? displaySongs : [];
    if (keyword || selectedGenre === DEFAULT_GENRE) {
      return sourceSongs;
    }

    return sourceSongs.filter((song) => song.genre === selectedGenre);
  }, [displaySongs, keyword, selectedGenre]);

  const genres = useMemo(
    () => [DEFAULT_GENRE, ...new Set(displaySongs.map((song) => song.genre).filter(Boolean))],
    [displaySongs]
  );

  const pagedSongs =
    keyword && activeTab !== 'all'
      ? filteredSongs
      : filteredSongs.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);
  const pagedArtists = artistResults;
  const pagedAlbums = albumResults;

  const totalItems =
    activeTab === 'artist'
      ? searchTotal
      : activeTab === 'album'
        ? searchTotal
        : keyword
          ? activeTab === 'all'
            ? filteredSongs.length
            : searchTotal
          : filteredSongs.length;

  const totalPages = Math.max(1, Math.ceil(totalItems / PAGE_SIZE));
  const collapsedPages = buildCollapsedPages(currentPage, totalPages);

  useEffect(() => {
    setCurrentPage((prev) => Math.min(prev, totalPages));
  }, [totalPages]);

  const resetToCatalog = () => {
    const nextSongs = Array.isArray(songs) ? songs : [];
    setInputValue('');
    setSubmittedKeyword('');
    setSelectedGenre(DEFAULT_GENRE);
    setActiveTab('all');
    setCurrentPage(1);
    setDisplaySongs(nextSongs);
    setArtistResults([]);
    setAlbumResults([]);
    setSearchTotal(nextSongs.length);
    setError(catalogError);
    setShowSuggestions(true);
    setIsSearching(false);
  };

  const performSearch = (rawKeyword, nextTab = 'all') => {
    const nextKeyword = rawKeyword.trim();

    if (!nextKeyword) {
      resetToCatalog();
      return;
    }

    setSubmittedKeyword(nextKeyword);
    setInputValue(nextKeyword);
    setSelectedGenre(DEFAULT_GENRE);
    setActiveTab(nextTab);
    setCurrentPage(1);
    setSearchTotal(0);
    setError('');
    saveSearchKeyword(nextKeyword);
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    setShowSuggestions(false);
    setActiveSuggestionIndex(-1);
    performSearch(inputValue, activeTab);
  };

  const handleSuggestionClick = (suggestion) => {
    setShowSuggestions(false);
    setActiveSuggestionIndex(-1);
    performSearch(suggestion.value, suggestion.type === 'history' ? activeTab : suggestion.type);
  };

  const handleDeleteHistory = (event, value) => {
    event.stopPropagation();
    removeSearchKeyword(value);
  };

  const handleInputKeyDown = (event) => {
    if (isComposing) {
      return;
    }

    if (event.key === 'Escape') {
      setShowSuggestions(false);
      setActiveSuggestionIndex(-1);
      return;
    }

    if (!showSuggestions || searchSuggestions.length === 0) {
      return;
    }

    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setActiveSuggestionIndex((prev) => (prev + 1) % searchSuggestions.length);
      return;
    }

    if (event.key === 'ArrowUp') {
      event.preventDefault();
      setActiveSuggestionIndex((prev) => (prev - 1 + searchSuggestions.length) % searchSuggestions.length);
      return;
    }

    if (event.key === 'Enter' && activeSuggestionIndex >= 0) {
      event.preventDefault();
      handleSuggestionClick(searchSuggestions[activeSuggestionIndex]);
    }
  };

  const handlePlaySong = async (song, queueSource) => {
    const playableSong = await resolvePlayableSong(song);

    if (!playableSong?.audioUrl) {
      setError('当前歌曲暂无可用播放地址。');
      return;
    }

    registerSongsInCatalog([playableSong]);
    playSong(playableSong, queueSource);
  };

  const helperText = isSearching
    ? `正在搜索“${keyword || inputValue}”...`
    : keyword
      ? `搜索词：${keyword}`
      : '可搜索：歌曲名、歌手名、专辑名、风格';

  const renderSongCards = () => (
    <div className="song-grid">
      {pagedSongs.map((song) => {
        const isCurrent = currentSongId === song.id;
        const isFavorite = favoriteSongIds.includes(song.id);
        const playbackLabel = song.playback?.trial
          ? `试听 ${song.playback.trialDuration || 0}s`
          : song.playback?.playable
            ? '完整播放'
            : '不可播放';

        return (
          <article key={song.id} className="song-card">
            <img src={song.cover} alt={song.title} className="song-card__cover" />
            <div className="song-card__body">
              <div>
                <div className="song-card__title-row">
                  <h3>{highlightText(song.title, searchKeyword)}</h3>
                  <button
                    type="button"
                    className={`favorite-btn ${isFavorite ? 'is-active' : ''}`}
                    onClick={() => toggleFavorite(currentUser?.id, song.id)}
                  >
                    {isFavorite ? '♥' : '♡'}
                  </button>
                </div>
                <p>
                  {highlightText(song.artist, searchKeyword)} · {highlightText(song.album, searchKeyword)}
                </p>
              </div>

              <div className="song-card__meta">
                <span>{highlightText(song.genre, searchKeyword)}</span>
                <span>{song.duration}</span>
              </div>
              <div className="song-card__meta">
                <span>{playbackLabel}</span>
                {song.playback?.level && <span>{song.playback.level}</span>}
              </div>

              <div className="song-card__actions">
                <button
                  type="button"
                  className="primary-btn"
                  onClick={() => handlePlaySong(song, filteredSongs)}
                  disabled={!song.playback?.playable}
                >
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
  );

  const renderArtistCards = () => (
    <div className="entity-grid">
      {pagedArtists.map((artist) => (
        <article key={artist.id} className="entity-card">
          <img src={artist.cover} alt={artist.artist} className="entity-card__cover" />
          <div className="entity-card__body">
            <h3>{highlightText(artist.artist, searchKeyword)}</h3>
            <p>{artist.musicSize} 首歌曲 · {artist.genre}</p>
            <button type="button" className="secondary-btn" onClick={() => performSearch(artist.artist, 'song')}>
              搜索该歌手歌曲
            </button>
          </div>
        </article>
      ))}
    </div>
  );

  const renderAlbumCards = () => (
    <div className="entity-grid">
      {pagedAlbums.map((album) => (
        <article key={album.id} className="entity-card">
          <img src={album.cover} alt={album.album} className="entity-card__cover" />
          <div className="entity-card__body">
            <h3>{highlightText(album.album, searchKeyword)}</h3>
            <p>
              {highlightText(album.artist, searchKeyword)} · {album.year || '未知年份'}
            </p>
            <button
              type="button"
              className="secondary-btn"
              onClick={() => performSearch(`${album.artist} ${album.album}`, 'song')}
            >
              搜索该专辑歌曲
            </button>
          </div>
        </article>
      ))}
    </div>
  );

  const renderContent = () => {
    if (activeTab === 'artist') {
      return artistResults.length > 0 ? renderArtistCards() : <div className="empty-card">没有匹配的歌手结果。</div>;
    }

    if (activeTab === 'album') {
      return albumResults.length > 0 ? renderAlbumCards() : <div className="empty-card">没有匹配的专辑结果。</div>;
    }

    return filteredSongs.length > 0 ? renderSongCards() : <div className="empty-card">没有找到符合条件的歌曲。</div>;
  };

  if (catalogLoading && !keyword && displaySongs.length === 0) {
    return (
      <div className="page-shell page-space">
        <div className="state-card">歌曲加载中...</div>
      </div>
    );
  }

  if (error && !isSearching && displaySongs.length === 0 && artistResults.length === 0 && albumResults.length === 0) {
    return (
      <div className="page-shell page-space">
        <div className="state-card error">{error}</div>
      </div>
    );
  }

  return (
    <section className="page-shell page-space" ref={containerRef}>
      <div className="hero-card">
        <span className="eyebrow">Featured Playlist</span>
        <h1>发现今天适合循环播放的歌曲</h1>
      </div>

      <div className="toolbar-card">
        <div className="search-tabs" role="tablist" aria-label="搜索类型">
          {SEARCH_TABS.map((tab) => (
            <button
              key={tab.id}
              type="button"
              className={`search-tab ${activeTab === tab.id ? 'is-active' : ''}`}
              onClick={() => {
                setActiveTab(tab.id);
                setCurrentPage(1);
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <form className="toolbar-card__search search-box" onSubmit={handleSubmit}>
          <span className="search-box__icon">⌕</span>
          <input
            value={inputValue}
            onChange={(event) => setInputValue(event.target.value)}
            onFocus={() => setShowSuggestions(true)}
            onKeyDown={handleInputKeyDown}
            onCompositionStart={() => setIsComposing(true)}
            onCompositionEnd={() => setIsComposing(false)}
            placeholder="搜索歌曲、歌手、专辑、风格"
            aria-expanded={showSuggestions}
            aria-autocomplete="list"
          />
          {inputValue && (
            <button type="button" className="search-box__clear" onClick={resetToCatalog}>
              ×
            </button>
          )}
        </form>

        <p className="search-helper">{helperText}</p>
        {keyword && (
          <div className="results-summary">
            <strong>共 {totalItems} 项</strong>
            <span>第 {currentPage} / {totalPages} 页</span>
          </div>
        )}
        {error && (displaySongs.length > 0 || artistResults.length > 0 || albumResults.length > 0) && (
          <div className="message error compact-error">{error}</div>
        )}

        {showSuggestions && searchSuggestions.length > 0 && (
          <div className="search-dropdown">
            {searchSuggestions.map((item, index) => (
              <div
                key={item.id}
                className={`search-dropdown__item ${index === activeSuggestionIndex ? 'is-active' : ''}`}
              >
                <button
                  type="button"
                  className="search-dropdown__action"
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={() => handleSuggestionClick(item)}
                >
                  <span className="search-dropdown__icon">⌕</span>
                  <span className="search-dropdown__content">
                    {highlightText(item.value, deferredInputValue)}
                    {item.type !== 'history' && (
                      <small>{item.type === 'song' ? '歌曲' : item.type === 'artist' ? '歌手' : '专辑'}</small>
                    )}
                  </span>
                </button>
                {item.type === 'history' && (
                  <button
                    type="button"
                    className="search-history-delete"
                    onClick={(event) => handleDeleteHistory(event, item.value)}
                  >
                    删除
                  </button>
                )}
              </div>
            ))}
          </div>
        )}

        {(activeTab === 'all' || activeTab === 'song') && !keyword && (
          <div className="toolbar-card__filters">
            {genres.map((genre) => (
              <button
                key={genre}
                type="button"
                className={`filter-chip ${selectedGenre === genre ? 'is-active' : ''}`}
                onClick={() => {
                  setSelectedGenre(genre);
                  setCurrentPage(1);
                }}
              >
                {genre}
              </button>
            ))}
          </div>
        )}
      </div>

      {renderContent()}

      {totalItems > PAGE_SIZE && (
        <div className="pagination">
          <button
            type="button"
            className="secondary-btn"
            onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
            disabled={currentPage === 1}
          >
            上一页
          </button>
          <div className="pagination__pages">
            {collapsedPages.map((pageToken, index) =>
              pageToken === '...' ? (
                <span key={`ellipsis-${index}`} className="pagination__ellipsis">
                  ...
                </span>
              ) : (
                <button
                  key={pageToken}
                  type="button"
                  className={`pagination__page ${currentPage === pageToken ? 'is-active' : ''}`}
                  onClick={() => setCurrentPage(pageToken)}
                >
                  {pageToken}
                </button>
              )
            )}
          </div>
          <button
            type="button"
            className="secondary-btn"
            onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
            disabled={currentPage === totalPages}
          >
            下一页
          </button>
        </div>
      )}
    </section>
  );
};

export default SongListPage;
