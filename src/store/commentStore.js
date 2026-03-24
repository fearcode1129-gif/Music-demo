import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

const EMPTY_ARRAY = [];

export const useCommentStore = create(
  persist(
    (set, get) => ({
      commentsBySong: {},
      ensureSongComments(songId) {
        if (!songId) {
          return [];
        }

        const existingComments = get().commentsBySong[songId];
        return Array.isArray(existingComments) ? existingComments : [];
      },
      addComment(songId, comment) {
        if (!songId || !comment?.id) {
          return;
        }

        set((state) => {
          const currentComments = Array.isArray(state.commentsBySong[songId]) ? state.commentsBySong[songId] : [];

          return {
            commentsBySong: {
              ...state.commentsBySong,
              [songId]: [comment, ...currentComments]
            }
          };
        });
      },
      deleteComment(songId, commentId) {
        if (!songId || !commentId) {
          return;
        }

        set((state) => {
          const currentComments = Array.isArray(state.commentsBySong[songId]) ? state.commentsBySong[songId] : [];

          return {
            commentsBySong: {
              ...state.commentsBySong,
              [songId]: currentComments.filter((item) => item.id !== commentId)
            }
          };
        });
      }
    }),
    {
      name: 'music-demo-comment-store-v2',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        commentsBySong: state.commentsBySong
      })
    }
  )
);

export const selectCommentsBySong = (songId) => (state) =>
  songId ? state.commentsBySong[songId] || EMPTY_ARRAY : EMPTY_ARRAY;
