import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

const defaultUsers = [
  {
    id: 'user-1',
    username: 'demo',
    password: '123456',
    avatar: 'https://api.dicebear.com/7.x/thumbs/svg?seed=demo'
  }
];

const wait = (result, shouldReject = false) =>
  new Promise((resolve, reject) => {
    setTimeout(() => {
      if (shouldReject) {
        reject(result);
        return;
      }

      resolve(result);
    }, 700);
  });

export const useAuthStore = create(
  persist(
    (set, get) => ({
      users: defaultUsers,
      currentUser: null,
      authLoading: false,
      async login(username, password) {
        set({ authLoading: true });

        try {
          const normalizedName = username.trim();
          const matchedUser = get().users.find(
            (user) => user.username === normalizedName && user.password === password
          );

          if (!matchedUser) {
            await wait(new Error('用户名或密码错误。'), true);
          }

          await wait(true);
          set({ currentUser: matchedUser });
          return matchedUser;
        } finally {
          set({ authLoading: false });
        }
      },
      async register(username, password) {
        set({ authLoading: true });

        try {
          const normalizedName = username.trim();
          const exists = get().users.some((user) => user.username === normalizedName);

          if (!normalizedName || !password) {
            await wait(new Error('用户名和密码不能为空。'), true);
          }

          if (exists) {
            await wait(new Error('用户名已存在，请更换后重试。'), true);
          }

          const newUser = {
            id: `user-${Date.now()}`,
            username: normalizedName,
            password,
            avatar: `https://api.dicebear.com/7.x/thumbs/svg?seed=${encodeURIComponent(normalizedName)}`
          };

          await wait(true);
          set((state) => ({
            users: [...state.users, newUser],
            currentUser: newUser
          }));

          return newUser;
        } finally {
          set({ authLoading: false });
        }
      },
      logout() {
        set({ currentUser: null });
      }
    }),
    {
      name: 'music-demo-auth-store',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        users: state.users,
        currentUser: state.currentUser
      })
    }
  )
);
