import { Outlet, Link, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { useEffect, useRef } from 'react';
import OfflineIndicator from './OfflineIndicator.jsx';
import UpdatePrompt from './UpdatePrompt.jsx';

export default function Layout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const navRef = useRef(null);

  useEffect(() => {
    const saved = localStorage.getItem('theme');
    if (saved) document.documentElement.dataset.theme = saved;
  }, []);

  useEffect(() => {
    const nav = navRef.current;
    if (!nav) return;
    const update = () => document.documentElement.style.setProperty('--nav-h', `${nav.offsetHeight}px`);
    update();
    const observer = new ResizeObserver(update);
    observer.observe(nav);
    return () => observer.disconnect();
  }, []);

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <>
      <nav ref={navRef} className="topnav">
        <Link to="/" className="brand">Recall</Link>
        <div className="nav-links">
          <NavLink to="/" end data-tour="nav-courses">Courses</NavLink>
          <NavLink to="/chat" data-tour="nav-rappel">Rappel</NavLink>
          <NavLink to="/games" data-tour="nav-games">Games</NavLink>
          <NavLink to="/progress" data-tour="nav-progress">Progress</NavLink>
          {user?.streak > 0 && (
            <span className="streak-badge" title={`${user.streak}-day study streak!`}>
              🔥 {user.streak}
            </span>
          )}
        </div>
        <OfflineIndicator />
        <Link to="/settings" className="nav-username" title="Settings" data-tour="nav-settings">
          <span className="nav-gear" aria-hidden>⚙️</span>
          <span className="nav-username-text">{user?.display_name}</span>
        </Link>
        <button className="btn btn-ghost btn-sm" onClick={handleLogout}>Log out</button>
      </nav>
      <UpdatePrompt />
      <main>
        <Outlet />
      </main>
    </>
  );
}
