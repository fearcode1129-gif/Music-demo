import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

const SEARCH_HISTORY_LIMIT = 8;

export const useSearchStore = create(
  persist(
    (set) => ({
      searchHistory: [],
      saveKeyword(keyword) {
        const normalizedKeyword = keyword.trim();

        if (!normalizedKeyword) {
          return;
        }

        set((state) => ({
          searchHistory: [
            normalizedKeyword,
            ...state.searchHistory.filter((item) => item !== normalizedKeyword)
          ].slice(0, SEARCH_HISTORY_LIMIT)
        }));
      },
      removeKeyword(keyword) {
        set((state) => ({
          searchHistory: state.searchHistory.filter((item) => item !== keyword)
        }));
      },
      clearHistory() {
        set({ searchHistory: [] });
      }
    }),
    {
      name: 'music-demo-search-store',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        searchHistory: state.searchHistory
      })
    }
  )
);
