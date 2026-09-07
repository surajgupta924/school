import { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { QRCodeSVG } from 'qrcode.react';
import {
  useGenerateStudentQrMutation,
  useGetIdCardQuery,
  useGetStatsQuery,
  useGetStudentsQuery,
} from '../app/api';
import { selectUser } from '../features/auth/authSlice';
import {
  Alert,
  Card,
  EmptyState,
  ErrorState,
  PageHeader,
  SearchInput,
  Spinner,
  errorText,
  fmtDate,
  useToast,
} from '../components/ui';
import { IconDownload, IconIdCard, IconPrint, IconRefresh, IconUsers } from '../components/Icons';

export default function IdCardPage() {
  const { studentId: routeId } = useParams();
  const user = useSelector(selectUser);
  const navigate = useNavigate();

  const isStaff = ['admin', 'teacher'].includes(user?.role);
  const selfId = user?.role === 'student' ? user.id : null;
  const studentId = routeId || selfId;

  if (!studentId) {
    return isStaff ? <StudentPicker /> : <ChildPicker onPick={(id) => navigate(`/id-card/${id}`)} />;
  }

  return <IdCardView studentId={studentId} canRotate={isStaff || user?.role === 'student'} />;
}

/* ─────────────── Pickers ─────────────── */

function StudentPicker() {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [debouncedQ, setDebouncedQ] = useState('');

  useEffect(() => {
    const t = setTimeout(() => setDebouncedQ(search.trim()), 300);
    return () => clearTimeout(t);
  }, [search]);

  const { data, isLoading, error, refetch } = useGetStudentsQuery({
    page: 1,
    limit: 40,
    q: debouncedQ || undefined,
  });
  const rows = data?.students || [];

  return (
    <div className="page">
      <PageHeader title="Student ID cards" subtitle="Pick a student to generate a printable ID card with QR attendance token" />
      <Card tight>
        <div style={{ padding: 14, borderBottom: '1px solid var(--line)' }}>
          <SearchInput value={search} onChange={setSearch} placeholder="Search by name, admission ID or class…" />
        </div>
        {isLoading ? (
          <Spinner />
        ) : error ? (
          <ErrorState error={error} onRetry={refetch} />
        ) : rows.length === 0 ? (
          <EmptyState icon={<IconUsers size={22} />} title="No students found" text="Try a different search term." />
        ) : (
          rows.map((s) => (
            <div className="list-line" key={s.id}>
              <div style={{ minWidth: 0, flex: 1 }}>
                <div className="t-strong">{s.name}</div>
                <div className="t-muted" style={{ fontSize: 12.5 }}>
                  {s.admissionId} · Class {s.className || '—'}
                  {s.section ? `-${s.section}` : ''}
                </div>
              </div>
              <button type="button" className="btn btn-secondary btn-sm" onClick={() => navigate(`/id-card/${s.id}`)}>
                <IconIdCard size={15} /> Open card
              </button>
            </div>
          ))
        )}
      </Card>
    </div>
  );
}

function ChildPicker({ onPick }) {
  const { data: stats, isLoading } = useGetStatsQuery();
  const children = stats?.children || [];

  if (isLoading) return <Spinner />;

  return (
    <div className="page">
      <PageHeader title="ID cards" subtitle="Select a child to view their school ID card" />
      <Card tight>
        {children.length === 0 ? (
          <EmptyState
            icon={<IconIdCard size={22} />}
            title="No students linked"
            text="Ask the school office to link your children to this parent account."
          />
        ) : (
          children.map((c) => (
            <div className="list-line" key={c.id}>
              <div style={{ minWidth: 0, flex: 1 }}>
                <div className="t-strong">{c.name}</div>
                <div className="t-muted" style={{ fontSize: 12.5 }}>
                  {c.admissionId} · Class {c.className || '—'}
                  {c.section ? `-${c.section}` : ''}
                </div>
              </div>
              <button type="button" className="btn btn-secondary btn-sm" onClick={() => onPick(c.id)}>
                Open card
              </button>
            </div>
          ))
        )}
      </Card>
    </div>
  );
}

/* ─────────────── Card ─────────────── */

function IdCardView({ studentId, canRotate }) {
  const toast = useToast();
  const { data: idCard, isLoading, error, refetch } = useGetIdCardQuery(studentId);
  const [generateQr, { isLoading: rotating }] = useGenerateStudentQrMutation();
  const [qrToken, setQrToken] = useState('');
  const qrWrapRef = useRef(null);

  useEffect(() => {
    if (idCard?.qr?.token) setQrToken(idCard.qr.token);
  }, [idCard]);

  // QR tokens are short-lived; silently refresh them while the page stays open.
  useEffect(() => {
    if (!studentId) return undefined;
    const timer = setInterval(async () => {
      try {
        const qr = await generateQr({ studentId }).unwrap();
        if (qr?.token) setQrToken(qr.token);
      } catch {
        /* keep showing the previous token */
      }
    }, 4 * 60 * 1000);
    return () => clearInterval(timer);
  }, [studentId, generateQr]);

  async function rotateToken() {
    try {
      const qr = await generateQr({ studentId, rotate: true }).unwrap();
      setQrToken(qr.token);
      toast.success('QR regenerated — older printed codes are now invalid');
    } catch (err) {
      toast.error(errorText(err));
    }
  }

  async function refreshToken() {
    try {
      const qr = await generateQr({ studentId }).unwrap();
      setQrToken(qr.token);
      toast.success('QR refreshed');
    } catch (err) {
      toast.error(errorText(err));
    }
  }

  function downloadQr() {
    const svg = qrWrapRef.current?.querySelector('svg');
    if (!svg) return;

    const size = 640;
    const serialized = new XMLSerializer().serializeToString(svg);
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = size;
      canvas.height = size;
      const ctx = canvas.getContext('2d');
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, size, size);
      ctx.drawImage(img, 0, 0, size, size);
      const link = document.createElement('a');
      link.download = `${student?.admissionId || 'student'}-qr.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
    };
    img.src = `data:image/svg+xml;base64,${window.btoa(unescape(encodeURIComponent(serialized)))}`;
  }

  if (isLoading) return <Spinner label="Building ID card…" />;
  if (error) return <ErrorState error={error} onRetry={refetch} />;
  if (!idCard) return <EmptyState title="ID card unavailable" text="This student record could not be loaded." />;

  const student = idCard.student;

  return (
    <div className="page">
      <PageHeader
        title="Student ID card"
        subtitle={`${student.name} · ${student.admissionId || 'No admission ID'}`}
        actions={
          <>
            <button type="button" className="btn btn-secondary" onClick={refreshToken} disabled={rotating}>
              <IconRefresh /> Refresh QR
            </button>
            <button type="button" className="btn btn-secondary" onClick={downloadQr}>
              <IconDownload size={16} /> Download QR
            </button>
            <button type="button" className="btn" onClick={() => window.print()}>
              <IconPrint size={16} /> Print card
            </button>
          </>
        }
      />

      <Alert kind="info">
        The QR encodes a signed, short-lived attendance token. Teachers scan it from the QR scanner page to
        mark attendance instantly.
      </Alert>

      <div className="idcard-stage">
        {/* Front */}
        <div className="idcard">
          <div className="idcard-top">
            <div className="idcard-school">{idCard.schoolName || 'XYZ Convent School'}</div>
            <div className="idcard-affil">Affiliation {idCard.affiliationNo || '—'}</div>
          </div>
          <div className="idcard-strip">Student Identity Card · {idCard.academicYear || '2025-26'}</div>

          <div className="idcard-photo">
            {student.photoUrl ? (
              <img src={student.photoUrl} alt={student.name} />
            ) : (
              student.name?.slice(0, 1)?.toUpperCase() || '?'
            )}
          </div>

          <div className="idcard-name">{student.name}</div>
          <div className="idcard-class">
            Class {student.className || '—'}
            {student.section ? ` – ${student.section}` : ''}
          </div>

          <div className="idcard-rows">
            <div className="idcard-row">
              <span>Admission ID</span>
              <span>{student.admissionId || '—'}</span>
            </div>
            <div className="idcard-row">
              <span>Date of birth</span>
              <span>{fmtDate(student.dob)}</span>
            </div>
            <div className="idcard-row">
              <span>Blood group</span>
              <span>{student.bloodGroup || '—'}</span>
            </div>
            <div className="idcard-row">
              <span>Valid till</span>
              <span>31 Mar {(idCard.academicYear || '2025-26').split('-')[0] * 1 + 1}</span>
            </div>
          </div>

          <div className="idcard-qr" ref={qrWrapRef}>
            <div className="idcard-qr-box">
              {qrToken ? (
                <QRCodeSVG value={qrToken} size={124} level="M" includeMargin={false} />
              ) : (
                <div style={{ width: 124, height: 124 }} className="skeleton" />
              )}
            </div>
            <div className="idcard-qr-note">SCAN FOR ATTENDANCE · TOKEN ROTATES AUTOMATICALLY</div>
          </div>

          <div className="idcard-foot">
            <span>{idCard.address || 'Sector 12, Dwarka, New Delhi'}</span>
            <span>ID-{String(student.id).slice(-6).toUpperCase()}</span>
          </div>
        </div>

        {/* Back */}
        <div className="idcard">
          <div className="idcard-top">
            <div className="idcard-school">Terms of use</div>
            <div className="idcard-affil">Property of the school</div>
          </div>
          <div className="idcard-strip">If found, please return</div>

          <div className="idcard-back-body">
            <ol className="idcard-rules">
              <li>This card must be carried on the school premises at all times.</li>
              <li>The card is non-transferable and remains school property.</li>
              <li>Report loss immediately to the school office; a duplicate fee applies.</li>
              <li>Present the card at the gate, library and on the school bus.</li>
              <li>Defacing or altering the card invalidates it.</li>
            </ol>

            <div style={{ borderTop: '1px dashed var(--line)', paddingTop: 10 }}>
              <div className="idcard-row">
                <span>Address</span>
                <span style={{ maxWidth: 170 }}>{student.address || idCard.address || '—'}</span>
              </div>
              <div className="idcard-row">
                <span>School phone</span>
                <span>+91-11-4000-1234</span>
              </div>
              <div className="idcard-row">
                <span>Emergency</span>
                <span>112</span>
              </div>
            </div>

            <div className="idcard-sign">
              <div style={{ height: 26 }} />
              <div style={{ borderTop: '1px solid var(--ink-3)', display: 'inline-block', paddingTop: 4 }}>
                Principal's signature
              </div>
            </div>
          </div>

          <div className="idcard-foot">
            <span>{idCard.schoolName || 'XYZ Convent School'}</span>
            <span>{idCard.academicYear || '2025-26'}</span>
          </div>
        </div>
      </div>

      {canRotate ? (
        <Card title="QR security" subtitle="Rotating invalidates every previously printed QR for this student" className="no-print">
          <div className="row between">
            <span className="t-muted" style={{ fontSize: 13.5, maxWidth: '60ch' }}>
              Use this if a card is lost or the QR has been photographed and shared. The student must be issued a
              freshly printed card afterwards.
            </span>
            <button type="button" className="btn btn-danger" onClick={rotateToken} disabled={rotating}>
              {rotating ? <span className="spinner" /> : null}
              Rotate QR token
            </button>
          </div>
        </Card>
      ) : null}
    </div>
  );
}
