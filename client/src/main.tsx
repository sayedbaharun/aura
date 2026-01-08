import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";
import "./styles/reading-mode.css";

// Register service worker for PWA functionality
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register('/sw.js')
      .then((registration) => {
        console.log('[PWA] Service Worker registered:', registration.scope);

        // Check for updates more frequently (every 5 minutes)
        setInterval(() => {
          registration.update();
        }, 5 * 60 * 1000);

        // Handle updates - auto-reload when new version is ready
        registration.addEventListener('updatefound', () => {
          const newWorker = registration.installing;
          if (newWorker) {
            newWorker.addEventListener('statechange', () => {
              if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                // New version available - reload to activate it
                console.log('[PWA] New version available, reloading...');
                window.location.reload();
              }
            });
          }
        });

        // Also listen for the controlling service worker to change
        navigator.serviceWorker.addEventListener('controllerchange', () => {
          console.log('[PWA] Controller changed, app updated');
        });
      })
      .catch((error) => {
        console.log('[PWA] Service Worker registration failed:', error);
      });
  });
}

// Handle iOS standalone mode detection
const isStandalone = window.matchMedia('(display-mode: standalone)').matches ||
                     (window.navigator as any).standalone === true;

if (isStandalone) {
  document.documentElement.classList.add('pwa-standalone');
  console.log('[PWA] Running in standalone mode');
}

createRoot(document.getElementById("root")!).render(<App />);
