import { useCallback, useEffect, useRef, useState } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { useGetAttendanceTodayQuery, useScanQrAttendanceMutation } from '../app/api';
import {
  Alert,
  Avatar,
  Badge,
  Card,
  EmptyState,
  PageHeader,
  StatCard,
  errorText,
  fmtTime,
  todayISO,
} from '../components/ui';
import { IconAlert, IconCheck, IconCheckSquare, IconQr } from '../components/Icons';

const READER_ID = 'qr-reader';
const RESCAN_COOLDOWN_MS = 3500;

/** QR images encode the signed JWT directly, but tolerate JSON wrappers too. */
function extractToken(decodedText) {
  const text = String(decodedText || '').trim();
  if (!text) return '';
  if (text.startsWith('{')) {
    try {
      const obj = JSON.parse(text);
      return obj.token || obj.qrToken || obj.t || text;
    } catch {
      return text;
    }
  }
  return text;
}

export default function QrScannerPage() {
  const [scanQr] = useScanQrAttendanceMutation();

  const [session, setSession] = useState('morning');
  const [status, setStatus] = useState('present');
  const [cameras, setCameras] = useState([]);
  const [cameraId, setCameraId] = useState('');
  const [scanning, setScanning] = useState(false);
  const [starting, setStarting] = useState(false);
  const [cameraError, setCameraError] = useState('');
  const [result, setResult] = useState(null);
  const [log, setLog] = useState([]);

  const scannerRef = useRef(null);
  const lastScanRef = useRef({ token: '', at: 0 });
  // Latest control values, readable from the html5-qrcode callback closure.
  const optionsRef = useRef({ session, status });
  optionsRef.current = { session, status };

  const { data: summary, refetch: refetchSummary } = useGetAttendanceTodayQuery({
    date: todayISO(),
    session,
  });

  useEffect(() => {
    Html5Qrcode.getCameras()
      .then((devices) => {
        setCameras(devices || []);
        if (devices?.length) {
          const back = devices.find((d) => /back|rear|environment/i.test(d.label));
          setCameraId((back || devices[devices.length - 1]).id);
        } else {
          setCameraError('No camera detected on this device.');
        }
      })
      .catch((err) => {
        setCameraError(
          err?.message?.includes('Permission')
            ? 'Camera permission denied. Allow camera access in your browser settings and reload.'
            : `Unable to list cameras: ${err?.message || err}`
        );
      });
  }, []);

  const handleDecoded = useCallback(
    async (decodedText) => {
      const token = extractToken(decodedText);
      if (!token) return;

      const now = Date.now();
      if (lastScanRef.current.token === token && now - lastScanRef.current.at < RESCAN_COOLDOWN_MS) {
        return;
      }
      lastScanRef.current = { token, at: now };

      try {
        const res = await scanQr({
          token,
          session: optionsRef.current.session,
          status: optionsRef.current.status,
        }).unwrap();

        const entry = {
          id: `${res.student?.id || token.slice(-8)}-${now}`,
          ok: true,
          name: res.student?.name || 'Student',
          detail: `${res.student?.admissionId || ''} · Class ${res.student?.className || '—'}${
            res.student?.section ? `-${res.student.section}` : ''
          }`,
          status: res.attendance?.status || optionsRef.current.status,
          photoUrl: res.student?.photoUrl,
          at: new Date().toISOString(),
        };
        setResult(entry);
        setLog((l) => [entry, ...l].slice(0, 50));
        refetchSummary();
      } catch (err) {
        const entry = {
          id: `err-${now}`,
          ok: false,
          name: 'Scan rejected',
          detail: errorText(err),
          at: new Date().toISOString(),
        };
        setResult(entry);
        setLog((l) => [entry, ...l].slice(0, 50));
      }
    },
    [scanQr, refetchSummary]
  );

  const stop = useCallback(async () => {
    const scanner = scannerRef.current;
    if (!scanner) return;
    try {
      if (scanner.isScanning) await scanner.stop();
      scanner.clear();
    } catch {
      /* scanner already torn down */
    }
    scannerRef.current = null;
    setScanning(false);
  }, []);

  async function start() {
    if (scannerRef.current || !cameraId) return;
    setCameraError('');
    setStarting(true);
    try {
      const scanner = new Html5Qrcode(READER_ID, { verbose: false });
      scannerRef.current = scanner;
      await scanner.start(
        cameraId,
        { fps: 10, qrbox: { width: 260, height: 260 }, aspectRatio: 1.3333 },
        handleDecoded,
        () => {
          /* per-frame decode misses are expected — ignore */
        }
      );
      setScanning(true);
    } catch (err) {
      scannerRef.current = null;
      setCameraError(`Could not start the camera: ${err?.message || err}`);
    } finally {
      setStarting(false);
    }
  }

  useEffect(() => () => {
    const scanner = scannerRef.current;
    if (scanner?.isScanning) scanner.stop().catch(() => {});
  }, []);

  const successCount = log.filter((l) => l.ok).length;

  return (
    <div className="page">
      <PageHeader
        title="QR attendance scanner"
        subtitle="Point the camera at a student ID card. Scanning runs continuously."
        actions={
          scanning ? (
            <button type="button" className="btn btn-danger" onClick={stop}>
              Stop scanner
            </button>
          ) : (
            <button type="button" className="btn" onClick={start} disabled={starting || !cameraId}>
              {starting ? <span className="spinner" /> : <IconQr size={16} />}
              {starting ? 'Starting…' : 'Start scanner'}
            </button>
          )
        }
      />

      <div className="stat-grid">
        <StatCard label="Scanned this session" value={successCount} tone="green" icon={<IconCheck size={20} />} />
        <StatCard label="Present today" value={summary?.present ?? 0} tone="green" icon={<IconCheckSquare size={20} />} />
        <StatCard label="Marked today" value={summary?.marked ?? 0} icon={<IconCheckSquare size={20} />} />
        <StatCard label="Still unmarked" value={summary?.unmarked ?? 0} tone="amber" icon={<IconAlert size={20} />} />
      </div>

      <div className="split-map">
        <Card title="Camera" subtitle={scanning ? 'Live — hold the QR steady in frame' : 'Idle'}>
          <div className="stack">
            {cameraError ? <Alert kind="error">{cameraError}</Alert> : null}

            <div className="toolbar">
              <select
                className="select"
                style={{ width: 200 }}
                value={cameraId}
                onChange={(e) => setCameraId(e.target.value)}
                disabled={scanning}
              >
                {cameras.length === 0 ? <option value="">No camera found</option> : null}
                {cameras.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.label || 'Camera'}
                  </option>
                ))}
              </select>

              <select className="select" style={{ width: 150 }} value={session} onChange={(e) => setSession(e.target.value)}>
                <option value="morning">Morning</option>
                <option value="afternoon">Afternoon</option>
              </select>

              <select className="select" style={{ width: 150 }} value={status} onChange={(e) => setStatus(e.target.value)}>
                <option value="present">Mark present</option>
                <option value="late">Mark late</option>
                <option value="absent">Mark absent</option>
              </select>
            </div>

            <div className="scanner-frame">
              <div id={READER_ID} style={{ width: '100%' }} />
              {!scanning && !starting ? (
                <div style={{ position: 'absolute', textAlign: 'center', color: 'rgba(255,255,255,0.6)', padding: 24 }}>
                  <IconQr size={40} />
                  <p style={{ fontSize: 13.5, marginTop: 10 }}>
                    Camera is off. Press <span className="kbd">Start scanner</span> to begin.
                  </p>
                </div>
              ) : null}
            </div>

            {result ? (
              <div className={`scan-result ${result.ok ? 'ok' : 'fail'}`}>
                {result.ok ? (
                  <Avatar name={result.name} src={result.photoUrl} size="lg" />
                ) : (
                  <div className="stat-icon red" style={{ width: 46, height: 46, flex: '0 0 46px' }}>
                    <IconAlert size={22} />
                  </div>
                )}
                <div style={{ minWidth: 0 }}>
                  <div className="t-strong" style={{ fontSize: 16 }}>{result.name}</div>
                  <div className="t-muted" style={{ fontSize: 13 }}>{result.detail}</div>
                  {result.ok ? (
                    <div style={{ marginTop: 6 }}>
                      <Badge value={result.status} /> <span className="t-muted" style={{ fontSize: 12 }}>at {fmtTime(result.at)}</span>
                    </div>
                  ) : null}
                </div>
              </div>
            ) : null}

            <p className="field-hint">
              QR tokens are short-lived and version-bound. If a scan is rejected as revoked, regenerate the
              student's QR from their ID card page.
            </p>
          </div>
        </Card>

        <Card title="Scan log" subtitle={`${log.length} events`} tight>
          <div className="scan-log">
            {log.length === 0 ? (
              <EmptyState icon={<IconQr size={22} />} title="Nothing scanned yet" text="Successful and rejected scans are listed here." />
            ) : (
              log.map((entry) => (
                <div className="list-line" key={entry.id}>
                  <div
                    className="stat-icon"
                    style={{
                      width: 30,
                      height: 30,
                      flex: '0 0 30px',
                      borderRadius: 8,
                      background: entry.ok ? 'var(--green-soft)' : 'var(--red-soft)',
                      color: entry.ok ? 'var(--green)' : 'var(--red)',
                    }}
                  >
                    {entry.ok ? <IconCheck size={15} /> : <IconAlert size={15} />}
                  </div>
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div className="t-strong" style={{ fontSize: 13.5 }}>{entry.name}</div>
                    <div className="t-muted" style={{ fontSize: 12 }}>{entry.detail}</div>
                  </div>
                  <span className="t-muted" style={{ fontSize: 11.5, whiteSpace: 'nowrap' }}>
                    {fmtTime(entry.at)}
                  </span>
                </div>
              ))
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}
