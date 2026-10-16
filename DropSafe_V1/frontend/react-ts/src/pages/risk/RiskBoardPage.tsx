import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { createIntervention, riskBoard } from '../../api/services/ai';
import { listUsers } from '../../api/services/admin';
import type { PortalUser, RiskBoardRow } from '../../types/models';
import { INTERVENTION_TYPES, PRIORITIES, PREDICTION_LABELS } from '../../types/enums';
import { Badge, Button, Card, CardHeader, EmptyState, Field, FullPageLoading, Input, PageHeader, RiskBadge, Select, Textarea } from '../../components/ui/primitives';
import { Table, THead, TBody, Tr, Th, Td } from '../../components/ui/Table';
import { Modal } from '../../components/ui/Modal';
import { PrivacyNote } from '../../components/ui/PrivacyNote';
import { useToast } from '../../components/ui/Toast';
import { useAuth } from '../../auth/AuthContext';
import { formatDateTime, titleCase } from '../../lib/format';
import { P } from '../../lib/permissions';
import { Can } from '../../auth/guards';

export default function RiskBoardPage() {
  const { notify } = useToast();
  const { isMentor, user } = useAuth();
  const [rows, setRows] = useState<RiskBoardRow[] | null>(null);
  const [label, setLabel] = useState('');
  const [review, setReview] = useState<RiskBoardRow | null>(null);

  const load = async () => setRows(await riskBoard(label || undefined));

  useEffect(() => {
    void load().catch((e) => notify(e?.message ?? 'Failed to load risk board', 'error'));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [label]);

  if (!rows) return <FullPageLoading label="Loading risk board…" />;

  return (
    <div>
      <PageHeader
        title="Risk Monitoring"
        subtitle="Latest AI prediction per student (decision support). Every intervention is a human decision — predictions never create interventions automatically."
        actions={
          <Select value={label} onChange={(e) => setLabel(e.target.value)} className="w-44">
            <option value="">All prediction states</option>
            {PREDICTION_LABELS.map((l) => (
              <option key={l} value={l}>{titleCase(l)} risk</option>
            ))}
            <option value="UNAVAILABLE">Prediction unavailable</option>
            <option value="PENDING">Snapshot awaiting prediction</option>
          </Select>
        }
      />

      <PrivacyNote title={isMentor ? 'Assigned scope' : 'Prediction scope'}>
        {isMentor
          ? 'You see predictions for your assigned students only. Behaviour summaries require admin approval; raw conversations are never visible.'
          : 'Predictions reference immutable snapshots and AI model versions for full traceability (PRD §24).'}
      </PrivacyNote>

      <Card className="mt-5">
        <CardHeader title={`${rows.length} student(s)`} subtitle="Sorted by risk — HIGH first" />
        {rows.length === 0 ? (
          <EmptyState title="No students match" description="Try a different prediction-state filter." />
        ) : (
          <Table>
            <THead>
              <Tr><Th>Student</Th><Th>Attendance</Th><Th>Marks</Th><Th>Behaviour</Th><Th>Prediction</Th><Th>Generated</Th><Th className="text-right">Human review</Th></Tr>
            </THead>
            <TBody>
              {[...rows]
                .sort((a, b) => ({ HIGH: 0, MEDIUM: 1, PENDING: 2, UNAVAILABLE: 2, LOW: 3 } as Record<string, number>)[a.state] - ({ HIGH: 0, MEDIUM: 1, PENDING: 2, UNAVAILABLE: 2, LOW: 3 } as Record<string, number>)[b.state])
                .map((r) => (
                  <Tr key={r.studentId}>
                    <Td>
                      <Link to={`/academic/students/${r.studentId}`} className="font-semibold text-slate-800 hover:text-brand-600">{r.studentName}</Link>
                      <div className="text-[11px] text-slate-400">{r.primaryIdentifier} · {r.levelName ?? '—'}</div>
                    </Td>
                    <Td>{r.snapshot ? `${r.snapshot.attendancePercentage}%` : '—'}</Td>
                    <Td>{r.snapshot ? `${r.snapshot.overallMarksPercentage}%` : '—'}</Td>
                    <Td>{r.snapshot ? `${r.snapshot.behaviourScore}/100` : '—'}</Td>
                    <Td>
                      {r.state === 'UNAVAILABLE' || r.state === 'PENDING' ? (
                        <div>
                          <RiskBadge label="UNAVAILABLE" />
                          <div className="mt-0.5 max-w-[220px] text-[10px] leading-tight text-slate-400">
                            {r.state === 'UNAVAILABLE' ? 'Insufficient evidence — the engine does not guess (PRD §14).' : 'Snapshot built; prediction pending.'}
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2">
                          <RiskBadge label={r.state} />
                          <span className="text-xs text-slate-500">{r.prediction?.predictionScore}/100</span>
                        </div>
                      )}
                    </Td>
                    <Td className="text-xs text-slate-500">{r.prediction ? formatDateTime(r.prediction.generatedAt) : '—'}</Td>
                    <Td>
                      <div className="flex items-center justify-end gap-2">
                        {r.hasOpenIntervention && <Badge tone="indigo">Intervention open</Badge>}
                        <Can anyOf={[P.counselingCreate]}>
                          {!r.hasOpenIntervention && r.state !== 'LOW' && r.state !== 'UNAVAILABLE' && (
                            <Button size="sm" variant="secondary" onClick={() => setReview(r)}>Open human review</Button>
                          )}
                        </Can>
                      </div>
                    </Td>
                  </Tr>
                ))}
            </TBody>
          </Table>
        )}
      </Card>

      <HumanReviewModal
        row={review}
        currentUserId={user?.id ?? ''}
        onClose={() => setReview(null)}
        onCreated={async () => {
          setReview(null);
          notify('Intervention created by human decision (status: Planned).');
          await load();
        }}
      />
    </div>
  );
}

/** Explicit human-in-the-loop step: a person reviews AI support and decides (PRD §15). */
function HumanReviewModal({
  row,
  currentUserId,
  onClose,
  onCreated,
}: {
  row: RiskBoardRow | null;
  currentUserId: string;
  onClose: () => void;
  onCreated: () => void;
}) {
  const { notify } = useToast();
  const [users, setUsers] = useState<PortalUser[]>([]);
  const [form, setForm] = useState({ interventionType: 'ACADEMIC', priority: 'MEDIUM', title: '', description: '', responsibleUserId: currentUserId });
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (row) {
      setForm({
        interventionType: 'ACADEMIC',
        priority: row.state === 'HIGH' ? 'HIGH' : 'MEDIUM',
        title: `${row.state === 'HIGH' ? 'Urgent support' : 'Support review'} — ${row.studentName}`,
        description: '',
        responsibleUserId: currentUserId,
      });
      listUsers().then(setUsers).catch(() => setUsers([]));
    }
  }, [row, currentUserId]);

  const submit = async () => {
    if (!row) return;
    setBusy(true);
    try {
      await createIntervention({
        studentId: row.studentId,
        predictionId: row.prediction?.id,
        interventionType: form.interventionType,
        priority: form.priority,
        title: form.title,
        description: form.description || undefined,
        responsibleUserId: form.responsibleUserId,
      });
      onCreated();
    } catch (e: any) {
      notify(e?.message ?? 'Failed to create intervention', 'error');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal
      open={!!row}
      onClose={onClose}
      title="Human review → Intervention"
      subtitle="You are making the decision — the AI prediction only informed it. This action is audit-logged."
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button onClick={submit} disabled={busy || !form.title || !form.responsibleUserId}>
            {busy ? 'Creating…' : 'Create intervention (Planned)'}
          </Button>
        </>
      }
    >
      {row && (
        <div className="space-y-4">
          <div className="flex items-center justify-between rounded-xl bg-slate-50 px-4 py-3 ring-1 ring-inset ring-slate-200">
            <div>
              <div className="text-sm font-semibold text-slate-800">{row.studentName}</div>
              <div className="text-[11px] text-slate-400">{row.primaryIdentifier} · {row.programName}</div>
            </div>
            <RiskBadge label={row.state === 'PENDING' ? 'UNAVAILABLE' : row.state} />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Field label="Intervention type" required>
              <Select value={form.interventionType} onChange={(e) => setForm({ ...form, interventionType: e.target.value })}>
                {INTERVENTION_TYPES.map((t) => (
                  <option key={t} value={t}>{titleCase(t)}</option>
                ))}
              </Select>
            </Field>
            <Field label="Priority" required>
              <Select value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value })}>
                {PRIORITIES.map((p) => (
                  <option key={p} value={p}>{titleCase(p)}</option>
                ))}
              </Select>
            </Field>
          </div>
          <Field label="Title" required><Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} /></Field>
          <Field label="Description"><Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Why is this intervention being opened? What did the human review conclude?" /></Field>
          <Field label="Responsible user" required hint="Must belong to this organization">
            <Select value={form.responsibleUserId} onChange={(e) => setForm({ ...form, responsibleUserId: e.target.value })}>
              {users.filter((u) => u.status === 'ACTIVE').map((u) => (
                <option key={u.id} value={u.id}>{u.name} — {u.roles.map((r) => titleCase(r.name)).join(', ')}</option>
              ))}
            </Select>
          </Field>
        </div>
      )}
    </Modal>
  );
}
