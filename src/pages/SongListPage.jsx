import React, { useDeferredValue, useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { selectFavoriteSongIdsByUser, useLibraryStore } from '../store/libraryStore';
import { usePlayerStore } from '../store/playerStore';
import { useSearchStore } from '../store/searchStore';
import { searchSongs } from '../services/musicApi';

const SEARCH_TABS = [
  { id: 'all', label: '全部' },
  { id: 'song', label: '歌曲' },
  { id: 'artist', label: '歌手' },
  { id: 'album', label: '专辑' }
];
const PAGE_SIZE = 9;

const getUniqueItems = (items, key) => {
  const map = new Map();

  items.forEach((item) => {
    const value = item?.[key];
    if (!value) {
      return;
    }

    if (!map.has(value)) {
      map.set(value, item);
    }
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

  const uniqueItems = Array.from(uniqueMap.values());
  const filtered = normalizedKeyword
    ? uniqueItems.filter((item) => item.value.toLowerCase().includes(normalizedKeyword))
    : uniqueItems;

  return filtered
    .sort((left, right) => {
      const leftStarts = left.value.toLowerCase().startsWith(normalizedKeyword) ? 1 : 0;
      const rightStarts = right.value.toLowerCase().startsWith(normalizedKeyword) ? 1 : 0;
      return rightStarts - leftStarts;
    })
    .slice(0, 10);
};

const highlightText = (text, keyword) => {
  if (!keyword.trim()) {
    return text;
  }

  const normalizedText = text.toLowerCase();
  const normalizedKeyword = keyword.trim().toLowerCase();
  const index = normalizedText.indexOf(normalizedKeyword);

  if (index === -1) {
    return text;
  }

  const start = text.slice(0, index);
  const match = text.slice(index, index + normalizedKeyword.length);
  const end = text.slice(index + normalizedKeyword.length);

  return (
    <>
      {start}
      <mark className="search-highlight">{match}</mark>
      {end}
    </>
  );
};

const filterSongsByIntent = (sourceSongs, keyword, intent, options = {}) => {
  const normalizedKeyword = keyword.trim().toLowerCase();
  const { exactAlbum, exactArtist } = options;

  if (!normalizedKeyword && !exactAlbum && !exactArtist) {
    return Array.isArray(sourceSongs) ? sourceSongs : [];
  }

  return (Array.isArray(sourceSongs) ? sourceSongs : []).filter((song) => {
    const title = (song.title || '').toLowerCase();
    const artist = (song.artist || '').toLowerCase();
    const album = (song.album || '').toLowerCase();
    const genre = (song.genre || '').toLowerCase();

    if (exactAlbum) {
      return album === exactAlbum.toLowerCase() && (!exactArtist || artist === exactArtist.toLowerCase());
    }

    if (exactArtist) {
      return artist === exactArtist.toLowerCase();
    }

    if (intent === 'artist') {
      return artist.includes(normalizedKeyword);
    }

    if (intent === 'album') {
      return album.includes(normalizedKeyword);
    }

    if (intent === 'song') {
      return title.includes(normalizedKeyword);
    }

    return [title, artist, album, genre].join(' ').includes(normalizedKeyword);
  });
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
  const [error, setError] = useState('');
  const [inputValue, setInputValue] = useState('');
  const [submittedKeyword, setSubmittedKeyword] = useState('');
  const [selectedGenre, setSelectedGenre] = useState('全部');
  const [activeTab, setActiveTab] = useState('all');
  const [searchIntent, setSearchIntent] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [isSearching, setIsSearching] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [activeSuggestionIndex, setActiveSuggestionIndex] = useState(-1);
  const [isComposing, setIsComposing] = useState(false);
  const deferredInputValue = useDeferredValue(inputValue);
  const deferredSubmittedKeyword = useDeferredValue(submittedKeyword);

  useEffect(() => {
    if (!submittedKeyword.trim()) {
      setDisplaySongs(Array.isArray(songs) ? songs : []);
      setError(catalogError);
    }
  }, [songs, catalogError, submittedKeyword]);

  useEffect(() => {
    setCurrentPage(1);
  }, [submittedKeyword, selectedGenre, activeTab, displaySongs]);

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

  const filteredSongs = useMemo(
    () => displaySongs.filter((song) => selectedGenre === '全部' || song.genre === selectedGenre),
    [displaySongs, selectedGenre]
  );

  const artistResults = useMemo(() => {
    const artistMap = new Map();

    filteredSongs.forEach((song) => {
      if (!artistMap.has(song.artist)) {
        artistMap.set(song.artist, {
          id: song.artist,
          artist: song.artist,
          cover: song.cover,
          genre: song.genre,
          songs: [song]
        });
      } else {
        artistMap.get(song.artist).songs.push(song);
      }
    });

    return Array.from(artistMap.values());
  }, [filteredSongs]);

  const albumResults = useMemo(() => {
    const albumMap = new Map();

    filteredSongs.forEach((song) => {
      const key = `${song.artist}-${song.album}`;
      if (!albumMap.has(key)) {
        albumMap.set(key, {
          id: key,
          album: song.album,
          artist: song.artist,
          cover: song.cover,
          year: song.year,
          songs: [song]
        });
      } else {
        albumMap.get(key).songs.push(song);
      }
    });

    return Array.from(albumMap.values());
  }, [filteredSongs]);

  const genres = useMemo(
    () => ['全部', ...new Set(displaySongs.map((song) => song.genre).filter(Boolean))],
    [displaySongs]
  );

  const searchSuggestions = useMemo(
    () => buildSuggestionItems(songs, searchHistory, deferredInputValue, activeTab),
    [songs, searchHistory, deferredInputValue, activeTab]
  );

  useEffect(() => {
    setActiveSuggestionIndex(searchSuggestions.length > 0 ? 0 : -1);
  }, [searchSuggestions]);

  const applyStructuredResults = (results, keyword, nextTab, nextIntent, options = {}) => {
    const filteredResults =
      nextIntent === 'all'
        ? results
        : filterSongsByIntent(results, keyword, nextIntent, options);

    setDisplaySongs(Array.isArray(filteredResults) ? filteredResults : []);
    setSubmittedKeyword(keyword);
    setActiveTab(nextTab);
    setSearchIntent(nextIntent);
    setSelectedGenre('全部');
    setError('');
  };

  const performSearch = async (rawKeyword, nextTab = activeTab, nextIntent = activeTab, options = {}) => {
    const keyword = rawKeyword.trim();
    const nextRequestId = requestIdRef.current + 1;
    requestIdRef.current = nextRequestId;
    setSelectedGenre('全部');

    if (!keyword && !options.exactAlbum && !options.exactArtist) {
      setSubmittedKeyword('');
      setSearchIntent('all');
      setDisplaySongs(Array.isArray(songs) ? songs : []);
      setError(catalogError);
      setIsSearching(false);
      return;
    }

    setSubmittedKeyword(keyword);
    setIsSearching(true);
    setError('');

    try {
      if (options.exactAlbum || options.exactArtist) {
        const structuredResults = filterSongsByIntent(songs, keyword, nextIntent, options);

        if (requestIdRef.current !== nextRequestId) {
          return;
        }

        applyStructuredResults(
          structuredResults,
          keyword || options.exactAlbum || options.exactArtist,
          nextTab,
          nextIntent,
          options
        );
        return;
      }

      const results = await searchSongs(keyword, songs);

      if (requestIdRef.current !== nextRequestId) {
        return;
      }

      registerSongsInCatalog(results);
      applyStructuredResults(results, keyword, nextTab, nextIntent);
      saveSearchKeyword(keyword);
    } catch (searchError) {
      if (requestIdRef.current !== nextRequestId) {
        return;
      }

      setError('搜索失败，请稍后再试。');
    } finally {
      if (requestIdRef.current === nextRequestId) {
        setIsSearching(false);
      }
    }
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    setShowSuggestions(false);
    setActiveSuggestionIndex(-1);
    performSearch(inputValue);
  };

  const handleSuggestionClick = (suggestion) => {
    setInputValue(suggestion.value);
    setShowSuggestions(false);
    setActiveSuggestionIndex(-1);
    const nextIntent = suggestion.type === 'history' ? searchIntent : suggestion.type;
    const nextTab = suggestion.type === 'history' ? activeTab : suggestion.type;
    performSearch(suggestion.value, nextTab, nextIntent);
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

  const handleTabClick = (tabId) => {
    setActiveTab(tabId);
  };

  const helperText = isSearching
    ? `正在搜索 "${submittedKeyword || inputValue}"...`
    : submittedKeyword
      ? `当前搜索：${submittedKeyword}`
      : '可搜索：歌曲名、歌手名、专辑名、风格';

  const pagedSongs = filteredSongs.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);
  const pagedArtists = artistResults.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);
  const pagedAlbums = albumResults.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  const renderSongCards = () => (
    <div className="song-grid">
      {pagedSongs.map((song) => {
        const isCurrent = currentSongId === song.id;
        const isFavorite = favoriteSongIds.includes(song.id);

        return (
          <article key={song.id} className="song-card">
            <img src={song.cover} alt={song.title} className="song-card__cover" />
            <div className="song-card__body">
              <div>
                <div className="song-card__title-row">
                  <h3>{highlightText(song.title, deferredSubmittedKeyword || deferredInputValue)}</h3>
                  <button
                    type="button"
                    className={`favorite-btn ${isFavorite ? 'is-active' : ''}`}
                    onClick={() => toggleFavorite(currentUser?.id, song.id)}
                  >
                    {isFavorite ? '♥' : '♡'}
                  </button>
                </div>
                <p>
                  {highlightText(song.artist, deferredSubmittedKeyword || deferredInputValue)} ·{' '}
                  {highlightText(song.album, deferredSubmittedKeyword || deferredInputValue)}
                </p>
              </div>

              <div className="song-card__meta">
                <span>{highlightText(song.genre, deferredSubmittedKeyword || deferredInputValue)}</span>
                <span>{song.duration}</span>
              </div>

              <div className="song-card__actions">
                <button type="button" className="primary-btn" onClick={() => playSong(song, filteredSongs)}>
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
            <h3>{highlightText(artist.artist, deferredSubmittedKeyword || deferredInputValue)}</h3>
            <p>{artist.songs.length} 首歌曲 · {artist.genre}</p>
            <button
              type="button"
              className="secondary-btn"
              onClick={() => {
                setInputValue(artist.artist);
                performSearch(artist.artist, 'song', 'artist', { exactArtist: artist.artist });
              }}
            >
              查看该歌手歌曲
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
            <h3>{highlightText(album.album, deferredSubmittedKeyword || deferredInputValue)}</h3>
            <p>
              {highlightText(album.artist, deferredSubmittedKeyword || deferredInputValue)} · {album.songs.length} 首 · {album.year}
            </p>
            <button
              type="button"
              className="secondary-btn"
              onClick={() => {
                setInputValue(album.album);
                performSearch(album.album, 'song', 'album', {
                  exactAlbum: album.album,
                  exactArtist: album.artist
                });
              }}
            >
              查看该专辑歌曲
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

    return filteredSongs.length > 0 ? renderSongCards() : <div className="empty-card">没有找到符合条件的歌曲，试试别的关键词。</div>;
  };

  const totalItems =
    activeTab === 'artist' ? artistResults.length : activeTab === 'album' ? albumResults.length : filteredSongs.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / PAGE_SIZE));
  const pageNumbers = Array.from({ length: totalPages }, (_, index) => index + 1);

  if (catalogLoading && !submittedKeyword.trim() && displaySongs.length === 0) {
    return (
      <div className="page-shell page-space">
        <div className="state-card">歌曲加载中...</div>
      </div>
    );
  }

  if (error && !isSearching && displaySongs.length === 0) {
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
              onClick={() => handleTabClick(tab.id)}
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
            <button
              type="button"
              className="search-box__clear"
              onClick={() => {
                setInputValue('');
                setSubmittedKeyword('');
                setSearchIntent('all');
                setActiveTab('all');
                setSelectedGenre('全部');
                setDisplaySongs(Array.isArray(songs) ? songs : []);
                setError(catalogError);
                setShowSuggestions(true);
              }}
            >
              ×
            </button>
          )}
        </form>

        <p className="search-helper">{helperText}</p>
        {error && displaySongs.length > 0 && <div className="message error compact-error">{error}</div>}

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

        <div className="toolbar-card__filters">
          {genres.map((genre) => (
            <button
              key={genre}
              type="button"
              className={`filter-chip ${selectedGenre === genre ? 'is-active' : ''}`}
              onClick={() => setSelectedGenre(genre)}
            >
              {genre}
            </button>
          ))}
        </div>
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
            {pageNumbers.map((pageNumber) => (
              <button
                key={pageNumber}
                type="button"
                className={`pagination__page ${currentPage === pageNumber ? 'is-active' : ''}`}
                onClick={() => setCurrentPage(pageNumber)}
              >
                {pageNumber}
              </button>
            ))}
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
