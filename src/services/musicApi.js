import fallbackSongs from '../data/songs';

const ITUNES_BASE_URL = 'https://itunes.apple.com/search';

const seedTerms = [
  'Taylor Swift',
  'Coldplay',
  'Adele',
  'Bruno Mars',
  'OneRepublic',
  'Imagine Dragons',
  'Maroon 5',
  'Sia',
  'Avicii',
  'Ed Sheeran'
];

const toSongModel = (item) => ({
  id: String(item.trackId),
  title: item.trackName || 'Unknown Track',
  artist: item.artistName || 'Unknown Artist',
  album: item.collectionName || 'Unknown Album',
  genre: item.primaryGenreName || 'Pop',
  description: `${item.artistName || 'Unknown Artist'} track from ${item.collectionName || 'Unknown Album'}.`,
  duration: item.trackTimeMillis
    ? `${String(Math.floor(item.trackTimeMillis / 60000)).padStart(2, '0')}:${String(
        Math.floor((item.trackTimeMillis % 60000) / 1000)
      ).padStart(2, '0')}`
    : '00:30',
  year: item.releaseDate ? new Date(item.releaseDate).getFullYear() : 2024,
  cover: (item.artworkUrl100 || '').replace('100x100', '600x600'),
  audioUrl: item.previewUrl || ''
});

const scoreSong = (song, keyword) => {
  const normalizedKeyword = keyword.trim().toLowerCase();
  const title = (song.title || '').toLowerCase();
  const artist = (song.artist || '').toLowerCase();
  const album = (song.album || '').toLowerCase();
  const genre = (song.genre || '').toLowerCase();
  const searchable = `${title} ${artist} ${album} ${genre}`;

  if (!normalizedKeyword) {
    return 0;
  }

  if (title === normalizedKeyword) {
    return 120;
  }

  if (artist === normalizedKeyword) {
    return 110;
  }

  if (album === normalizedKeyword) {
    return 100;
  }

  if (title.startsWith(normalizedKeyword)) {
    return 90;
  }

  if (artist.startsWith(normalizedKeyword)) {
    return 85;
  }

  if (album.startsWith(normalizedKeyword)) {
    return 80;
  }

  if (searchable.includes(normalizedKeyword)) {
    return 60;
  }

  return 0;
};

const rankSongs = (songs, keyword) =>
  [...songs].sort((left, right) => scoreSong(right, keyword) - scoreSong(left, keyword));

const fetchSongsByTerm = async (term, limit = 12) => {
  const url = `${ITUNES_BASE_URL}?term=${encodeURIComponent(term)}&media=music&entity=song&limit=${limit}`;
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error('Music API request failed.');
  }

  const data = await response.json();
  const results = Array.isArray(data.results) ? data.results : [];

  return results
    .filter((item) => item.trackId && item.previewUrl && item.artworkUrl100)
    .map(toSongModel);
};

export const fetchSeedSongs = async () => {
  const resultGroups = await Promise.all(seedTerms.map((term) => fetchSongsByTerm(term, 8)));
  const uniqueMap = new Map();

  resultGroups.flat().forEach((song) => {
    if (!uniqueMap.has(song.id)) {
      uniqueMap.set(song.id, song);
    }
  });

  const mergedSongs = Array.from(uniqueMap.values()).slice(0, 40);

  if (mergedSongs.length >= 30) {
    return mergedSongs;
  }

  return [...mergedSongs, ...fallbackSongs.filter((song) => !uniqueMap.has(song.id))];
};

export const searchSongs = async (keyword, localSongs = fallbackSongs) => {
  const normalizedKeyword = keyword.trim();
  const safeLocalSongs = Array.isArray(localSongs) && localSongs.length > 0 ? localSongs : fallbackSongs;

  if (!normalizedKeyword) {
    return safeLocalSongs;
  }

  try {
    return rankSongs(await fetchSongsByTerm(normalizedKeyword, 30), normalizedKeyword);
  } catch (error) {
    const loweredKeyword = normalizedKeyword.toLowerCase();
    return rankSongs(
      safeLocalSongs.filter((song) =>
        [song.title, song.artist, song.album, song.genre].join(' ').toLowerCase().includes(loweredKeyword)
      ),
      normalizedKeyword
    );
  }
};
