import { useEffect, useMemo, useState } from 'react';
import { useSelector } from 'react-redux';
import {
  useCreateExamMutation,
  useDeleteExamMutation,
  useGetExamResultsQuery,
  useGetExamsQuery,
  useGetStudentsQuery,
  useSaveExamResultsMutation,
} from '../app/api';
import { selectRole } from '../features/auth/authSlice';
import {
  Alert,
  Badge,
  Card,
  ConfirmDialog,
  DataTable,
  EmptyState,
  Input,
  Modal,
  PageHeader,
  Person,
  SearchInput,
  Select,
  Textarea,
  errorText,
  fmtDate,
  todayISO,
  useToast,
} from '../components/ui';
import { IconCalendar, IconChart, IconPlus, IconTrash } from '../components/Icons';

const EMPTY = {
  title: '',
  subject: '',
  className: '',
  section: '',
  examDate: todayISO(),
  maxMarks: 100,
  durationMinutes: 90,
  instructions: '',
};

export default function ExamsPage() {
  const role = useSelector(selectRole);
  const canManage = ['admin', 'teacher'].includes(role);
  const toast = useToast();

  const { data: exams = [], isLoading, error, refetch } = useGetExamsQuery();
  const [createExam, { isLoading: creating }] = useCreateExamMutation();
  const [deleteExam, { isLoading: deleting }] = useDeleteExamMutation();

  const [search, setSearch] = useState('');
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(EMPTY);
  const [formError, setFormError] = useState('');
  const [confirm, setConfirm] = useState(null);
  const [resultsFor, setResultsFor] = useState(null);

  const rows = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return exams;
    return exams.filter((e) =>
      [e.title, e.subject, e.className, e.section].filter(Boolean).some((v) => String(v).toLowerCase().includes(q))
    );
  }, [exams, search]);

  const upcoming = exams.filter((e) => new Date(e.examDate) >= new Date()).length;

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  async function submit(e) {
    e.preventDefault();
    setFormError('');
    if (!form.title.trim() || !form.subject.trim() || !form.className.trim() || !form.examDate) {
      setFormError('Title, subject, class and exam date are required.');
      return;
    }
    try {
      await createExam({
        ...form,
        maxMarks: Number(form.maxMarks) || 100,
        durationMinutes: Number(form.durationMinutes) || undefined,
      }).unwrap();
      toast.success('Exam scheduled');
      setOpen(false);
      setForm(EMPTY);
    } catch (err) {
      setFormError(errorText(err));
    }
  }

  async function handleDelete() {
    try {
      await deleteExam(confirm._id).unwrap();
      toast.success('Exam deleted');
      setConfirm(null);
    } catch (err) {
      toast.error(errorText(err));
    }
  }

  const columns = [
    {
      key: 'title',
      header: 'Exam',
      render: (e) => (
        <div>
          <div className="t-strong">{e.title}</div>
          <div className="t-muted" style={{ fontSize: 12 }}>{e.subject}</div>
        </div>
      ),
    },
    {
      key: 'class',
      header: 'Class',
      render: (e) => `${e.className}${e.section ? `-${e.section}` : ''}`,
    },
    { key: 'examDate', header: 'Date', render: (e) => fmtDate(e.examDate) },
    { key: 'maxMarks', header: 'Max marks', align: 'right', render: (e) => e.maxMarks ?? 100 },
    { key: 'duration', header: 'Duration', render: (e) => (e.durationMinutes ? `${e.durationMinutes} min` : '—') },
    {
      key: 'when',
      header: 'Status',
      render: (e) => (
        <Badge tone={new Date(e.examDate) >= new Date() ? 'blue' : ''}>
          {new Date(e.examDate) >= new Date() ? 'Upcoming' : 'Completed'}
        </Badge>
      ),
    },
    {
      key: 'actions',
      header: '',
      align: 'right',
      render: (e) => (
        <div className="row-actions">
          <button type="button" className="btn btn-secondary btn-sm" onClick={() => setResultsFor(e)}>
            <IconChart size={15} /> Results
          </button>
          {role === 'admin' ? (
            <button type="button" className="btn btn-secondary btn-sm" onClick={() => setConfirm(e)}>
              <IconTrash />
            </button>
          ) : null}
        </div>
      ),
    },
  ];

  return (
    <div className="page">
      <PageHeader
        title="Exams"
        subtitle={`${exams.length} scheduled · ${upcoming} upcoming`}
        actions={
          canManage ? (
            <button type="button" className="btn" onClick={() => setOpen(true)}>
              <IconPlus size={16} /> Schedule exam
            </button>
          ) : null
        }
      />

      <Card tight>
        <div style={{ padding: 14, borderBottom: '1px solid var(--line)' }}>
          <SearchInput value={search} onChange={setSearch} placeholder="Search exams by title, subject or class…" />
        </div>
        <DataTable
          columns={columns}
          rows={rows}
          keyField="_id"
          loading={isLoading}
          error={error}
          onRetry={refetch}
          empty={
            <EmptyState
              icon={<IconCalendar size={22} />}
              title="No exams scheduled"
              text="Schedule an exam to publish the date sheet and record results."
              action={
                canManage ? (
                  <button type="button" className="btn" onClick={() => setOpen(true)}>
                    <IconPlus size={16} /> Schedule exam
                  </button>
                ) : null
              }
            />
          }
        />
      </Card>

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="Schedule exam"
        footer={
          <>
            <button type="button" className="btn btn-secondary" onClick={() => setOpen(false)}>
              Cancel
            </button>
            <button type="submit" form="exam-form" className="btn" disabled={creating}>
              {creating ? <span className="spinner" /> : null}
              Schedule
            </button>
          </>
        }
      >
        <form id="exam-form" onSubmit={submit} className="stack">
          {formError ? <Alert kind="error">{formError}</Alert> : null}
          <div className="form-grid">
            <Input label="Title *" value={form.title} onChange={set('title')} placeholder="Half-yearly examination" />
            <Input label="Subject *" value={form.subject} onChange={set('subject')} placeholder="Mathematics" />
            <Input label="Class *" value={form.className} onChange={set('className')} placeholder="10" />
            <Input label="Section" value={form.section} onChange={set('section')} placeholder="A" />
            <Input label="Exam date *" type="date" value={form.examDate} onChange={set('examDate')} />
            <Input label="Max marks" type="number" min="1" value={form.maxMarks} onChange={set('maxMarks')} />
            <Input label="Duration (minutes)" type="number" min="1" value={form.durationMinutes} onChange={set('durationMinutes')} />
            <Textarea span label="Instructions" value={form.instructions} onChange={set('instructions')} placeholder="Bring your own stationery…" />
          </div>
        </form>
      </Modal>

      <ResultsModal exam={resultsFor} onClose={() => setResultsFor(null)} canManage={canManage} />

      <ConfirmDialog
        open={Boolean(confirm)}
        title="Delete exam"
        message={`${confirm?.title} and all recorded results will be permanently deleted.`}
        confirmLabel="Delete"
        danger
        busy={deleting}
        onConfirm={handleDelete}
        onClose={() => setConfirm(null)}
      />
    </div>
  );
}

function ResultsModal({ exam, onClose, canManage }) {
  const toast = useToast();
  const { data: results = [], isLoading } = useGetExamResultsQuery(exam?._id, { skip: !exam });
  const { data: students = [] } = useGetStudentsQuery(undefined, { skip: !exam || !canManage });
  const [saveResults, { isLoading: saving }] = useSaveExamResultsMutation();
  const [marks, setMarks] = useState({});

  useEffect(() => {
    const seeded = {};
    for (const r of results) {
      const id = r.studentId?._id || r.studentId;
      if (id) seeded[id] = String(r.marksObtained);
    }
    setMarks(seeded);
  }, [results]);

  const roster = useMemo(() => {
    if (!exam) return [];
    return students.filter(
      (s) => s.className === exam.className && (!exam.section || s.section === exam.section)
    );
  }, [students, exam]);

  async function save() {
    const payload = Object.entries(marks)
      .filter(([, v]) => v !== '' && !Number.isNaN(Number(v)))
      .map(([studentId, v]) => ({ studentId, marksObtained: Number(v) }));

    if (!payload.length) {
      toast.error('Enter at least one mark.');
      return;
    }
    try {
      await saveResults({ id: exam._id, results: payload }).unwrap();
      toast.success(`Results published for ${payload.length} students`);
      onClose();
    } catch (err) {
      toast.error(errorText(err));
    }
  }

  if (!exam) return null;

  return (
    <Modal
      open={Boolean(exam)}
      onClose={onClose}
      title={`${exam.title} · ${exam.subject}`}
      size="wide"
      footer={
        canManage ? (
          <>
            <button type="button" className="btn btn-secondary" onClick={onClose}>
              Close
            </button>
            <button type="button" className="btn" onClick={save} disabled={saving}>
              {saving ? <span className="spinner" /> : null}
              Publish results
            </button>
          </>
        ) : (
          <button type="button" className="btn btn-secondary" onClick={onClose}>
            Close
          </button>
        )
      }
    >
      {canManage ? (
        <div className="stack">
          <Alert kind="info">
            Class {exam.className}
            {exam.section ? `-${exam.section}` : ''} · max {exam.maxMarks} marks. Grades are calculated
            automatically and students are notified.
          </Alert>

          {roster.length === 0 ? (
            <EmptyState title="No students in this class" text="Enrol students into this class to record results." />
          ) : (
            <div className="table-wrap" style={{ maxHeight: 420, overflowY: 'auto' }}>
              <table className="table">
                <thead>
                  <tr>
                    <th>Student</th>
                    <th style={{ width: 140 }}>Marks</th>
                    <th style={{ width: 100 }}>Grade</th>
                  </tr>
                </thead>
                <tbody>
                  {roster.map((s) => {
                    const value = marks[s.id] ?? '';
                    const ratio = Number(value) / (exam.maxMarks || 100);
                    const grade =
                      value === ''
                        ? '—'
                        : ratio >= 0.9
                          ? 'A+'
                          : ratio >= 0.75
                            ? 'A'
                            : ratio >= 0.6
                              ? 'B'
                              : ratio >= 0.4
                                ? 'C'
                                : 'D';
                    return (
                      <tr key={s.id}>
                        <td>
                          <Person name={s.name} meta={s.admissionId} />
                        </td>
                        <td>
                          <input
                            className="input"
                            type="number"
                            min="0"
                            max={exam.maxMarks}
                            value={value}
                            onChange={(e) => setMarks((m) => ({ ...m, [s.id]: e.target.value }))}
                            placeholder="—"
                          />
                        </td>
                        <td>
                          <Badge tone={grade === 'D' ? 'red' : grade.startsWith('A') ? 'green' : 'amber'}>{grade}</Badge>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      ) : isLoading ? (
        <p className="t-muted">Loading results…</p>
      ) : results.length === 0 ? (
        <EmptyState icon={<IconChart size={22} />} title="Results not published" text="Check back after the teacher enters marks." />
      ) : (
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>Student</th>
                <th className="t-right">Marks</th>
                <th>Grade</th>
                <th>Remarks</th>
              </tr>
            </thead>
            <tbody>
              {results.map((r) => (
                <tr key={r._id}>
                  <td>{r.studentId?.name || '—'}</td>
                  <td className="t-right t-strong">
                    {r.marksObtained}/{exam.maxMarks}
                  </td>
                  <td>
                    <Badge tone={r.grade?.startsWith('A') ? 'green' : r.grade === 'D' ? 'red' : 'amber'}>{r.grade}</Badge>
                  </td>
                  <td className="t-muted">{r.remarks || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Modal>
  );
}
