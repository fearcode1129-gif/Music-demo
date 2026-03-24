import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { resolvePlayableSong } from '../services/musicApi';
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

const ensurePlayableCatalogSong = async (songId) => {
  const songCatalog = useLibraryStore.getState().songCatalog;
  const currentSong = Array.isArray(songCatalog) ? songCatalog.find((song) => song.id === songId) : null;

  if (!currentSong) {
    return null;
  }

  if (currentSong.audioUrl) {
    return currentSong;
  }

  const resolvedSong = await resolvePlayableSong(currentSong);

  if (resolvedSong?.audioUrl) {
    useLibraryStore.getState().registerSongsInCatalog([resolvedSong]);
    return resolvedSong;
  }

  return null;
};

export const usePlayerStore = create(
  persist(
    (set, get) => ({
      queue: [],
      currentSongId: null,
      isPlaying: false,
      playMode: 'list-loop',
      volume: 0.8,
      currentTime: 0,
      duration: 0,
      seekTarget: null,
      playerError: '',
      syncQueueWithCatalog(songCatalog) {
        set((state) => {
          const catalogIds = new Set((Array.isArray(songCatalog) ? songCatalog : []).map((song) => song.id));
          const catalogQueue = (Array.isArray(songCatalog) ? songCatalog : []).map((song) => song.id);
          const persistedQueue = Array.isArray(state.queue)
            ? state.queue.filter((songId) => catalogIds.has(songId))
            : [];
          const queue = persistedQueue.length > 0 ? persistedQueue : catalogQueue;
          const currentSongId = catalogIds.has(state.currentSongId) ? state.currentSongId : queue[0] || null;

          return {
            queue,
            currentSongId,
            isPlaying: currentSongId ? state.isPlaying : false,
            playMode: state.playMode,
            volume: state.volume,
            currentTime: currentSongId === state.currentSongId ? state.currentTime : 0,
            duration: currentSongId === state.currentSongId ? state.duration : 0,
            seekTarget: null,
            playerError: state.playerError
          };
        });
      },
      async playSong(song, queueSource) {
        if (!song?.id) {
          set((state) => ({
            ...state,
            playerError: '当前歌曲无效，无法播放。'
          }));
          return;
        }

        const playableSong = song.audioUrl ? song : await resolvePlayableSong(song);

        if (!playableSong?.audioUrl) {
          set((state) => ({
            ...state,
            playerError: '当前歌曲暂无可用播放地址。'
          }));
          return;
        }

        useLibraryStore.getState().registerSongsInCatalog([playableSong, ...(Array.isArray(queueSource) ? queueSource : [])]);
        const songCatalog = useLibraryStore.getState().songCatalog;
        const nextQueue = buildQueue(queueSource, songCatalog);

        set((state) => {
          const sameSong = state.currentSongId === playableSong.id;
          const sameQueue =
            Array.isArray(state.queue) &&
            state.queue.length === nextQueue.length &&
            state.queue.every((id, index) => id === nextQueue[index]);

          if (sameSong && sameQueue) {
            return {
              ...state,
              isPlaying: !state.isPlaying,
              playerError: ''
            };
          }

          return {
            ...state,
            queue: nextQueue,
            currentSongId: playableSong.id,
            isPlaying: true,
            currentTime: 0,
            duration: 0,
            seekTarget: 0,
            playerError: ''
          };
        });

        addSongToRecentHistory(playableSong);
      },
      async playNext() {
        const songCatalog = useLibraryStore.getState().songCatalog;
        const queueSongs = resolveQueueSongs(get().queue, songCatalog);

        if (queueSongs.length === 0) {
          set((state) => ({
            ...state,
            playerError: '当前播放队列为空。'
          }));
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

          const nextSong = await ensurePlayableCatalogSong(queueSongs[randomIndex].id);
          if (!nextSong) {
            set((state) => ({
              ...state,
              playerError: '下一首歌曲暂无可用播放地址。'
            }));
            return;
          }
          set((state) => ({
            ...state,
            currentSongId: nextSong.id,
            isPlaying: true,
            currentTime: 0,
            duration: 0,
            seekTarget: 0,
            playerError: ''
          }));
          addSongToRecentHistory(nextSong);
          return;
        }

        const nextIndex = (currentIndex + 1) % queueSongs.length;
        const nextSong = await ensurePlayableCatalogSong(queueSongs[nextIndex].id);

        if (!nextSong) {
          set((state) => ({
            ...state,
            playerError: '下一首歌曲暂无可用播放地址。'
          }));
          return;
        }

        set((state) => ({
          ...state,
          currentSongId: nextSong.id,
          isPlaying: true,
          currentTime: 0,
          duration: 0,
          seekTarget: 0,
          playerError: ''
        }));
        addSongToRecentHistory(nextSong);
      },
      async playPrevious() {
        const songCatalog = useLibraryStore.getState().songCatalog;
        const queueSongs = resolveQueueSongs(get().queue, songCatalog);

        if (queueSongs.length === 0) {
          set((state) => ({
            ...state,
            playerError: '当前播放队列为空。'
          }));
          return;
        }

        const currentIndex = Math.max(
          queueSongs.findIndex((song) => song.id === get().currentSongId),
          0
        );
        const previousIndex = (currentIndex - 1 + queueSongs.length) % queueSongs.length;
        const previousSong = await ensurePlayableCatalogSong(queueSongs[previousIndex].id);

        if (!previousSong) {
          set((state) => ({
            ...state,
            playerError: '上一首歌曲暂无可用播放地址。'
          }));
          return;
        }

        set((state) => ({
          ...state,
          currentSongId: previousSong.id,
          isPlaying: true,
          currentTime: 0,
          duration: 0,
          seekTarget: 0,
          playerError: ''
        }));
        addSongToRecentHistory(previousSong);
      },
      togglePlay(nextPlaying) {
        set((state) => ({
          ...state,
          isPlaying: Boolean(nextPlaying),
          playerError: ''
        }));
      },
      setVolume(nextVolume) {
        set((state) => ({
          ...state,
          volume: Math.max(0, Math.min(1, Number(nextVolume)))
        }));
      },
      setPlaybackProgress(nextTime, nextDuration) {
        set((state) => ({
          ...state,
          currentTime: Math.max(0, Number(nextTime) || 0),
          duration: Math.max(0, Number(nextDuration) || 0)
        }));
      },
      requestSeek(nextTime) {
        set((state) => ({
          ...state,
          seekTarget: Math.max(0, Number(nextTime) || 0),
          currentTime: Math.max(0, Number(nextTime) || 0)
        }));
      },
      clearSeekTarget() {
        set((state) => ({
          ...state,
          seekTarget: null
        }));
      },
      cyclePlayMode() {
        set((state) => {
          const currentModeIndex = PLAY_MODES.indexOf(state.playMode);
          return {
            ...state,
            playMode: PLAY_MODES[(currentModeIndex + 1) % PLAY_MODES.length],
            playerError: ''
          };
        });
      },
      async handleSongEnd() {
        if (get().playMode === 'single-loop') {
          set((state) => ({
            ...state,
            isPlaying: true,
            currentTime: 0,
            seekTarget: 0,
            playerError: ''
          }));
          return;
        }

        await get().playNext();
      },
      setPlayerError(message) {
        set((state) => ({
          ...state,
          playerError: String(message || '')
        }));
      },
      clearPlayerError() {
        set((state) => ({
          ...state,
          playerError: ''
        }));
      },
      pauseForGuest() {
        set((state) => ({
          ...state,
          isPlaying: false,
          seekTarget: null,
          playerError: ''
        }));
      }
    }),
    {
      name: 'music-demo-player-store-v4',
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
