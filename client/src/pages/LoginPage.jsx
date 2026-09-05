import { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import { useDemoAccountsQuery, useLoginMutation } from '../app/api';
import { selectIsAuthenticated, setCredentials } from '../features/auth/authSlice';
import { Alert, errorText } from '../components/ui';
import {
  IconBus,
  IconCheckSquare,
  IconIdCard,
  IconQr,
  IconRupee,
  IconShield,
  IconSteering,
  IconTeacher,
  IconUser,
  IconUsers,
} from '../components/Icons';

const FALLBACK_ACCOUNTS = [
  { role: 'admin', email: 'admin@xyzconvent.edu', password: 'admin123' },
  { role: 'teacher', email: 'teacher@xyzconvent.edu', password: 'teacher123' },
  { role: 'accountant', email: 'accounts@xyzconvent.edu', password: 'accounts123' },
  { role: 'student', email: 'student@xyzconvent.edu', password: 'student123' },
  { role: 'parent', email: 'parent@xyzconvent.edu', password: 'parent123' },
  { role: 'driver', email: 'driver@xyzconvent.edu', password: 'driver123' },
];

const ROLE_ICONS = {
  admin: <IconShield size={18} />,
  teacher: <IconTeacher size={18} />,
  accountant: <IconRupee size={18} />,
  student: <IconUser size={18} />,
  parent: <IconUsers size={18} />,
  driver: <IconSteering size={18} />,
};

const HIGHLIGHTS = [
  { icon: <IconQr size={16} />, text: 'QR-based attendance in seconds — scan, mark, notify.' },
  { icon: <IconBus size={16} />, text: 'Live GPS bus tracking for admins and parents.' },
  { icon: <IconRupee size={16} />, text: 'Fee collection, receipts and automated reminders.' },
  { icon: <IconIdCard size={16} />, text: 'Printable student ID cards with secure QR tokens.' },
  { icon: <IconCheckSquare size={16} />, text: 'Exams, homework and leave workflows in one place.' },
];

export default function LoginPage() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const location = useLocation();
  const isAuthenticated = useSelector(selectIsAuthenticated);

  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [formError, setFormError] = useState('');

  const [login, { isLoading }] = useLoginMutation();
  const { data: demoAccounts } = useDemoAccountsQuery();
  const accounts = demoAccounts?.length ? demoAccounts : FALLBACK_ACCOUNTS;

  useEffect(() => {
    document.title = 'Sign in · XYZ Convent School';
  }, []);

  if (isAuthenticated) {
    return <Navigate to={location.state?.from?.pathname || '/'} replace />;
  }

  async function submit(creds) {
    setFormError('');
    try {
      const data = await login(creds).unwrap();
      dispatch(setCredentials(data));
      navigate(location.state?.from?.pathname || '/', { replace: true });
    } catch (err) {
      setFormError(errorText(err));
    }
  }

  function handleSubmit(e) {
    e.preventDefault();
    if (!identifier.trim() || !password) {
      setFormError('Enter your email / admission ID and password.');
      return;
    }
    submit({ identifier: identifier.trim(), password });
  }

  function quickAccess(account) {
    setIdentifier(account.email);
    setPassword(account.password);
    submit({ identifier: account.email, password: account.password, role: account.role });
  }

  return (
    <div className="login">
      <aside className="login-aside">
        <div className="login-brand">
          <div className="brand-mark" style={{ width: 42, height: 42, flex: '0 0 42px', fontSize: 17 }}>
            XC
          </div>
          <div>
            <div className="brand-name" style={{ fontSize: 17 }}>
              XYZ Convent School
            </div>
            <div className="brand-tag">Est. 1998 · CBSE Affiliated</div>
          </div>
        </div>

        <div className="login-hero">
          <h1>
            One portal for the
            <br />
            whole school day.
          </h1>
          <p>
            Attendance, fees, transport, exams and communication — managed together for staff,
            students, parents and drivers.
          </p>

          <div className="login-points">
            {HIGHLIGHTS.map((h) => (
              <div className="login-point" key={h.text}>
                <span className="login-point-icon">{h.icon}</span>
                <span>{h.text}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="login-foot">
          Sector 12, Dwarka, New Delhi 110078 · +91-11-4000-1234
        </div>
      </aside>

      <section className="login-panel">
        <form className="login-form" onSubmit={handleSubmit}>
          <div>
            <div className="login-eyebrow">School ERP</div>
            <h2 style={{ fontSize: 27, marginTop: 6 }}>Welcome back</h2>
            <p className="page-sub">Sign in with your school email or admission ID.</p>
          </div>

          {formError ? <Alert kind="error">{formError}</Alert> : null}

          <div className="field">
            <label htmlFor="identifier">Email or Admission ID</label>
            <input
              id="identifier"
              className="input"
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              placeholder="name@xyzconvent.edu"
              autoComplete="username"
              autoFocus
            />
          </div>

          <div className="field">
            <label htmlFor="password">Password</label>
            <div style={{ position: 'relative' }}>
              <input
                id="password"
                className="input"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                autoComplete="current-password"
                style={{ paddingRight: 62 }}
              />
              <button
                type="button"
                className="btn btn-ghost btn-sm"
                onClick={() => setShowPassword((v) => !v)}
                style={{ position: 'absolute', right: 4, top: 4 }}
              >
                {showPassword ? 'Hide' : 'Show'}
              </button>
            </div>
          </div>

          <button type="submit" className="btn btn-lg btn-block" disabled={isLoading}>
            {isLoading ? <span className="spinner" /> : null}
            {isLoading ? 'Signing in…' : 'Sign in'}
          </button>

          <div className="login-divider">Quick access</div>

          <div className="quick-grid">
            {accounts.map((account) => (
              <button
                key={account.role}
                type="button"
                className="quick-btn"
                onClick={() => quickAccess(account)}
                disabled={isLoading}
                title={`${account.email} / ${account.password}`}
              >
                <span className="quick-ic">{ROLE_ICONS[account.role] || <IconUser size={18} />}</span>
                <span>{account.role}</span>
              </button>
            ))}
          </div>

          <p className="field-hint" style={{ textAlign: 'center' }}>
            Demo environment — quick access signs you in with seeded credentials.
          </p>
        </form>
      </section>
    </div>
  );
}
