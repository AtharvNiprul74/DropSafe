import { useEffect, useMemo, useState } from 'react';
import { listComponents, listPeriods, listRoster, saveAssessmentsBulk, saveAttendanceBulk } from '../../api/services/academic';
import type { AcademicPeriod, LearningComponent } from '../../types/models';
import type { RosterRow } from '../../api/services/academic';
import { Button, Card, CardHeader, EmptyState, Field, FullPageLoading, PageHeader, Select, StatusBadge } from '../../components/ui/primitives';
import { Table, THead, TBody, Tr, Th, Td } from '../../components/ui/Table';
import { Tabs } from '../../components/ui/Tabs';
import { useToast } from '../../components/ui/Toast';
import { useAuth } from '../../auth/AuthContext';
import { PrivacyNote } from '../../components/ui/PrivacyNote';
import { formatDate, titleCase } from '../../lib/format';
import { P } from '../../lib/permissions';

/**
 * Records entry (Teacher) — direct evidence capture with the same integrity
 * rules the import pipeline enforces (PRD §34):
 *   attended_sessions <= total_sessions · obtained_marks <= maximum_marks
 */
export default function RecordsPage() {
  const { notify } = useToast();
  const { canAny } = useAuth();
  const canAttendance = canAny(P.attendanceCreate, P.attendanceUpdate);
  const canAssessment = canAny(P.assessmentCreate, P.assessmentUpdate);

  const [tab, setTab] = useState(canAttendance ? 'attendance' : 'assessment');
  const [periods, setPeriods] = useState<AcademicPeriod[] | null>(null);
  const [components, setComponents] = useState<LearningComponent[]>([]);
  const [periodId, setPeriodId] = useState('');
  const [componentId, setComponentId] = useState('');
  const [roster, setRoster] = useState<RosterRow[] | null>(null);
  const [draft, setDraft] = useState<Record<string, { a?: string; t?: string; o?: string; m?: string }>>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    listPeriods().then(async (ps) => {
      const active = ps.filter((p) => p.status === 'ACTIVE');
      setPeriods(ps);
      if (active[0]) setPeriodId(active[0].id);
    }).catch((e) => notify(e?.message ?? 'Failed to load periods', 'error'));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!periodId) return;
    (async () => {
      const [cs, r] = await Promise.all([listComponents(periodId), listRoster(periodId)]);
      const actives = cs.filter((c) => c.status === 'ACTIVE');
      setComponents(actives);
      if (actives[0]) setComponentId((c) => c || actives[0].id);
      setRoster(r);
      const init: typeof draft = {};
      r.forEach((row) => {
        init[row.enrollmentId] = {};
        row.attendance.forEach((a) => {
          init[`${row.enrollmentId}|${a.learningComponentId}`] = { a: String(a.attendedSessions), t: String(a.totalSessions) };
        });
        row.assessments.forEach((a) => {
          init[`${row.enrollmentId}|${a.learningComponentId}`] = {
            ...init[`${row.enrollmentId}|${a.learningComponentId}`],
            o: String(a.obtainedMarks),
            m: String(a.maximumMarks),
          };
        });
      });
      setDraft(init);
    })().catch((e) => notify(e?.message ?? 'Failed to load roster', 'error'));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [periodId]);

  const component = useMemo(() => components.find((c) => c.id === componentId), [components, componentId]);

  const errorFor = (enrollmentId: string): string | null => {
    const d = draft[`${enrollmentId}|${componentId}`] ?? {};
    if (tab === 'attendance') {
      const a = Number(d.a ?? ''), t = Number(d.t ?? '');
      if (d.a !== undefined && a < 0) return 'Cannot be negative';
      if (d.t !== undefined && t <= 0) return 'Total must be > 0';
      if (d.a !== undefined && d.t !== undefined && a > t) return 'Attended > total';
    } else {
      const o = Number(d.o ?? ''), m = Number(d.m ?? '');
      if (d.o !== undefined && o < 0) return 'Cannot be negative';
      if (d.m !== undefined && m <= 0) return 'Max must be > 0';
      if (d.o !== undefined && d.m !== undefined && o > m) return 'Obtained > max';
    }
    return null;
  };

  const hasErrors = roster?.some((r) => errorFor(r.enrollmentId)) ?? false;

  const save = async () => {
    if (!roster || !componentId) return;
    setSaving(true);
    try {
      if (tab === 'attendance') {
        const rows = roster
          .map((r) => {
            const d = draft[`${r.enrollmentId}|${componentId}`] ?? {};
            return d.a !== undefined && d.t !== undefined && d.a !== '' && d.t !== ''
              ? { enrollmentId: r.enrollmentId, learningComponentId: componentId, attendedSessions: Number(d.a), totalSessions: Number(d.t) }
              : null;
          })
          .filter(Boolean) as any[];
        await saveAttendanceBulk(rows);
        notify(`${rows.length} attendance record(s) saved as source evidence.`);
      } else {
        const rows = roster
          .map((r) => {
            const d = draft[`${r.enrollmentId}|${componentId}`] ?? {};
            return d.o !== undefined && d.m !== undefined && d.o !== '' && d.m !== ''
              ? { enrollmentId: r.enrollmentId, learningComponentId: componentId, obtainedMarks: Number(d.o), maximumMarks: Number(d.m) }
              : null;
          })
          .filter(Boolean) as any[];
        await saveAssessmentsBulk(rows);
        notify(`${rows.length} assessment record(s) saved as source evidence.`);
      }
    } catch (e: any) {
      notify(e?.message ?? 'Save rejected', 'error');
    } finally {
      setSaving(false);
    }
  };

  if (!periods) return <FullPageLoading label="Loading…" />;

  return (
    <div>
      <PageHeader
        title="Records Entry"
        subtitle="Capture attendance and assessment evidence directly. Bulk uploads of the same evidence are handled through Import Sessions."
      />

      <Tabs
        active={tab}
        onChange={setTab}
        tabs={[
          ...(canAttendance ? [{ id: 'attendance', label: 'Attendance' }] : []),
          ...(canAssessment ? [{ id: 'assessment', label: 'Assessments' }] : []),
        ]}
      />

      <PrivacyNote title="Evidence integrity">
        {tab === 'attendance'
          ? 'Constraints enforced: attended_sessions ≥ 0, total_sessions > 0, attended ≤ total. Attendance percentage is derived, not stored.'
          : 'Constraints enforced: obtained_marks ≥ 0, maximum_marks > 0, obtained ≤ maximum. No GPA/CGPA or AI features are stored on assessment evidence.'}
      </PrivacyNote>

      <Card className="mt-5">
        <CardHeader
          title="Select period & learning component"
          actions={
            <div className="flex flex-wrap items-end gap-2">
              <Field label="Academic period">
                <Select value={periodId} onChange={(e) => { setPeriodId(e.target.value); setComponentId(''); }} className="w-52">
                  {periods.filter((p) => p.status !== 'ARCHIVED').map((p) => (
                    <option key={p.id} value={p.id}>{p.code} ({titleCase(p.status)})</option>
                  ))}
                </Select>
              </Field>
              <Field label="Learning component">
                <Select value={componentId} onChange={(e) => setComponentId(e.target.value)} className="w-60">
                  {components.map((c) => (
                    <option key={c.id} value={c.id}>{c.code} — {c.name}</option>
                  ))}
                </Select>
              </Field>
            </div>
          }
        />
        {!periodId || !componentId ? (
          <EmptyState title="Select a period and component" description="Roster rows appear once both are chosen." />
        ) : !roster ? (
          <FullPageLoading label="Loading roster…" />
        ) : roster.length === 0 ? (
          <EmptyState title="No active enrollments in this period" />
        ) : (
          <>
            <Table>
              <THead>
                <Tr>
                  <Th>Student</Th>
                  {tab === 'attendance' ? (<><Th className="w-40">Attended sessions</Th><Th className="w-40">Total sessions</Th><Th>%</Th></>) : (<><Th className="w-40">Obtained marks</Th><Th className="w-40">Maximum marks</Th><Th>Outcome</Th></>)}
                </Tr>
              </THead>
              <TBody>
                {roster.map((row) => {
                  const key = `${row.enrollmentId}|${componentId}`;
                  const d = draft[key] ?? {};
                  const err = errorFor(row.enrollmentId);
                  const setD = (patch: Partial<typeof d>) => setDraft({ ...draft, [key]: { ...d, ...patch } });
                  return (
                    <Tr key={row.enrollmentId}>
                      <Td>
                        <div className="font-medium text-slate-800">{row.studentName}</div>
                        <div className="text-[11px] text-slate-400">{row.primaryIdentifier}</div>
                        {err && <div className="mt-0.5 text-[11px] font-semibold text-rose-600">{err}</div>}
                      </Td>
                      {tab === 'attendance' ? (
                        <>
                          <Td><input type="number" min={0} value={d.a ?? ''} onChange={(e) => setD({ a: e.target.value })} className={`w-28 rounded-lg border px-2.5 py-1.5 text-sm ${err ? 'border-rose-400 bg-rose-50' : 'border-slate-300'}`} /></Td>
                          <Td><input type="number" min={1} value={d.t ?? ''} onChange={(e) => setD({ t: e.target.value })} className={`w-28 rounded-lg border px-2.5 py-1.5 text-sm ${err ? 'border-rose-400 bg-rose-50' : 'border-slate-300'}`} /></Td>
                          <Td className="font-semibold">{d.a !== undefined && d.t !== undefined && d.a !== '' && d.t !== '' && !err ? `${Math.round((Number(d.a) / Number(d.t)) * 100)}%` : '—'}</Td>
                        </>
                      ) : (
                        <>
                          <Td><input type="number" min={0} value={d.o ?? ''} onChange={(e) => setD({ o: e.target.value })} className={`w-28 rounded-lg border px-2.5 py-1.5 text-sm ${err ? 'border-rose-400 bg-rose-50' : 'border-slate-300'}`} /></Td>
                          <Td><input type="number" min={1} value={d.m ?? component?.maximumMarks ?? ''} onChange={(e) => setD({ m: e.target.value })} placeholder={String(component?.maximumMarks ?? '')} className={`w-28 rounded-lg border px-2.5 py-1.5 text-sm ${err ? 'border-rose-400 bg-rose-50' : 'border-slate-300'}`} /></Td>
                          <Td>{d.o !== undefined && d.o !== '' ? <StatusBadge status={Number(d.o) >= (component?.passingMarks ?? 40) ? 'PASS' : 'FAIL'} /> : '—'}</Td>
                        </>
                      )}
                    </Tr>
                  );
                })}
              </TBody>
            </Table>
            <div className="flex items-center justify-between gap-3 border-t border-slate-100 px-5 py-4">
              <div className="text-xs text-slate-500">
                {hasErrors ? <span className="font-semibold text-rose-600">Fix validation errors before saving.</span> : `Component ${component?.code} · period closes ${formatDate(periods.find((p) => p.id === periodId)?.endDate)}`}
              </div>
              <Button onClick={save} disabled={saving || hasErrors}>
                {saving ? 'Saving…' : `Save ${titleCase(tab)} evidence`}
              </Button>
            </div>
          </>
        )}
      </Card>
    </div>
  );
}
