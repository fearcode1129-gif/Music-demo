import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

const defaultCommentsBySong = {
  '1': [
    {
      id: 'comment-1',
      username: 'demo',
      content: '这首歌很适合开车的时候听。',
      createdAt: '2026-03-14 09:30'
    }
  ],
  '2': [
    {
      id: 'comment-2',
      username: 'demo',
      content: '封面和旋律都很治愈。',
      createdAt: '2026-03-14 09:35'
    }
  ],
  '3': [
    {
      id: 'comment-3',
      username: 'demo',
      content: '很适合夜晚安静地循环播放。',
      createdAt: '2026-03-14 09:40'
    }
  ]
};

const createFallbackComments = (songId) =>
  defaultCommentsBySong[songId] || [
    {
      id: `comment-default-${songId}`,
      username: 'demo',
      content: '欢迎留下你对这首歌的第一条评论。',
      createdAt: '2026-03-14 10:00'
    }
  ];

export const useCommentStore = create(
  persist(
    (set, get) => ({
      commentsBySong: {},
      ensureSongComments(songId) {
        if (!songId) {
          return [];
        }

        const existingComments = get().commentsBySong[songId];
        if (Array.isArray(existingComments) && existingComments.length > 0) {
          return existingComments;
        }

        const nextComments = createFallbackComments(songId);
        set((state) => ({
          commentsBySong: {
            ...state.commentsBySong,
            [songId]: nextComments
          }
        }));

        return nextComments;
      },
      addComment(songId, comment) {
        if (!songId || !comment?.id) {
          return;
        }

        set((state) => {
          const currentComments = state.commentsBySong[songId] || createFallbackComments(songId);
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
          const currentComments = state.commentsBySong[songId] || createFallbackComments(songId);
          const filteredComments = currentComments.filter((item) => item.id !== commentId);

          return {
            commentsBySong: {
              ...state.commentsBySong,
              [songId]:
                filteredComments.length > 0
                  ? filteredComments
                  : [
                      {
                        id: `comment-fallback-${Date.now()}`,
                        username: 'system',
                        content: '默认评论已恢复，继续留下你的想法吧。',
                        createdAt: new Date().toLocaleString()
                      }
                    ]
            }
          };
        });
      }
    }),
    {
      name: 'music-demo-comment-store',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        commentsBySong: state.commentsBySong
      })
    }
  )
);
