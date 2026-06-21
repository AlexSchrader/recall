import { Outlet, Link, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { useEffect } from 'react';

export default function Layout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    const saved = localStorage.getItem('theme');
    if (saved) document.documentElement.dataset.theme = saved;
  }, []);

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <>
      <nav className="topnav">
        <Link to="/" className="brand">Recall</Link>
        <div className="nav-links">
          <NavLink to="/" end>Courses</NavLink>
          <NavLink to="/chat">Rappel</NavLink>
        </div>
        {user?.streak > 0 && (
          <span className="streak-badge" title={`${user.streak}-day study streak!`}>
            🔥 {user.streak}
          </span>
        )}
        <Link to="/settings" className="nav-username">{user?.display_name}</Link>
        <button className="btn btn-ghost btn-sm" onClick={handleLogout}>Log out</button>
      </nav>
      <main>
        <Outlet />
      </main>
    </>
  );
}
