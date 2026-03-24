import React, { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import Navbar from './components/Navbar';
import Player from './components/Player';
import AppRouter from './router/AppRouter';
import { useAuthStore } from './store/authStore';
import { useLibraryStore } from './store/libraryStore';
import { usePlayerStore } from './store/playerStore';

function App() {
  const location = useLocation();
  const currentUser = useAuthStore((state) => state.currentUser);
  const isAuthenticated = Boolean(currentUser);
  const songCatalog = useLibraryStore((state) => state.songCatalog);
  const loadCatalog = useLibraryStore((state) => state.loadCatalog);
  const syncQueueWithCatalog = usePlayerStore((state) => state.syncQueueWithCatalog);
  const pauseForGuest = usePlayerStore((state) => state.pauseForGuest);
  const isImmersiveRoute = location.pathname === '/player';

  useEffect(() => {
    loadCatalog(isAuthenticated);
  }, [isAuthenticated, loadCatalog]);

  useEffect(() => {
    syncQueueWithCatalog(songCatalog);
  }, [songCatalog, syncQueueWithCatalog]);

  useEffect(() => {
    if (!isAuthenticated) {
      pauseForGuest();
    }
  }, [isAuthenticated, pauseForGuest]);

  return (
    <div className={`app-shell ${isImmersiveRoute ? 'app-shell--immersive' : ''}`}>
      {!isImmersiveRoute && <Navbar />}

      <main className={`main-content ${isImmersiveRoute ? 'main-content--immersive' : ''}`}>
        <AppRouter />
      </main>

      {isAuthenticated && <Player />}
    </div>
  );
}

export default App;
