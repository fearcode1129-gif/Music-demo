import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import fallbackSongs from '../data/songs';
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
      if (song?.id && song?.audioUrl && !mergedMap.has(song.id)) {
        mergedMap.set(song.id, song);
      }
    });
  });

  return Array.from(mergedMap.values());
};

export const useLibraryStore = create(
  persist(
    (set, get) => ({
      songCatalog: fallbackSongs,
      catalogLoading: true,
      catalogError: '',
      favoritesByUser: {},
      recentHistoryByUser: {},
      async loadCatalog(isAuthenticated) {
        if (!isAuthenticated) {
          set({ catalogLoading: false, catalogError: '' });
          return;
        }

        set({ catalogLoading: true, catalogError: '' });

        try {
          const persistedSongs = Array.isArray(get().songCatalog) ? get().songCatalog : [];
          const fetchedSongs = await fetchSeedSongs();
          const nextSongs = Array.isArray(fetchedSongs) && fetchedSongs.length > 0 ? fetchedSongs : fallbackSongs;

          set({
            songCatalog: mergeSongsById(nextSongs, persistedSongs),
            catalogError: ''
          });
        } catch (error) {
          set((state) => ({
            songCatalog: mergeSongsById(state.songCatalog, fallbackSongs),
            catalogError: '音乐接口加载失败，已切换到本地歌曲。'
          }));
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
      name: 'music-demo-library-store',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        songCatalog: state.songCatalog,
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
