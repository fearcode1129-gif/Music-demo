import { parseLrc } from '../utils/parseLrc';
import { formatDurationLabel } from '../utils/player';

const MUSIC_API_PREFIX = '/api/music';
const DEFAULT_GENRE = 'Pop';
const SEED_SEARCH_LIMIT = 6;
const SEED_RESULT_LIMIT = 24;
const DEFAULT_COVER =
  'data:image/svg+xml;utf8,' +
  encodeURIComponent(`
    <svg xmlns="http://www.w3.org/2000/svg" width="600" height="600" viewBox="0 0 600 600">
      <defs>
        <linearGradient id="g" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#18243d" />
          <stop offset="100%" stop-color="#f27a2c" />
        </linearGradient>
      </defs>
      <rect width="600" height="600" fill="url(#g)" />
      <circle cx="300" cy="300" r="150" fill="rgba(255,255,255,0.18)" />
      <circle cx="300" cy="300" r="38" fill="rgba(255,255,255,0.72)" />
      <text x="50%" y="83%" dominant-baseline="middle" text-anchor="middle"
        fill="white" font-family="Arial, sans-serif" font-size="40" font-weight="700">
        Music Player Demo
      </text>
    </svg>
  `);

const seedTerms = [
  '周杰伦',
  '林俊杰',
  '陈奕迅',
  '邓紫棋',
  '五月天',
  'Taylor Swift',
  'Coldplay',
  'Adele',
  'Ed Sheeran',
  'Bruno Mars'
];

const requestJson = async (path) => {
  const response = await fetch(`${MUSIC_API_PREFIX}${path}`);

  if (!response.ok) {
    throw new Error('Music API request failed.');
  }

  return response.json();
};

const extractArtistNames = (artists = []) =>
  (Array.isArray(artists) ? artists : [])
    .map((artist) => artist?.name)
    .filter(Boolean)
    .join(' / ');

const mapPlayback = (item = {}) => ({
  playable: item.playFlag !== false && item.visible !== false,
  trial: Boolean(item.freeTrailFlag && item.freeTrail?.end),
  trialInfo: item.freeTrail || null,
  trialDuration: Number(item.freeTrail?.end) || null,
  vip: Boolean(item.vipFlag || item.vipPlayFlag || item.payPlayFlag),
  visible: item.visible !== false,
  level: item.plLevel || item.level || null,
  qualities: Array.isArray(item.qualities) ? item.qualities : [],
  songFee: item.songFee ?? null
});

const mapSearchSong = (song = {}) => {
  const artists = Array.isArray(song.fullArtists) && song.fullArtists.length > 0 ? song.fullArtists : song.artists;
  const artistName = extractArtistNames(artists) || 'Unknown Artist';
  const albumName = song.album?.name || 'Unknown Album';

  return {
    id: String(song.id),
    title: song.name || 'Unknown Song',
    artist: artistName,
    album: albumName,
    genre: Array.isArray(song.songTag) && song.songTag.length > 0 ? song.songTag[0] : DEFAULT_GENRE,
    description: `${artistName} - ${albumName}`,
    duration: formatDurationLabel(song.duration),
    durationMs: Number(song.duration) || 0,
    year: null,
    cover: song.coverImgUrl || DEFAULT_COVER,
    audioUrl: '',
    source: 'netease-unofficial-api',
    playback: mapPlayback(song)
  };
};

const mapArtist = (artist = {}) => ({
  id: String(artist.id),
  artist: artist.name || 'Unknown Artist',
  cover: artist.coverImgUrl || DEFAULT_COVER,
  genre: artist.nationality || 'Artist',
  songs: [],
  musicSize: Number(artist.musicSize) || 0,
  briefDesc: artist.briefDesc || ''
});

const mapAlbum = (album = {}) => ({
  id: String(album.id),
  album: album.name || 'Unknown Album',
  artist: extractArtistNames(album.artists) || 'Unknown Artist',
  cover: album.coverImgUrl || DEFAULT_COVER,
  year: album.publishTime ? new Date(album.publishTime).getFullYear() : null,
  songs: [],
  genre: album.genre || DEFAULT_GENRE,
  description: album.briefDesc || album.description || ''
});

const mapDetailSong = (song = {}) => ({
  ...song,
  duration: song.durationLabel || song.duration || '00:00',
  cover: song.cover || DEFAULT_COVER
});

const mergeById = (items = []) => {
  const map = new Map();

  items.forEach((item) => {
    if (item?.id) {
      map.set(item.id, item);
    }
  });

  return Array.from(map.values());
};

export const fetchSongLyrics = async (songId) => {
  if (!songId) {
    return [];
  }

  const payload = await requestJson(`/song/${songId}/lyric`);
  return parseLrc(payload.data?.lyric || '');
};

export const fetchSongDetail = async (songId) => {
  if (!songId) {
    return null;
  }

  const payload = await requestJson(`/song/${songId}/detail`);
  return payload.data ? mapDetailSong(payload.data) : null;
};

export const resolvePlayableSong = async (song) => {
  if (!song?.id) {
    return null;
  }

  if (song.audioUrl) {
    return song;
  }

  return fetchSongDetail(song.id);
};

export const fetchSeedSongs = async () => {
  const groups = await Promise.all(
    seedTerms.map((keyword) =>
      searchSongs(keyword, {
        limit: SEED_SEARCH_LIMIT,
        offset: 0
      })
    )
  );

  const mergedSongs = mergeById(groups.flatMap((group) => group.songs)).slice(0, SEED_RESULT_LIMIT);
  const hydratedSongs = await Promise.all(
    mergedSongs.map(async (song) => {
      const detailedSong = await fetchSongDetail(song.id).catch(() => null);
      return detailedSong?.audioUrl ? detailedSong : null;
    })
  );

  return hydratedSongs.filter(Boolean);
};

export const searchSongs = async (keyword, options = {}) => {
  const normalizedKeyword = keyword.trim();
  const { limit = 30, offset = 0 } = options;

  if (!normalizedKeyword) {
    return { songs: [], total: 0 };
  }

  const payload = await requestJson(
    `/search/songs?keyword=${encodeURIComponent(normalizedKeyword)}&limit=${encodeURIComponent(limit)}&offset=${encodeURIComponent(offset)}`
  );
  const data = payload.data || {};
  const songs = (Array.isArray(data.records) ? data.records : []).map(mapSearchSong);

  return {
    songs,
    total: Number(data.recordCount) || songs.length,
    raw: data
  };
};

export const searchArtists = async (keyword, options = {}) => {
  const normalizedKeyword = keyword.trim();
  const { limit = 30, offset = 0 } = options;

  if (!normalizedKeyword) {
    return { artists: [], total: 0 };
  }

  const payload = await requestJson(
    `/search/artists?keyword=${encodeURIComponent(normalizedKeyword)}&limit=${encodeURIComponent(limit)}&offset=${encodeURIComponent(offset)}`
  );
  const data = payload.data || {};
  const artists = (Array.isArray(data.records) ? data.records : []).map(mapArtist);

  return {
    artists,
    total: Number(data.recordCount) || artists.length,
    raw: data
  };
};

export const searchAlbums = async (keyword, options = {}) => {
  const normalizedKeyword = keyword.trim();
  const { limit = 30, offset = 0 } = options;

  if (!normalizedKeyword) {
    return { albums: [], total: 0 };
  }

  const payload = await requestJson(
    `/search/albums?keyword=${encodeURIComponent(normalizedKeyword)}&limit=${encodeURIComponent(limit)}&offset=${encodeURIComponent(offset)}`
  );
  const data = payload.data || {};
  const albums = (Array.isArray(data.records) ? data.records : []).map(mapAlbum);

  return {
    albums,
    total: Number(data.recordCount) || albums.length,
    raw: data
  };
};

export const searchComplexResults = async (keyword, options = {}) => {
  const normalizedKeyword = keyword.trim();
  const { limit = 30, offset = 0 } = options;

  if (!normalizedKeyword) {
    return {
      songs: [],
      artists: [],
      albums: []
    };
  }

  const payload = await requestJson(
    `/search?keyword=${encodeURIComponent(normalizedKeyword)}&limit=${encodeURIComponent(limit)}&offset=${encodeURIComponent(offset)}`
  );
  const data = payload.data || {};

  return {
    songs: (Array.isArray(data.songs) ? data.songs : []).map(mapSearchSong),
    artists: (Array.isArray(data.artists) ? data.artists : []).map(mapArtist),
    albums: (Array.isArray(data.albums) ? data.albums : []).map(mapAlbum),
    raw: data
  };
};
