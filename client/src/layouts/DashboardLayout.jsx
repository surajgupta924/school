import { useEffect, useMemo, useRef, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import {
  useGetInboxQuery,
  useLogoutServerMutation,
  useMarkAllNotificationsReadMutation,
  useMarkNotificationReadMutation,
} from '../app/api';
import { disconnectSocket } from '../app/socket';
import { logout, selectSchoolName, selectUser } from '../features/auth/authSlice';
import { navForRole, ROLE_LABELS } from '../config/nav';
import { Avatar, timeAgo } from '../components/ui';
import { IconBell, IconLogout, IconMenu, IconUser } from '../components/Icons';

function useClickOutside(onOutside) {
  const ref = useRef(null);
  useEffect(() => {
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) onOutside();
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [onOutside]);
  return ref;
}

function NotificationBell() {
  const [open, setOpen] = useState(false);
  const ref = useClickOutside(() => setOpen(false));
  const { data: inbox = [] } = useGetInboxQuery(undefined, { pollingInterval: 45000 });
  const [markRead] = useMarkNotificationReadMutation();
  const [markAll] = useMarkAllNotificationsReadMutation();

  const unread = inbox.filter((n) => !n.read).length;

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button
        type="button"
        className="icon-btn bell"
        onClick={() => setOpen((v) => !v)}
        aria-label={`Notifications${unread ? `, ${unread} unread` : ''}`}
      >
        <IconBell size={20} />
        {unread > 0 ? <span className="bell-dot">{unread > 9 ? '9+' : unread}</span> : null}
      </button>

      {open ? (
        <div className="popover">
          <div className="popover-head">
            <span>Notifications</span>
            {unread > 0 ? (
              <button type="button" className="btn btn-ghost btn-sm" onClick={() => markAll()}>
                Mark all read
              </button>
            ) : null}
          </div>
          <div className="popover-list">
            {inbox.length === 0 ? (
              <div className="empty" style={{ padding: '30px 16px' }}>
                <div className="empty-title">All caught up</div>
                <p className="empty-text">No notifications yet.</p>
              </div>
            ) : (
              inbox.slice(0, 12).map((n) => (
                <div
                  key={n._id}
                  className={`popover-item${n.read ? '' : ' unread'}`}
                  onClick={() => !n.read && markRead(n._id)}
                >
                  <div style={{ minWidth: 0 }}>
                    <div className="notif-title">{n.title}</div>
                    <div className="notif-msg">{n.message}</div>
                    <div className="notif-time">{timeAgo(n.createdAt)}</div>
                  </div>
                </div>
              ))
            )}
          </div>
          <div className="popover-foot">
            <Link to="/inbox" onClick={() => setOpen(false)}>
              Open inbox
            </Link>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function UserMenu({ user, onLogout }) {
  const [open, setOpen] = useState(false);
  const ref = useClickOutside(() => setOpen(false));

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button type="button" className="user-chip" onClick={() => setOpen((v) => !v)}>
        <Avatar name={user?.name} src={user?.photoUrl} size="sm" />
        <span className="user-chip-text">
          <span className="user-chip-name" style={{ display: 'block' }}>
            {user?.name}
          </span>
          <span className="user-chip-role">{ROLE_LABELS[user?.role] || user?.role}</span>
        </span>
      </button>

      {open ? (
        <div className="popover" style={{ width: 240 }}>
          <div className="popover-head" style={{ display: 'block' }}>
            <div className="notif-title">{user?.name}</div>
            <div className="notif-msg">{user?.email}</div>
          </div>
          <div>
            {user?.admissionId ? (
              <div className="menu-item" style={{ cursor: 'default' }}>
                <IconUser size={16} /> {user.admissionId}
              </div>
            ) : null}
            {user?.employeeId ? (
              <div className="menu-item" style={{ cursor: 'default' }}>
                <IconUser size={16} /> {user.employeeId}
              </div>
            ) : null}
            <button type="button" className="menu-item danger" onClick={onLogout}>
              <IconLogout size={16} /> Sign out
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}

export default function DashboardLayout() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const location = useLocation();
  const user = useSelector(selectUser);
  const schoolName = useSelector(selectSchoolName);
  const [logoutServer] = useLogoutServerMutation();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { data: inbox = [] } = useGetInboxQuery(undefined, { pollingInterval: 60000 });

  const groups = useMemo(() => navForRole(user?.role), [user?.role]);
  const unread = inbox.filter((n) => !n.read).length;

  useEffect(() => {
    setSidebarOpen(false);
  }, [location.pathname]);

  const pageTitle = useMemo(() => {
    const flat = groups.flatMap((g) => g.items);
    const match =
      flat.find((i) => i.to !== '/' && location.pathname.startsWith(i.to)) ||
      flat.find((i) => i.to === location.pathname);
    return match?.label || 'Dashboard';
  }, [groups, location.pathname]);

  async function handleLogout() {
    try {
      await logoutServer().unwrap();
    } catch {
      /* the local session is cleared regardless of the server response */
    }
    disconnectSocket();
    dispatch(logout());
    navigate('/login', { replace: true });
  }

  return (
    <div className="shell">
      <aside className={`sidebar${sidebarOpen ? ' open' : ''}`}>
        <div className="sidebar-brand">
          <div className="brand-mark">XC</div>
          <div style={{ minWidth: 0 }}>
            <div className="brand-name">{schoolName || 'XYZ Convent School'}</div>
            <div className="brand-tag">ERP Portal</div>
          </div>
        </div>

        <nav className="nav">
          {groups.map((group) => (
            <div key={group.label}>
              <div className="nav-group-label">{group.label}</div>
              {group.items.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.end}
                  className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}
                >
                  {item.icon}
                  <span>{item.label}</span>
                  {item.badge === 'inbox' && unread > 0 ? (
                    <span className="nav-badge">{unread}</span>
                  ) : null}
                </NavLink>
              ))}
            </div>
          ))}
        </nav>

        <div className="sidebar-foot">
          {ROLE_LABELS[user?.role] || user?.role} workspace · v1.0
        </div>
      </aside>

      {sidebarOpen ? <div className="scrim" onClick={() => setSidebarOpen(false)} /> : null}

      <div className="main">
        <header className="topbar no-print">
          <button
            type="button"
            className="icon-btn hamburger"
            onClick={() => setSidebarOpen(true)}
            aria-label="Open navigation"
          >
            <IconMenu size={20} />
          </button>
          <div className="topbar-title">{pageTitle}</div>
          <div className="topbar-spacer" />
          <NotificationBell />
          <UserMenu user={user} onLogout={handleLogout} />
        </header>

        <main className="content">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
