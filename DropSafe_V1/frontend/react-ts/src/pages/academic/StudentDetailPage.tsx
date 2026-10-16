import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { getStudent } from '../../api/services/students';
import { studentInsights } from '../../api/services/ai';
import type { StudentInsights } from '../../api/services/ai';
import type { StudentDetail } from '../../types/models';
import { Badge, Card, CardHeader, FullPageLoading, KV, PageHeader, RiskBadge, StatusBadge } from '../../components/ui/primitives';
import { Table, THead, TBody, Tr, Th, Td } from '../../components/ui/Table';
import { Tabs } from '../../components/ui/Tabs';
import { Meter, TrendLine } from '../../components/ui/charts';
import { PrivacyNote } from '../../components/ui/PrivacyNote';
import { useAuth } from '../../auth/AuthContext';
import { useToast } from '../../components/ui/Toast';
import { formatDate, formatDateTime, pct, titleCase } from '../../lib/format';
import { P } from '../../lib/permissions';

export default function StudentDetailPage() {
  const { id = '' } = useParams();
  const { notify } = useToast();
  const { canAny, isAdmin, isMentor } = useAuth();
  const [detail, setDetail] = useState<StudentDetail | null>(null);
  const [insights, setInsights] = useState<StudentInsights | null>(null);
  const [tab, setTab] = useState('overview');
  const canSeePredictions = canAny(P.predictionView);
  const canSeeHistory = canAny(P.predictionHistory);

  useEffect(() => {
    (async () => {
      try {
        setDetail(await getStudent(id));
        if (canSeePredictions) setInsights(await studentInsights(id));
      } catch (e: any) {
        notify(e?.message ?? 'Failed to load student', 'error');
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  if (!detail) return <FullPageLoading label="Loading student…" />;

  const { student, identifiers, enrollments, attendance, assessments } = detail;
  const latestSnapshot = insights?.snapshots.filter((s) => s.status !== 'SUPERSEDED').at(-1);
  const latestPrediction = insights?.predictions.at(-1);
  const summaries = insights?.behaviourSummaries ?? [];

  const attendancePct =
    attendance.length > 0
      ? Math.round((attendance.reduce((s, a) => s + a.attendedSessions / a.totalSessions, 0) / attendance.length) * 100)
      : null;

  return (
    <div>
      <PageHeader
        crumbs={['Academic', 'Students', `${student.firstName} ${student.lastName}`]}
        title={`${student.firstName} ${student.lastName}`}
        subtitle="Student 360 — identity, enrollments, source evidence and AI intelligence kept clearly separated."
        actions={
          <div className="flex items-center gap-2">
            <StatusBadge status={student.status} />
            {latestPrediction && <RiskBadge label={latestPrediction.predictionLabel} />}
          </div>
        }
      />

      <Tabs
        active={tab}
        onChange={setTab}
        tabs={[
          { id: 'overview', label: 'Overview' },
          { id: 'evidence', label: 'Evidence (attendance & assessment)' },
          ...(canSeePredictions ? [{ id: 'insights', label: 'AI Insights', count: insights?.behaviourSummaries.length }] : []),
        ]}
      />

      {tab === 'overview' && (
        <div className="grid gap-5 lg:grid-cols-2">
          <Card>
            <CardHeader title="Identity" subtitle="Personal information only (PRD §8 — students table)" />
            <div className="divide-y divide-slate-100 px-5">
              <KV k="Status" v={<StatusBadge status={student.status} />} />
              <KV k="Email" v={student.email ?? '—'} />
              <KV k="Phone" v={student.phone ?? '—'} />
              <KV k="Parent / guardian" v={student.guardianName ?? '—'} />
              <KV k="Guardian phone" v={student.guardianPhone ?? '—'} />
              <KV k="Record created" v={formatDateTime(student.createdAt)} />
            </div>
          </Card>
          <div className="space-y-5">
            <Card>
              <CardHeader title="Identifiers" subtitle="Unique per organization · one primary per student" />
              <Table>
                <THead><Tr><Th>Type</Th><Th>Value</Th><Th>Primary</Th><Th>Status</Th></Tr></THead>
                <TBody>
                  {identifiers.map((i) => (
                    <Tr key={i.id}>
                      <Td>{titleCase(i.identifierType)}</Td>
                      <Td className="font-mono text-xs">{i.identifierValue}</Td>
                      <Td>{i.isPrimary ? <Badge tone="indigo">Primary</Badge> : '—'}</Td>
                      <Td><StatusBadge status={i.status} /></Td>
                    </Tr>
                  ))}
                </TBody>
              </Table>
            </Card>
            <Card>
              <CardHeader title="Enrollments" subtitle="Academic participation — historical enrollments preserved" />
              <Table>
                <THead><Tr><Th>Program</Th><Th>Period</Th><Th>Status</Th><Th>Since</Th></Tr></THead>
                <TBody>
                  {enrollments.map((e) => (
                    <Tr key={e.id}>
                      <Td className="text-xs font-medium">{e.programName}<div className="text-[11px] text-slate-400">{e.levelName}</div></Td>
                      <Td className="text-xs">{e.periodCode}</Td>
                      <Td><StatusBadge status={e.status} /></Td>
                      <Td className="text-xs text-slate-500">{formatDate(e.enrolledAt)}</Td>
                    </Tr>
                  ))}
                  {enrollments.length === 0 && (
                    <Tr><Td colSpan={4} className="text-center text-xs text-slate-400">No enrollments recorded.</Td></Tr>
                  )}
                </TBody>
              </Table>
            </Card>
          </div>
        </div>
      )}

      {tab === 'evidence' && (
        <div className="space-y-5">
          <PrivacyNote title="Source evidence">
            Attendance and assessment are <strong>source business evidence</strong>. Derived percentages are
            computed for display — never stored on these tables — and AI values never live here. Updates flow
            through approved Import Sessions (PRD §8/§10).
          </PrivacyNote>
          <div className="grid gap-5 lg:grid-cols-2">
            <Card>
              <CardHeader title="Attendance evidence" subtitle={attendancePct !== null ? `Overall ${attendancePct}% (derived)` : 'No attendance evidence yet'} />
              <Table>
                <THead><Tr><Th>Component</Th><Th>Attended</Th><Th>Total</Th><Th>% (derived)</Th><Th>Updated</Th></Tr></THead>
                <TBody>
                  {attendance.map((a) => (
                    <Tr key={a.id}>
                      <Td className="text-xs font-medium">{a.componentCode} <span className="text-slate-400">{a.componentName}</span></Td>
                      <Td>{a.attendedSessions}</Td>
                      <Td>{a.totalSessions}</Td>
                      <Td className="font-semibold">{pct((a.attendedSessions / a.totalSessions) * 100)}</Td>
                      <Td className="text-xs text-slate-500">{formatDate(a.updatedAt)}</Td>
                    </Tr>
                  ))}
                  {attendance.length === 0 && <Tr><Td colSpan={5} className="py-6 text-center text-xs text-slate-400">No attendance records.</Td></Tr>}
                </TBody>
              </Table>
            </Card>
            <Card>
              <CardHeader title="Assessment evidence" subtitle="No derived GPA/CGPA stored on source records" />
              <Table>
                <THead><Tr><Th>Component</Th><Th>Obtained</Th><Th>Max</Th><Th>Outcome</Th><Th>Updated</Th></Tr></THead>
                <TBody>
                  {assessments.map((a) => (
                    <Tr key={a.id}>
                      <Td className="text-xs font-medium">{a.componentCode} <span className="text-slate-400">{a.componentName}</span></Td>
                      <Td>{a.obtainedMarks}</Td>
                      <Td>{a.maximumMarks}</Td>
                      <Td><StatusBadge status={a.gradingOutcome} /></Td>
                      <Td className="text-xs text-slate-500">{formatDate(a.updatedAt)}</Td>
                    </Tr>
                  ))}
                  {assessments.length === 0 && <Tr><Td colSpan={5} className="py-6 text-center text-xs text-slate-400">No assessment records.</Td></Tr>}
                </TBody>
              </Table>
            </Card>
          </div>
        </div>
      )}

      {tab === 'insights' && canSeePredictions && (
        <div className="space-y-5">
          <PrivacyNote title="AI decision support">
            Predictions and behaviour summaries are <strong>AI intelligence</strong> — they support humans, they
            never decide. Snapshots are immutable; a HIGH label does not automatically create an intervention or
            counseling session (PRD §5/§13/§15).
          </PrivacyNote>

          {!latestSnapshot ? (
            <Card>
              <div className="flex flex-col items-center gap-2 px-6 py-10 text-center">
                <RiskBadge label="UNAVAILABLE" />
                <div className="max-w-md text-sm font-medium text-slate-700">Prediction unavailable — insufficient evidence</div>
                <p className="max-w-md text-xs text-slate-500">
                  The engine does not guess when evidence is insufficient (PRD §14/§30). This student has no
                  snapshot yet; evidence will flow in through the next approved import.
                </p>
              </div>
            </Card>
          ) : (
            <div className="grid gap-5 lg:grid-cols-3">
              {/* Snapshot features */}
              <Card className="lg:col-span-2">
                <CardHeader
                  title="Latest student snapshot"
                  subtitle={`Generated ${formatDateTime(latestSnapshot.generatedAt)} · feature version ${latestSnapshot.featureVersion}`}
                  actions={<StatusBadge status={latestSnapshot.status} />}
                />
                <div className="grid gap-x-8 gap-y-4 px-5 py-5 sm:grid-cols-2">
                  <SnapshotMeter label="Attendance percentage" value={latestSnapshot.attendancePercentage} invert />
                  <SnapshotMeter label="Overall marks percentage" value={latestSnapshot.overallMarksPercentage} invert />
                  <SnapshotMeter label="Behaviour score" value={latestSnapshot.behaviourScore} invert />
                  <SnapshotMeter label="Engagement score" value={latestSnapshot.engagementScore} invert />
                  <SnapshotMeter label="Sentiment score" value={latestSnapshot.sentimentScore} invert />
                  <div className="flex items-end justify-between gap-4 text-sm">
                    <div>
                      <div className="text-xs font-medium text-slate-500">Failed components</div>
                      <div className="text-xl font-bold text-slate-900">{latestSnapshot.failedLearningComponents}</div>
                    </div>
                    <div className="text-right">
                      <div className="text-xs font-medium text-slate-500">Backlog count</div>
                      <div className="text-xl font-bold text-slate-900">{latestSnapshot.backlogCount}</div>
                    </div>
                  </div>
                </div>
                {latestPrediction && (
                  <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 px-5 py-4">
                    <div className="flex items-center gap-3">
                      <RiskBadge label={latestPrediction.predictionLabel} />
                      <span className="text-xs text-slate-500">
                        Score {latestPrediction.predictionScore}/100 · model v{latestPrediction.aiModelVersion} · {formatDateTime(latestPrediction.generatedAt)}
                      </span>
                    </div>
                    <Link to="/counseling/interventions" className="text-xs font-semibold text-brand-600 hover:underline">
                      Review in interventions →
                    </Link>
                  </div>
                )}
              </Card>

              {/* Prediction history */}
              <Card>
                <CardHeader title="Prediction history" subtitle="Immutable trend (risk probability)" />
                <div className="px-5 py-6">
                  {canSeeHistory ? (
                    insights && insights.history.length > 0 ? (
                      <TrendLine points={insights.history.map((h) => ({ label: h.generatedAt.slice(0, 10), value: h.riskProbability }))} />
                    ) : (
                      <div className="text-xs text-slate-400">No historical records yet.</div>
                    )
                  ) : (
                    <div className="text-xs text-slate-400">You need the <code>prediction:history</code> permission to view trends.</div>
                  )}
                </div>
                {canSeeHistory && insights && insights.history.length > 0 && (
                  <div className="border-t border-slate-100 px-5 py-3 text-[11px] text-slate-400">
                    {insights.history.length} records · models {Array.from(new Set(insights.history.map((h) => h.aiModelVersion))).join(', ')}
                  </div>
                )}
              </Card>
            </div>
          )}

          {/* Behaviour summaries */}
          <Card>
            <CardHeader title="Behaviour summaries" subtitle="AI-generated insights tied to snapshots — they never replace raw conversations" />
            {summaries.length === 0 ? (
              <div className="px-5 py-8 text-center text-sm text-slate-400">
                {isMentor
                  ? 'No approved behaviour summaries for your access. Approval flows through the Organization Admin.'
                  : 'No behaviour summaries generated yet.'}
              </div>
            ) : (
              <div className="space-y-4 px-5 py-5">
                {summaries.map((b) => (
                  <div key={b.id} className="rounded-xl border border-slate-200 p-4">
                    <div className="flex flex-wrap items-center gap-2">
                      <StatusBadge status={b.dominantSentiment} />
                      <Badge tone="slate">confidence {b.confidenceScore}/100</Badge>
                      <Badge tone="slate">model v{b.aiModelVersion}</Badge>
                      {b.approvedForMentor ? <Badge tone="indigo">Approved for mentor</Badge> : <Badge tone="amber">Restricted</Badge>}
                      <span className="ml-auto text-[11px] text-slate-400">{formatDateTime(b.generatedAt)}</span>
                    </div>
                    <p className="mt-2.5 text-sm leading-relaxed text-slate-700">{b.summary}</p>
                  </div>
                ))}
              </div>
            )}
            <div className="border-t border-slate-100 px-5 py-3">
              <PrivacyNote title="Raw conversations stay sealed">
                Raw chatbot messages are sensitivity level <strong>Critical</strong>: append-only, immutable, and
                never exposed to any portal role including administrators (PRD §17).
              </PrivacyNote>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}

function SnapshotMeter({ label, value, invert = false }: { label: string; value: number; invert?: boolean }) {
  const tone = value >= 75 ? 'green' : value >= 55 ? 'amber' : 'red';
  return (
    <div>
      <div className="mb-1 flex items-center justify-between text-xs">
        <span className="font-medium text-slate-500">{label}</span>
      </div>
      <Meter value={value} tone={tone} />
    </div>
  );
}
