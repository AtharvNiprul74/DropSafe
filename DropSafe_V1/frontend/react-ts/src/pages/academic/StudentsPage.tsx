import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { createStudent, listStudents } from '../../api/services/students';
import type { StudentListRow } from '../../api/services/students';
import { IDENTIFIER_TYPES, STUDENT_STATUSES } from '../../types/enums';
import type { StudentStatus } from '../../types/enums';
import { Button, Card, CardHeader, EmptyState, Field, FullPageLoading, Input, PageHeader, SearchInput, Select, StatusBadge } from '../../components/ui/primitives';
import { Table, THead, TBody, Tr, Th, Td } from '../../components/ui/Table';
import { Modal } from '../../components/ui/Modal';
import { useToast } from '../../components/ui/Toast';
import { useAuth } from '../../auth/AuthContext';
import { getSettings } from '../../api/services/org';
import { titleCase } from '../../lib/format';
import { P } from '../../lib/permissions';

export default function StudentsPage() {
  const { notify } = useToast();
  const { canAny } = useAuth();
  const navigate = useNavigate();
  const [rows, setRows] = useState<StudentListRow[] | null>(null);
  const [q, setQ] = useState('');
  const [status, setStatus] = useState('');
  const [idLabel, setIdLabel] = useState('Identifier');
  const [createOpen, setCreateOpen] = useState(false);
  const [form, setForm] = useState({ firstName: '', lastName: '', identifierType: 'PRN', identifierValue: '', email: '', guardianName: '' });

  const load = async () => {
    const [students, settings] = await Promise.all([listStudents(q, status as StudentStatus | ''), getSettings().catch(() => null)]);
    setRows(students);
    if (settings) setIdLabel(settings.studentIdentifierLabel);
  };

  useEffect(() => {
    const t = setTimeout(() => void load().catch((e) => notify(e?.message ?? 'Failed to load students', 'error')), 200);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q, status]);

  if (!rows) return <FullPageLoading label="Loading students…" />;

  return (
    <div>
      <PageHeader
        title="Students"
        subtitle="Identity records only — program, performance, attendance and predictions live on Enrollments and evidence, not on the student (PRD §8)."
        actions={canAny(P.studentCreate) && <Button onClick={() => setCreateOpen(true)}>+ New student</Button>}
      />
      <Card>
        <CardHeader
          title={`${rows.length} students`}
          actions={
            <div className="flex items-center gap-2">
              <Select value={status} onChange={(e) => setStatus(e.target.value)} className="w-40">
                <option value="">All statuses</option>
                {STUDENT_STATUSES.map((s) => (
                  <option key={s} value={s}>{titleCase(s)}</option>
                ))}
              </Select>
              <SearchInput value={q} onChange={setQ} placeholder={`Name or ${idLabel}…`} />
            </div>
          }
        />
        {rows.length === 0 ? (
          <EmptyState title="No students found" description="Adjust your search, or add a student with their primary identifier." />
        ) : (
          <Table>
            <THead>
              <Tr><Th>Student</Th><Th>{idLabel}</Th><Th>Status</Th><Th>Enrollment</Th><Th>Parent / guardian</Th></Tr>
            </THead>
            <TBody>
              {rows.map((s) => (
                <Tr key={s.id} onClick={() => navigate(`/academic/students/${s.id}`)}>
                  <Td>
                    <div className="font-semibold text-slate-800">{s.firstName} {s.lastName}</div>
                    <div className="text-[11px] text-slate-400">{s.email ?? '—'}</div>
                  </Td>
                  <Td className="font-mono text-xs">{s.primaryIdentifier ?? '—'}</Td>
                  <Td><StatusBadge status={s.status} /></Td>
                  <Td className="text-xs">
                    {s.enrollment ? (
                      <>
                        {s.enrollment.programName}
                        <div className="text-[11px] text-slate-400">{s.enrollment.levelName} · {s.enrollment.periodCode}</div>
                      </>
                    ) : (
                      <span className="text-slate-400">No active enrollment</span>
                    )}
                  </Td>
                  <Td className="text-xs">{s.guardianName ?? '—'}</Td>
                </Tr>
              ))}
            </TBody>
          </Table>
        )}
      </Card>

      <Modal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        title="New student"
        subtitle={`A student can hold multiple identifiers; exactly one primary ${idLabel}. Identifier type/value is unique within the organization.`}
        footer={
          <>
            <Button variant="secondary" onClick={() => setCreateOpen(false)}>Cancel</Button>
            <Button
              disabled={!form.firstName || !form.lastName || !form.identifierValue}
              onClick={async () => {
                try {
                  await createStudent(form);
                  notify('Student created with primary identifier.');
                  setCreateOpen(false);
                  setForm({ firstName: '', lastName: '', identifierType: 'PRN', identifierValue: '', email: '', guardianName: '' });
                  await load();
                } catch (e: any) {
                  notify(e?.message ?? 'Create failed', 'error');
                }
              }}
            >
              Create student
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Field label="First name" required><Input value={form.firstName} onChange={(e) => setForm({ ...form, firstName: e.target.value })} /></Field>
            <Field label="Last name" required><Input value={form.lastName} onChange={(e) => setForm({ ...form, lastName: e.target.value })} /></Field>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Identifier type" required>
              <Select value={form.identifierType} onChange={(e) => setForm({ ...form, identifierType: e.target.value })}>
                {IDENTIFIER_TYPES.map((t) => (
                  <option key={t} value={t}>{titleCase(t)}</option>
                ))}
              </Select>
            </Field>
            <Field label={`Primary ${idLabel}`} required><Input value={form.identifierValue} onChange={(e) => setForm({ ...form, identifierValue: e.target.value })} placeholder={idLabel === 'PRN' ? 'e.g. VVCE23113' : 'Identifier value'} /></Field>
          </div>
          <Field label="Email"><Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></Field>
          <Field label="Parent / guardian"><Input value={form.guardianName} onChange={(e) => setForm({ ...form, guardianName: e.target.value })} /></Field>
        </div>
      </Modal>
    </div>
  );
}
