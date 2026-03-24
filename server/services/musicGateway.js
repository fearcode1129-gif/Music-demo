const { config } = require('../config');

const createAppError = (status, code, message) => {
  const error = new Error(message);
  error.status = status;
  error.code = code;
  return error;
};

const requestUnofficialApi = async (apiPath, query = {}) => {
  const params = new URLSearchParams();

  Object.entries(query).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      params.set(key, String(value));
    }
  });

  const response = await fetch(`${config.unofficialApiBaseUrl}${apiPath}?${params.toString()}`);
  const payload = await response.json().catch(() => null);

  if (!response.ok) {
    throw createAppError(response.status, 'UNOFFICIAL_API_HTTP_ERROR', 'Music API request failed.');
  }

  if (!payload) {
    throw createAppError(502, 'UNOFFICIAL_API_RESPONSE_ERROR', 'Music API returned invalid data.');
  }

  return payload;
};

const ensureMusicApiReady = async () => {
  await requestUnofficialApi('/banner', { type: 0 });
  return true;
};

const formatDuration = (durationMs) => {
  if (!Number.isFinite(durationMs) || durationMs <= 0) {
    return '00:00';
  }

  const minutes = Math.floor(durationMs / 60000);
  const seconds = Math.floor((durationMs % 60000) / 1000);
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
};

const mapSearchSongRecord = (song = {}) => ({
  id: String(song.id),
  name: song.name || 'Unknown Song',
  duration: Number(song.dt) || 0,
  artists: Array.isArray(song.ar) ? song.ar.map((artist) => ({ id: String(artist.id), name: artist.name })) : [],
  fullArtists: Array.isArray(song.ar) ? song.ar.map((artist) => ({ id: String(artist.id), name: artist.name })) : [],
  album: {
    id: String(song.al?.id || ''),
    name: song.al?.name || 'Unknown Album'
  },
  playFlag: song.privilege?.st !== -200,
  downloadFlag: true,
  payPlayFlag: song.fee === 1,
  payDownloadFlag: false,
  vipFlag: song.fee === 1,
  vipPlayFlag: song.fee === 1,
  liked: false,
  coverImgUrl: song.al?.picUrl || '',
  songMaxBr: 0,
  userMaxBr: 0,
  maxBrLevel: null,
  plLevel: null,
  dlLevel: null,
  songTag: [],
  alg: song.alg || '',
  songFee: song.fee ?? 0,
  qualities: null,
  originCoverType: 0,
  visible: song.privilege?.st !== -200
});

const mapSongDetailToClient = (detail) => {
  if (!detail) {
    return null;
  }

  const artists = Array.isArray(detail.ar) ? detail.ar : [];
  const artistNames = artists.map((artist) => artist?.name).filter(Boolean);
  const durationMs = Number(detail.dt) || 0;
  const playUrl = detail.playUrl || '';

  return {
    id: String(detail.id),
    title: detail.name || 'Unknown Song',
    artist: artistNames.join(' / ') || 'Unknown Artist',
    album: detail.al?.name || 'Unknown Album',
    genre: 'Pop',
    description: `${artistNames.join(' / ') || 'Unknown Artist'} - ${detail.al?.name || 'Unknown Album'}`,
    duration: durationMs,
    durationLabel: formatDuration(durationMs),
    year: null,
    cover: detail.al?.picUrl || '',
    audioUrl: playUrl,
    source: 'netease-unofficial-api',
    playback: {
      playable: Boolean(playUrl) || detail.privilege?.st !== -200,
      trial: false,
      trialInfo: null,
      vip: detail.fee === 1,
      visible: detail.privilege?.st !== -200,
      level: detail.level || null,
      qualities: [],
      songFee: detail.fee ?? 0
    }
  };
};

const getSongDetail = async (songId) => {
  const [detailPayload, playInfo] = await Promise.all([
    requestUnofficialApi('/song/detail', { ids: String(songId) }),
    getSongPlayUrl(songId).catch(() => null)
  ]);

  const song = Array.isArray(detailPayload?.songs) ? detailPayload.songs[0] : null;

  if (!song) {
    throw createAppError(404, 'SONG_NOT_FOUND', 'Song not found.');
  }

  return {
    ...song,
    playUrl: playInfo?.url || '',
    level: playInfo?.level || null
  };
};

const getSongPlayUrl = async (songId) => {
  const payload = await requestUnofficialApi('/song/url/v1', {
    id: String(songId),
    level: 'standard'
  });
  const playInfo = Array.isArray(payload?.data) ? payload.data[0] : null;

  if (!playInfo?.url) {
    throw createAppError(403, 'PLAY_UNAVAILABLE', 'This song is unavailable.');
  }

  return playInfo;
};

const getSongLyric = async (songId) => {
  const payload = await requestUnofficialApi('/lyric', { id: String(songId) });

  return {
    songId: String(songId),
    lyric: payload?.lrc?.lyric || '',
    noLyric: !payload?.lrc?.lyric,
    transLyric: payload?.tlyric?.lyric || null,
    txtLyric: payload?.klyric?.lyric || ''
  };
};

const searchSongs = async (keyword, extra = {}) => {
  const payload = await requestUnofficialApi('/cloudsearch', {
    keywords: keyword,
    limit: extra.limit ?? 30,
    offset: extra.offset ?? 0,
    type: 1
  });
  const result = payload?.result || {};

  return {
    recordCount: Number(result.songCount) || 0,
    records: (Array.isArray(result.songs) ? result.songs : []).map(mapSearchSongRecord)
  };
};

const searchAlbums = async (keyword, extra = {}) => {
  const payload = await requestUnofficialApi('/cloudsearch', {
    keywords: keyword,
    limit: extra.limit ?? 30,
    offset: extra.offset ?? 0,
    type: 10
  });
  const result = payload?.result || {};

  return {
    recordCount: Number(result.albumCount) || 0,
    records: (Array.isArray(result.albums) ? result.albums : []).map((album) => ({
      id: String(album.id),
      name: album.name || 'Unknown Album',
      language: '',
      coverImgUrl: album.picUrl || '',
      company: album.company || '',
      transName: null,
      aliaName: '',
      genre: null,
      artists: Array.isArray(album.artists)
        ? album.artists.map((artist) => ({ id: String(artist.id), name: artist.name }))
        : [],
      briefDesc: '',
      description: '',
      publishTime: album.publishTime || null,
      subed: null
    }))
  };
};

const searchArtists = async (keyword, extra = {}) => {
  const payload = await requestUnofficialApi('/cloudsearch', {
    keywords: keyword,
    limit: extra.limit ?? 30,
    offset: extra.offset ?? 0,
    type: 100
  });
  const result = payload?.result || {};

  return {
    recordCount: Number(result.artistCount) || 0,
    records: (Array.isArray(result.artists) ? result.artists : []).map((artist) => ({
      id: String(artist.id),
      name: artist.name || 'Unknown Artist',
      transName: null,
      coverImgUrl: artist.picUrl || artist.img1v1Url || '',
      type: 0,
      authMusicianV: false,
      identity: [],
      roles: null,
      subCount: 0,
      briefDesc: '',
      nationality: null,
      musicSize: Number(artist.musicSize) || 0
    }))
  };
};

const searchComplex = async (keyword, extra = {}) => {
  const limit = Number(extra.limit) || 30;
  const offset = Number(extra.offset) || 0;
  const [songs, artists, albums] = await Promise.all([
    searchSongs(keyword, { limit, offset }),
    searchArtists(keyword, { limit: Math.min(limit, 12), offset: 0 }),
    searchAlbums(keyword, { limit: Math.min(limit, 12), offset: 0 })
  ]);

  return {
    songs: songs.records || [],
    artists: artists.records || [],
    albums: albums.records || []
  };
};

module.exports = {
  createAppError,
  ensureMusicApiReady,
  getSongDetail,
  getSongPlayUrl,
  getSongLyric,
  searchSongs,
  searchAlbums,
  searchArtists,
  searchComplex,
  mapSongDetailToClient
};
