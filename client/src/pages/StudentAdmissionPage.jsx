import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useCreateStudentMutation } from '../app/api';
import { Card, Input, PageHeader, errorText, useToast } from '../components/ui';

const EMPTY = {
  name: '',
  email: '',
  password: 'student123',
  admissionId: '',
  className: '10',
  section: 'A',
  phone: '',
  address: '',
  bloodGroup: '',
  dob: '',
};

export default function StudentAdmissionPage() {
  const toast = useToast();
  const navigate = useNavigate();
  const [createStudent, { isLoading }] = useCreateStudentMutation();
  const [form, setForm] = useState(EMPTY);
  const [error, setError] = useState('');

  function set(field) {
    return (e) => setForm((f) => ({ ...f, [field]: e.target.value }));
  }

  async function submit(e) {
    e.preventDefault();
    setError('');
    try {
      const student = await createStudent({
        ...form,
        dob: form.dob || undefined,
      }).unwrap();
      toast.success('Student admitted successfully');
      navigate(`/admin/students/list`);
      return student;
    } catch (err) {
      setError(errorText(err));
      toast.error(errorText(err));
    }
  }

  return (
    <div className="page">
      <PageHeader
        title="Student Admission"
        subtitle="Register a new student into the school database."
        actions={<Link className="btn btn-secondary" to="/admin/students/list">Student List</Link>}
      />
      <Card>
        <form className="stack" onSubmit={submit} style={{ maxWidth: 720 }}>
          {error ? <div className="field-error">{error}</div> : null}
          <div className="fees-filter-row">
            <Input label="Full name *" value={form.name} onChange={set('name')} required />
            <Input label="Admission ID *" value={form.admissionId} onChange={set('admissionId')} required />
          </div>
          <div className="fees-filter-row">
            <Input label="Email *" type="email" value={form.email} onChange={set('email')} required />
            <Input label="Temp password *" value={form.password} onChange={set('password')} required />
          </div>
          <div className="fees-filter-row">
            <Input label="Class *" value={form.className} onChange={set('className')} required />
            <Input label="Section *" value={form.section} onChange={set('section')} required />
          </div>
          <div className="fees-filter-row">
            <Input label="Phone" value={form.phone} onChange={set('phone')} />
            <Input label="Date of birth" type="date" value={form.dob} onChange={set('dob')} />
            <Input label="Blood group" value={form.bloodGroup} onChange={set('bloodGroup')} />
          </div>
          <Input label="Address" value={form.address} onChange={set('address')} />
          <div className="row" style={{ justifyContent: 'flex-end', gap: 10 }}>
            <button type="button" className="btn btn-secondary" onClick={() => setForm(EMPTY)}>Reset</button>
            <button type="submit" className="btn btn-warn" disabled={isLoading}>
              {isLoading ? 'Saving…' : 'Admit Student'}
            </button>
          </div>
        </form>
      </Card>
    </div>
  );
}
