import { Outlet, Link, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';

export default function Layout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

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
        <span className="user">{user?.display_name}</span>
        <button className="btn btn-ghost btn-sm" onClick={handleLogout}>Log out</button>
      </nav>
      <main>
        <Outlet />
      </main>
    </>
  );
}
