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
import { ADMIN_NAV, findAdminPageMeta } from '../config/adminNav';
import { TEACHER_NAV, findTeacherPageMeta } from '../config/teacherNav';
import { ACCOUNTANT_NAV, findAccountantPageMeta } from '../config/accountantNav';
import { STUDENT_NAV, findStudentPageMeta } from '../config/studentNav';
import { PARENT_NAV, findParentPageMeta } from '../config/parentNav';
import { Avatar, timeAgo } from '../components/ui';
import { IconBell, IconLogout, IconMenu } from '../components/Icons';

const ICON_MAP = {
  grid: '▦',
  wallet: '▤',
  calc: '⌗',
  grad: '🎓',
  school: '🏫',
  monitor: '🖥',
  cap: '🎓',
  laptop: '💻',
  blocks: '▦',
  users: '👥',
  handshake: '🤝',
  clipboard: '📋',
  pen: '✎',
  qr: '▣',
  check: '☑',
  book: '📕',
  badge: '🏅',
  megaphone: '📢',
  library: '📚',
  warehouse: '🏗',
  bus: '🚌',
  building: '🏢',
  help: '◉',
  cubes: '🧊',
  chart: '◔',
  gears: '⚙',
  apps: '⊞',
  user: '👤',
  calendar: '📅',
  list: '☰',
  print: '🖨',
  upload: '⬆',
  video: '📹',
  logout: '⎋',
  rupee: '₹',
  search: '⌕',
  sms: '💬',
  wa: '🟢',
  mail: '✉',
  health: '❤',
  folder: '📁',
  image: '🖼',
  bot: '🤖',
};

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
      <button type="button" className="icon-btn bell" onClick={() => setOpen((v) => !v)} aria-label="Notifications">
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
              </div>
            ) : (
              inbox.slice(0, 12).map((n) => (
                <div key={n._id} className={`popover-item${n.read ? '' : ' unread'}`} onClick={() => !n.read && markRead(n._id)}>
                  <div className="notif-title">{n.title}</div>
                  <div className="notif-msg">{n.message}</div>
                  <div className="notif-time">{timeAgo(n.createdAt)}</div>
                </div>
              ))
            )}
          </div>
          <div className="popover-foot">
            <Link to="/inbox" onClick={() => setOpen(false)}>Open inbox</Link>
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
          <span className="user-chip-name" style={{ display: 'block' }}>{user?.name}</span>
          <span className="user-chip-role">{ROLE_LABELS[user?.role] || user?.role}</span>
        </span>
      </button>
      {open ? (
        <div className="popover" style={{ width: 240 }}>
          <div className="popover-head" style={{ display: 'block' }}>
            <div className="notif-title">{user?.name}</div>
            <div className="notif-msg">{user?.email}</div>
          </div>
          <button type="button" className="menu-item danger" onClick={onLogout}>
            <IconLogout size={16} /> Sign out
          </button>
        </div>
      ) : null}
    </div>
  );
}

function ZoneSidebar({ items, unread, onLogout, showSearch }) {
  const location = useLocation();
  const [menuQuery, setMenuQuery] = useState('');
  const [openIds, setOpenIds] = useState({});

  useEffect(() => {
    const active = items.find((n) =>
      n.children?.some((c) => location.pathname === c.to || (c.to !== '/' && location.pathname.startsWith(c.to)))
    );
    if (active) setOpenIds((prev) => ({ ...prev, [active.id]: true }));
  }, [location.pathname, items]);

  const filtered = useMemo(() => {
    const q = menuQuery.trim().toLowerCase();
    if (!q) return items;
    return items
      .map((item) => {
        if (item.type === 'section') return item;
        if (item.children) {
          const children = item.children.filter((c) => c.label.toLowerCase().includes(q));
          if (item.label.toLowerCase().includes(q) || children.length) {
            return { ...item, children: children.length ? children : item.children };
          }
          return null;
        }
        if (item.label?.toLowerCase().includes(q)) return item;
        return null;
      })
      .filter(Boolean);
  }, [items, menuQuery]);

  function toggle(id) {
    setOpenIds((prev) => ({ ...prev, [id]: !prev[id] }));
  }

  return (
    <nav className="nav admin-nav">
      {showSearch ? (
        <div className="nav-search-wrap">
          <input
            className="nav-search"
            placeholder="Search Menu…"
            value={menuQuery}
            onChange={(e) => setMenuQuery(e.target.value)}
          />
        </div>
      ) : null}

      {filtered.map((item, idx) => {
        if (item.type === 'section') {
          return (
            <div key={`sec-${idx}-${item.label}`} className="nav-section-label">
              {item.label}
            </div>
          );
        }

        if (item.action === 'logout') {
          return (
            <button key={item.id} type="button" className="nav-item nav-logout" onClick={onLogout}>
              <span className="nav-ico">{ICON_MAP[item.icon] || '•'}</span>
              <span>{item.label}</span>
            </button>
          );
        }

        if (!item.children) {
          return (
            <NavLink
              key={item.id || item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}
            >
              <span className="nav-ico">{ICON_MAP[item.icon] || '•'}</span>
              <span>{item.label}</span>
            </NavLink>
          );
        }

        const expanded = menuQuery ? true : !!openIds[item.id];
        const childActive = item.children.some(
          (c) => location.pathname === c.to || (c.to.length > 1 && location.pathname.startsWith(c.to))
        );

        return (
          <div key={item.id} className={`nav-accordion${expanded ? ' open' : ''}${childActive ? ' has-active' : ''}`}>
            <button type="button" className="nav-parent" onClick={() => toggle(item.id)}>
              <span className="nav-ico">{ICON_MAP[item.icon] || '•'}</span>
              <span className="nav-parent-label">{item.label}</span>
              <span className="nav-chevron">{expanded ? '▾' : '▸'}</span>
            </button>
            {expanded ? (
              <div className="nav-children">
                {item.children.map((child) => (
                  <NavLink
                    key={child.to}
                    to={child.to}
                    className={({ isActive }) => `nav-child${isActive ? ' active' : ''}`}
                  >
                    <span className="nav-child-mark">»</span>
                    <span>{child.label}</span>
                    {child.to === '/inbox' && unread > 0 ? <span className="nav-badge">{unread}</span> : null}
                  </NavLink>
                ))}
              </div>
            ) : null}
          </div>
        );
      })}
    </nav>
  );
}

function SimpleSidebar({ groups, unread }) {
  return (
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
              {item.badge === 'inbox' && unread > 0 ? <span className="nav-badge">{unread}</span> : null}
            </NavLink>
          ))}
        </div>
      ))}
    </nav>
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

  const isAdmin = user?.role === 'admin';
  const isTeacher = user?.role === 'teacher';
  const isAccountant = user?.role === 'accountant';
  const isStudent = user?.role === 'student';
  const isParent = user?.role === 'parent';
  const groups = useMemo(() => navForRole(user?.role), [user?.role]);
  const unread = inbox.filter((n) => !n.read).length;

  useEffect(() => {
    setSidebarOpen(false);
  }, [location.pathname]);

  const pageTitle = useMemo(() => {
    if (isAdmin) {
      const meta = findAdminPageMeta(location.pathname);
      if (meta) return meta.label;
      if (location.pathname === '/') return 'Admin Zone';
    }
    if (isTeacher) {
      const meta = findTeacherPageMeta(location.pathname);
      if (meta) return meta.label;
      if (location.pathname === '/') return 'Teacher Zone';
    }
    if (isAccountant) {
      const meta = findAccountantPageMeta(location.pathname);
      if (meta) return meta.label;
      if (location.pathname === '/') return 'Accounts Zone';
      if (location.pathname === '/fees') return 'Collect Fees';
    }
    if (isStudent) {
      const meta = findStudentPageMeta(location.pathname);
      if (meta) return meta.label;
      if (location.pathname === '/') return 'Dashboard';
      if (location.pathname === '/fees') return 'Fee Payments';
      if (location.pathname === '/attendance') return 'Attendance';
      if (location.pathname === '/homework') return 'Homework';
      if (location.pathname === '/exams') return 'Exams & Reports';
      if (location.pathname === '/notices') return 'Notice Board';
      if (location.pathname === '/transport/live') return 'Transport Tracking';
    }
    if (isParent) {
      const meta = findParentPageMeta(location.pathname);
      if (meta) return meta.label;
      if (location.pathname === '/') return 'Dashboard';
      if (location.pathname === '/fees') return 'Fee Payments';
      if (location.pathname === '/homework') return 'Homework';
      if (location.pathname === '/notices') return 'Notice Board';
      if (location.pathname === '/transport/live') return 'Transport Tracking';
    }
    const flat = groups.flatMap((g) => g.items);
    const match =
      flat.find((i) => i.to !== '/' && location.pathname.startsWith(i.to)) ||
      flat.find((i) => i.to === location.pathname);
    return match?.label || 'Dashboard';
  }, [groups, location.pathname, isAdmin, isTeacher, isAccountant, isStudent, isParent]);

  async function handleLogout() {
    try {
      await logoutServer().unwrap();
    } catch {
      /* ignore */
    }
    disconnectSocket();
    dispatch(logout());
    navigate('/login', { replace: true });
  }

  const zoneClass = isAdmin || isTeacher || isAccountant || isStudent || isParent ? ' admin-shell' : '';
  const zoneTag = isAdmin
    ? 'Admin Zone'
    : isTeacher
      ? 'Teacher Zone'
      : isAccountant
        ? 'Accounts Zone'
        : isStudent
          ? 'Student Portal'
          : isParent
            ? 'Parent Portal'
            : 'ERP Portal';

  return (
    <div className={`shell${zoneClass}`}>
      <aside className={`sidebar${sidebarOpen ? ' open' : ''}`}>
        <div className="sidebar-brand">
          <div className="brand-mark">XC</div>
          <div style={{ minWidth: 0 }}>
            <div className="brand-name">{schoolName || 'XYZ Convent School'}</div>
            <div className="brand-tag">{zoneTag}</div>
          </div>
        </div>

        {isAdmin ? (
          <ZoneSidebar items={ADMIN_NAV} unread={unread} onLogout={handleLogout} />
        ) : isTeacher ? (
          <ZoneSidebar items={TEACHER_NAV} unread={unread} onLogout={handleLogout} showSearch />
        ) : isAccountant ? (
          <ZoneSidebar items={ACCOUNTANT_NAV} unread={unread} onLogout={handleLogout} showSearch />
        ) : isStudent ? (
          <ZoneSidebar items={STUDENT_NAV} unread={unread} onLogout={handleLogout} showSearch />
        ) : isParent ? (
          <ZoneSidebar items={PARENT_NAV} unread={unread} onLogout={handleLogout} showSearch />
        ) : (
          <SimpleSidebar groups={groups} unread={unread} />
        )}

        <div className="sidebar-foot">
          {ROLE_LABELS[user?.role] || user?.role} · v2.0
        </div>
      </aside>

      {sidebarOpen ? <div className="scrim" onClick={() => setSidebarOpen(false)} /> : null}

      <div className="main">
        <header className="topbar no-print">
          <button type="button" className="icon-btn hamburger" onClick={() => setSidebarOpen(true)} aria-label="Open navigation">
            <IconMenu size={20} />
          </button>
          <div className="topbar-title">{pageTitle}</div>
          <div className="topbar-spacer" />
          <span className="topbar-school muted no-mobile">{schoolName}</span>
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
