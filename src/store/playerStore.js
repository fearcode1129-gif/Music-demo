import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { useAuthStore } from './authStore';
import { useLibraryStore } from './libraryStore';

const PLAY_MODES = ['list-loop', 'single-loop', 'shuffle'];

const buildQueue = (queueSource = [], catalog = []) => {
  const source = Array.isArray(queueSource) && queueSource.length > 0 ? queueSource : catalog;
  return source.map((item) => item.id);
};

const resolveQueueSongs = (queue, catalog) => {
  const catalogMap = new Map(catalog.map((song) => [song.id, song]));
  const safeQueue = Array.isArray(queue) && queue.length > 0 ? queue : catalog.map((song) => song.id);
  return safeQueue.map((songId) => catalogMap.get(songId)).filter(Boolean);
};

const addSongToRecentHistory = (song) => {
  const currentUser = useAuthStore.getState().currentUser;
  if (!currentUser?.id || !song?.id) {
    return;
  }

  useLibraryStore.getState().addRecentHistory(currentUser.id, song);
};

export const usePlayerStore = create(
  persist(
    (set, get) => ({
      queue: [],
      currentSongId: null,
      isPlaying: false,
      playMode: 'list-loop',
      volume: 0.8,
      syncQueueWithCatalog(songCatalog) {
        set((state) => {
          const catalogIds = new Set((Array.isArray(songCatalog) ? songCatalog : []).map((song) => song.id));
          const fallbackQueue = (Array.isArray(songCatalog) ? songCatalog : []).map((song) => song.id);
          const persistedQueue = Array.isArray(state.queue)
            ? state.queue.filter((songId) => catalogIds.has(songId))
            : [];
          const queue = persistedQueue.length > 0 ? persistedQueue : fallbackQueue;
          const currentSongId = catalogIds.has(state.currentSongId) ? state.currentSongId : queue[0] || null;

          return {
            queue,
            currentSongId,
            isPlaying: currentSongId ? state.isPlaying : false,
            playMode: state.playMode,
            volume: state.volume
          };
        });
      },
      playSong(song, queueSource) {
        if (!song?.id) {
          return;
        }

        useLibraryStore.getState().registerSongsInCatalog([song, ...(Array.isArray(queueSource) ? queueSource : [])]);
        const songCatalog = useLibraryStore.getState().songCatalog;
        const nextQueue = buildQueue(queueSource, songCatalog);

        set((state) => {
          const sameSong = state.currentSongId === song.id;
          const sameQueue =
            Array.isArray(state.queue) &&
            state.queue.length === nextQueue.length &&
            state.queue.every((id, index) => id === nextQueue[index]);

          if (sameSong && sameQueue) {
            return {
              ...state,
              isPlaying: !state.isPlaying
            };
          }

          return {
            ...state,
            queue: nextQueue,
            currentSongId: song.id,
            isPlaying: true
          };
        });

        addSongToRecentHistory(song);
      },
      playNext() {
        const songCatalog = useLibraryStore.getState().songCatalog;
        const queueSongs = resolveQueueSongs(get().queue, songCatalog);

        if (queueSongs.length === 0) {
          return;
        }

        const currentIndex = Math.max(
          queueSongs.findIndex((song) => song.id === get().currentSongId),
          0
        );

        if (get().playMode === 'shuffle' && queueSongs.length > 1) {
          let randomIndex = Math.floor(Math.random() * queueSongs.length);

          while (randomIndex === currentIndex) {
            randomIndex = Math.floor(Math.random() * queueSongs.length);
          }

          const nextSong = queueSongs[randomIndex];
          set((state) => ({
            ...state,
            currentSongId: nextSong.id,
            isPlaying: true
          }));
          addSongToRecentHistory(nextSong);
          return;
        }

        const nextIndex = (currentIndex + 1) % queueSongs.length;
        const nextSong = queueSongs[nextIndex];

        set((state) => ({
          ...state,
          currentSongId: nextSong.id,
          isPlaying: true
        }));
        addSongToRecentHistory(nextSong);
      },
      playPrevious() {
        const songCatalog = useLibraryStore.getState().songCatalog;
        const queueSongs = resolveQueueSongs(get().queue, songCatalog);

        if (queueSongs.length === 0) {
          return;
        }

        const currentIndex = Math.max(
          queueSongs.findIndex((song) => song.id === get().currentSongId),
          0
        );
        const previousIndex = (currentIndex - 1 + queueSongs.length) % queueSongs.length;
        const previousSong = queueSongs[previousIndex];

        set((state) => ({
          ...state,
          currentSongId: previousSong.id,
          isPlaying: true
        }));
        addSongToRecentHistory(previousSong);
      },
      togglePlay(nextPlaying) {
        set((state) => ({
          ...state,
          isPlaying: Boolean(nextPlaying)
        }));
      },
      setVolume(nextVolume) {
        set((state) => ({
          ...state,
          volume: Math.max(0, Math.min(1, Number(nextVolume)))
        }));
      },
      cyclePlayMode() {
        set((state) => {
          const currentModeIndex = PLAY_MODES.indexOf(state.playMode);
          return {
            ...state,
            playMode: PLAY_MODES[(currentModeIndex + 1) % PLAY_MODES.length]
          };
        });
      },
      handleSongEnd() {
        if (get().playMode === 'single-loop') {
          set((state) => ({
            ...state,
            isPlaying: true
          }));
          return;
        }

        get().playNext();
      },
      pauseForGuest() {
        set((state) => ({
          ...state,
          isPlaying: false
        }));
      }
    }),
    {
      name: 'music-demo-player-store',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        queue: state.queue,
        currentSongId: state.currentSongId,
        isPlaying: state.isPlaying,
        playMode: state.playMode,
        volume: state.volume
      })
    }
  )
);
