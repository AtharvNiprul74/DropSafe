import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  createFollowUp, getIntervention, scheduleSession, transitionFollowUp, transitionIntervention, transitionSession,
} from '../../api/services/ai';
import type { InterventionDetail } from '../../api/services/ai';
import { listUsers } from '../../api/services/admin';
import type { PortalUser } from '../../types/models';
import { SESSION_TYPES, FOLLOW_UP_TYPES } from '../../types/enums';
import { Badge, Button, Card, CardHeader, Field, FullPageLoading, Input, KV, PageHeader, RiskBadge, Select, StatusBadge, Textarea } from '../../components/ui/primitives';
import { Table, THead, TBody, Tr, Th, Td } from '../../components/ui/Table';
import { Modal } from '../../components/ui/Modal';
import { PrivacyNote } from '../../components/ui/PrivacyNote';
import { useToast } from '../../components/ui/Toast';
import { useAuth } from '../../auth/AuthContext';
import { allowedTransitions } from '../../lib/transitions';
import { formatDate, formatDateTime, titleCase } from '../../lib/format';
import { P } from '../../lib/permissions';
import { Can } from '../../auth/guards';

export default function InterventionDetailPage() {
  const { id = '' } = useParams();
  const { notify } = useToast();
  const { user } = useAuth();
  const [data, setData] = useState<InterventionDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [sessionModal, setSessionModal] = useState(false);
  const [followUpModal, setFollowUpModal] = useState(false);
  const [completeSession, setCompleteSession] = useState<string | null>(null);
  const [outcome, setOutcome] = useState('');
  const [users, setUsers] = useState<PortalUser[]>([]);
  const [sessionForm, setSessionForm] = useState({ sessionType: 'IN_PERSON', scheduledAt: '', mentorId: '' });
  const [fuForm, setFuForm] = useState({ followUpType: 'CHECK_IN', dueDate: '', assignedUserId: '', note: '' });

  const load = async () => setData(await getIntervention(id));

  useEffect(() => {
    load().catch((e) => setError(e?.message ?? 'Not found'));
    listUsers().then(setUsers).catch(() => undefined);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  if (error) return <div className="rounded-xl bg-rose-50 p-4 text-sm text-rose-700 ring-1 ring-inset ring-rose-200">{error}</div>;
  if (!data) return <FullPageLoading label="Loading intervention…" />;

  const { intervention: i, prediction, sessions, followUps, canSeeNotes } = data;
  const activeUsers = users.filter((u) => u.status === 'ACTIVE');

  const doTransition = async (to: string) => {
    try {
      await transitionIntervention(i.id, to);
      notify(`Intervention ${titleCase(to).toLowerCase()}.`);
      await load();
    } catch (e: any) {
      notify(e?.message ?? 'Transition rejected', 'error');
    }
  };

  return (
    <div>
      <PageHeader
        crumbs={['Counseling', 'Interventions', i.title]}
        title={i.title}
        subtitle={i.description}
        actions={
          <div className="flex items-center gap-2">
            <StatusBadge status={i.priority} />
            <StatusBadge status={i.status} />
            <Can anyOf={[P.counselingUpdate]}>
              {allowedTransitions('intervention', i.status).map((to) => (
                <Button key={to} size="sm" variant={to === 'CANCELLED' ? 'danger' : to === 'COMPLETED' ? 'success' : 'primary'} onClick={() => void doTransition(to)}>
                  {titleCase(to)}
                </Button>
              ))}
            </Can>
          </div>
        }
      />

      <div className="grid gap-5 xl:grid-cols-3">
        {/* Summary card */}
        <Card className="xl:col-span-1">
          <CardHeader title="Intervention record" />
          <div className="divide-y divide-slate-100 px-5">
            <KV k="Student" v={<Link className="text-brand-600 hover:underline" to={`/academic/students/${i.studentId}`}>{i.studentName}</Link>} />
            <KV k="Type" v={titleCase(i.interventionType)} />
            <KV k="Responsible" v={i.responsibleUserName} />
            <KV k="Created by" v={i.createdByName} />
            <KV k="Created" v={formatDateTime(i.createdAt)} />
            <KV k="Completed at" v={i.completedAt ? formatDateTime(i.completedAt) : '—'} />
            <KV
              k="Linked prediction"
              v={prediction ? (
                <span className="flex items-center justify-end gap-2">
                  <RiskBadge label={prediction.predictionLabel} />
                  <span className="text-xs text-slate-500">{prediction.predictionScore}/100 · v{prediction.aiModelVersion}</span>
                </span>
              ) : (
                <span className="text-xs text-slate-400">None (created without a prediction)</span>
              )}
            />
          </div>
          <div className="px-5 py-4">
            <PrivacyNote title="Human-led">
              This intervention was created by a person after review — never by AI. Sessions and follow-ups are
              preserved as historical records.
            </PrivacyNote>
          </div>
        </Card>

        {/* Counseling sessions */}
        <Card className="xl:col-span-2">
          <CardHeader
            title="Counseling sessions"
            subtitle={canSeeNotes ? 'You are authorized to view session outcomes' : 'Session notes/outcomes are restricted'}
            actions={
              <Can anyOf={[P.counselingCreate]}>
                {i.status !== 'CANCELLED' && i.status !== 'COMPLETED' && (
                  <Button size="sm" onClick={() => { setSessionForm({ sessionType: 'IN_PERSON', scheduledAt: '', mentorId: user?.id ?? '' }); setSessionModal(true); }}>
                    + Schedule session
                  </Button>
                )}
              </Can>
            }
          />
          {sessions.length === 0 ? (
            <div className="px-5 py-8 text-center text-sm text-slate-400">No sessions scheduled yet.</div>
          ) : (
            <Table>
              <THead>
                <Tr><Th>Scheduled</Th><Th>Type</Th><Th>Mentor</Th><Th>Status</Th><Th>Outcome</Th><Th className="text-right">Actions</Th></Tr>
              </THead>
              <TBody>
                {sessions.map((s) => (
                  <Tr key={s.id}>
                    <Td className="text-xs">{formatDateTime(s.scheduledAt)}</Td>
                    <Td><Badge tone="slate">{titleCase(s.sessionType)}</Badge></Td>
                    <Td className="text-xs">{s.mentorName}</Td>
                    <Td>
                      <StatusBadge status={s.status} />
                      {s.status === 'COMPLETED' && (
                        <div className="mt-0.5 text-[10px] text-slate-400">{formatDateTime(s.startedAt)} → {formatDateTime(s.endedAt)}</div>
                      )}
                    </Td>
                    <Td className="max-w-[220px]">
                      {s.status === 'COMPLETED' ? (
                        canSeeNotes ? (
                          <span className="line-clamp-2 text-xs text-slate-600">{s.outcomeSummary ?? '—'}</span>
                        ) : (
                          <span className="flex items-center gap-1 text-[11px] italic text-slate-400">🔒 Restricted</span>
                        )
                      ) : (
                        <span className="text-xs text-slate-400">—</span>
                      )}
                    </Td>
                    <Td>
                      <Can anyOf={[P.counselingUpdate]}>
                        <div className="flex justify-end gap-1.5">
                          {allowedTransitions('session', s.status).map((to) =>
                            to === 'COMPLETED' ? (
                              <Button key={to} size="sm" variant="success" onClick={() => { setOutcome(''); setCompleteSession(s.id); }}>Complete</Button>
                            ) : (
                              <Button
                                key={to}
                                size="sm"
                                variant={to === 'CANCELLED' ? 'danger' : 'secondary'}
                                onClick={async () => {
                                  try {
                                    await transitionSession(s.id, { status: to });
                                    notify(`Session ${titleCase(to).toLowerCase()}.`);
                                    await load();
                                  } catch (e: any) {
                                    notify(e?.message ?? 'Rejected', 'error');
                                  }
                                }}
                              >
                                {titleCase(to)}
                              </Button>
                            ),
                          )}
                        </div>
                      </Can>
                    </Td>
                  </Tr>
                ))}
              </TBody>
            </Table>
          )}
        </Card>
      </div>

      {/* Follow-ups */}
      <Card className="mt-5">
        <CardHeader
          title="Follow-ups"
          subtitle="Next planned actions after intervention or session"
          actions={
            <Can anyOf={[P.counselingCreate]}>
              {['PLANNED', 'IN_PROGRESS'].includes(i.status) && (
                <Button size="sm" variant="secondary" onClick={() => { setFuForm({ followUpType: 'CHECK_IN', dueDate: '', assignedUserId: user?.id ?? '', note: '' }); setFollowUpModal(true); }}>
                  + Add follow-up
                </Button>
              )}
            </Can>
          }
        />
        {followUps.length === 0 ? (
          <div className="px-5 py-8 text-center text-sm text-slate-400">No follow-ups yet.</div>
        ) : (
          <Table>
            <THead>
              <Tr><Th>Type</Th><Th>Due</Th><Th>Assigned to</Th><Th>Status</Th><Th>Note</Th><Th className="text-right">Actions</Th></Tr>
            </THead>
            <TBody>
              {followUps.map((f) => (
                <Tr key={f.id}>
                  <Td><Badge tone="slate">{titleCase(f.followUpType)}</Badge></Td>
                  <Td className="text-xs">{formatDate(f.dueDate)}</Td>
                  <Td className="text-xs">{f.assignedUserName}</Td>
                  <Td>
                    <StatusBadge status={f.status} />
                    {f.completedAt && <div className="mt-0.5 text-[10px] text-slate-400">{formatDate(f.completedAt)}</div>}
                  </Td>
                  <Td className="max-w-[240px] text-xs text-slate-600">{f.note ?? '—'}</Td>
                  <Td>
                    <Can anyOf={[P.counselingUpdate]}>
                      <div className="flex justify-end gap-1.5">
                        {allowedTransitions('followUp', f.status).map((to) => (
                          <Button
                            key={to}
                            size="sm"
                            variant={to === 'COMPLETED' ? 'success' : to === 'CANCELLED' ? 'danger' : 'secondary'}
                            onClick={async () => {
                              try {
                                await transitionFollowUp(f.id, to);
                                notify(`Follow-up ${titleCase(to).toLowerCase()}.`);
                                await load();
                              } catch (e: any) {
                                notify(e?.message ?? 'Rejected', 'error');
                              }
                            }}
                          >
                            {titleCase(to)}
                          </Button>
                        ))}
                      </div>
                    </Can>
                  </Td>
                </Tr>
              ))}
            </TBody>
          </Table>
        )}
      </Card>

      {/* Schedule session modal */}
      <Modal
        open={sessionModal}
        onClose={() => setSessionModal(false)}
        title="Schedule counseling session"
        subtitle="An actual interaction between the student and an authorized Mentor/Counselor."
        footer={
          <>
            <Button variant="secondary" onClick={() => setSessionModal(false)}>Cancel</Button>
            <Button
              disabled={!sessionForm.scheduledAt || !sessionForm.mentorId}
              onClick={async () => {
                try {
                  await scheduleSession(i.id, { sessionType: sessionForm.sessionType, scheduledAt: sessionForm.scheduledAt, mentorId: sessionForm.mentorId });
                  notify('Session scheduled.');
                  setSessionModal(false);
                  await load();
                } catch (e: any) {
                  notify(e?.message ?? 'Failed', 'error');
                }
              }}
            >
              Schedule
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Field label="Session type" required>
              <Select value={sessionForm.sessionType} onChange={(e) => setSessionForm({ ...sessionForm, sessionType: e.target.value })}>
                {SESSION_TYPES.map((t) => (
                  <option key={t} value={t}>{titleCase(t)}</option>
                ))}
              </Select>
            </Field>
            <Field label="Scheduled at" required>
              <Input type="datetime-local" value={sessionForm.scheduledAt} onChange={(e) => setSessionForm({ ...sessionForm, scheduledAt: e.target.value })} />
            </Field>
          </div>
          <Field label="Responsible Mentor/Counselor" required>
            <Select value={sessionForm.mentorId} onChange={(e) => setSessionForm({ ...sessionForm, mentorId: e.target.value })}>
              <option value="">Select…</option>
              {activeUsers.map((u) => (
                <option key={u.id} value={u.id}>{u.name}</option>
              ))}
            </Select>
          </Field>
        </div>
      </Modal>

      {/* Complete session modal — completed requires started/ended + restricted outcome */}
      <Modal
        open={!!completeSession}
        onClose={() => setCompleteSession(null)}
        title="Complete counseling session"
        subtitle="Completion requires started_at and ended_at (recorded automatically). The outcome summary is restricted to authorized users."
        footer={
          <>
            <Button variant="secondary" onClick={() => setCompleteSession(null)}>Cancel</Button>
            <Button
              variant="success"
              onClick={async () => {
                if (!completeSession) return;
                try {
                  await transitionSession(completeSession, { status: 'COMPLETED', outcomeSummary: outcome || undefined });
                  notify('Session completed — started/ended timestamps recorded.');
                  setCompleteSession(null);
                  await load();
                } catch (e: any) {
                  notify(e?.message ?? 'Rejected', 'error');
                }
              }}
            >
              Complete session
            </Button>
          </>
        }
      >
        <Field label="Outcome summary (restricted)" hint="Visible only to the session mentor, the responsible user, and Organization Admins">
          <Textarea value={outcome} onChange={(e) => setOutcome(e.target.value)} placeholder="Human-generated summary of the session. Never visible to unauthorized roles; never stored in governance records." />
        </Field>
      </Modal>

      {/* Add follow-up modal */}
      <Modal
        open={followUpModal}
        onClose={() => setFollowUpModal(false)}
        title="Add follow-up"
        subtitle="Pending follow-up starts with no completed_at; completing it sets the timestamp."
        footer={
          <>
            <Button variant="secondary" onClick={() => setFollowUpModal(false)}>Cancel</Button>
            <Button
              disabled={!fuForm.dueDate || !fuForm.assignedUserId}
              onClick={async () => {
                try {
                  await createFollowUp(i.id, { ...fuForm, note: fuForm.note || undefined });
                  notify('Follow-up added.');
                  setFollowUpModal(false);
                  await load();
                } catch (e: any) {
                  notify(e?.message ?? 'Failed', 'error');
                }
              }}
            >
              Add follow-up
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Field label="Type" required>
              <Select value={fuForm.followUpType} onChange={(e) => setFuForm({ ...fuForm, followUpType: e.target.value })}>
                {FOLLOW_UP_TYPES.map((t) => (
                  <option key={t} value={t}>{titleCase(t)}</option>
                ))}
              </Select>
            </Field>
            <Field label="Due date" required><Input type="date" value={fuForm.dueDate} onChange={(e) => setFuForm({ ...fuForm, dueDate: e.target.value })} /></Field>
          </div>
          <Field label="Assigned to" required>
            <Select value={fuForm.assignedUserId} onChange={(e) => setFuForm({ ...fuForm, assignedUserId: e.target.value })}>
              <option value="">Select…</option>
              {activeUsers.map((u) => (
                <option key={u.id} value={u.id}>{u.name}</option>
              ))}
            </Select>
          </Field>
          <Field label="Note"><Textarea value={fuForm.note} onChange={(e) => setFuForm({ ...fuForm, note: e.target.value })} /></Field>
        </div>
      </Modal>
    </div>
  );
}
