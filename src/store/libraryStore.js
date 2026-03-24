import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { fetchSeedSongs } from '../services/musicApi';

const RECENT_HISTORY_LIMIT = 12;
const EMPTY_ARRAY = [];

const mergeSongsById = (...collections) => {
  const mergedMap = new Map();

  collections.forEach((collection) => {
    if (!Array.isArray(collection)) {
      return;
    }

    collection.forEach((song) => {
      if (!song?.id) {
        return;
      }

      const previousSong = mergedMap.get(song.id) || {};
      mergedMap.set(song.id, {
        ...previousSong,
        ...song,
        cover: song.cover || previousSong.cover,
        audioUrl: song.audioUrl || previousSong.audioUrl || ''
      });
    });
  });

  return Array.from(mergedMap.values());
};

export const useLibraryStore = create(
  persist(
    (set, get) => ({
      songCatalog: [],
      lyricsBySongId: {},
      catalogLoading: true,
      catalogError: '',
      favoritesByUser: {},
      recentHistoryByUser: {},
      async loadCatalog(isAuthenticated) {
        if (!isAuthenticated) {
          set({ catalogLoading: false, catalogError: '', songCatalog: [], lyricsBySongId: {} });
          return;
        }

        const cachedSongs = get().songCatalog;
        const hasCachedSongs = Array.isArray(cachedSongs) && cachedSongs.length > 0;

        set({
          catalogLoading: !hasCachedSongs,
          catalogError: '',
          songCatalog: hasCachedSongs ? cachedSongs : []
        });

        try {
          const fetchedSongs = await fetchSeedSongs();

          set({
            songCatalog: fetchedSongs,
            catalogError: ''
          });
        } catch (error) {
          set({
            songCatalog: hasCachedSongs ? get().songCatalog : [],
            catalogError: '网易云音乐数据加载失败，请确认本地 Music API 服务已启动。'
          });
        } finally {
          set({ catalogLoading: false });
        }
      },
      registerSongsInCatalog(incomingSongs) {
        if (!Array.isArray(incomingSongs) || incomingSongs.length === 0) {
          return get().songCatalog;
        }

        const mergedSongs = mergeSongsById(get().songCatalog, incomingSongs);
        set({ songCatalog: mergedSongs });
        return mergedSongs;
      },
      cacheLyrics(songId, lyrics) {
        if (!songId) {
          return;
        }

        set((state) => ({
          lyricsBySongId: {
            ...state.lyricsBySongId,
            [songId]: Array.isArray(lyrics) ? lyrics : []
          }
        }));
      },
      getLyricsBySongId(songId) {
        if (!songId) {
          return [];
        }

        return get().lyricsBySongId[songId] || [];
      },
      getFavoriteSongIds(userId) {
        if (!userId) {
          return [];
        }

        return get().favoritesByUser[userId] || [];
      },
      toggleFavorite(userId, songId) {
        if (!userId || !songId) {
          return;
        }

        set((state) => {
          const currentFavorites = state.favoritesByUser[userId] || [];
          const nextFavorites = currentFavorites.includes(songId)
            ? currentFavorites.filter((id) => id !== songId)
            : [songId, ...currentFavorites];

          return {
            favoritesByUser: {
              ...state.favoritesByUser,
              [userId]: nextFavorites
            }
          };
        });
      },
      getRecentHistory(userId) {
        if (!userId) {
          return [];
        }

        return get().recentHistoryByUser[userId] || [];
      },
      addRecentHistory(userId, song) {
        if (!userId || !song?.id) {
          return;
        }

        set((state) => {
          const currentHistory = state.recentHistoryByUser[userId] || [];
          const nextHistory = [
            {
              songId: song.id,
              playedAt: new Date().toLocaleString()
            },
            ...currentHistory.filter((item) => item.songId !== song.id)
          ].slice(0, RECENT_HISTORY_LIMIT);

          return {
            recentHistoryByUser: {
              ...state.recentHistoryByUser,
              [userId]: nextHistory
            }
          };
        });
      }
    }),
    {
      name: 'music-demo-library-store-v4',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        songCatalog: state.songCatalog,
        lyricsBySongId: state.lyricsBySongId,
        favoritesByUser: state.favoritesByUser,
        recentHistoryByUser: state.recentHistoryByUser
      })
    }
  )
);

export const selectFavoriteSongIdsByUser = (userId) => (state) =>
  userId ? state.favoritesByUser[userId] || EMPTY_ARRAY : EMPTY_ARRAY;

export const selectRecentHistoryByUser = (userId) => (state) =>
  userId ? state.recentHistoryByUser[userId] || EMPTY_ARRAY : EMPTY_ARRAY;

export const selectLyricsBySongId = (songId) => (state) =>
  songId ? state.lyricsBySongId[songId] || EMPTY_ARRAY : EMPTY_ARRAY;
