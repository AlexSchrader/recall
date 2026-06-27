import { useState, useEffect } from 'react';

// Small "offline" pill shown in the header when the browser reports no network.
export default function OfflineIndicator() {
  const [online, setOnline] = useState(navigator.onLine);
  useEffect(() => {
    const on = () => setOnline(true);
    const off = () => setOnline(false);
    window.addEventListener('online', on);
    window.addEventListener('offline', off);
    return () => { window.removeEventListener('online', on); window.removeEventListener('offline', off); };
  }, []);

  if (online) return null;
  return <span className="offline-pill" title="You're offline — past quizzes, flashcards and chats still work">● Offline</span>;
}
