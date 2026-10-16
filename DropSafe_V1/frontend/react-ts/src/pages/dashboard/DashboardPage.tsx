import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../auth/AuthContext';
import { reportSummary } from '../../api/services/governance';
import type { ReportSummary } from '../../api/services/governance';
import { riskBoard } from '../../api/services/ai';
import type { RiskBoardRow } from '../../types/models';
import { Card, CardHeader, Stat, StatusBadge, RiskBadge, FullPageLoading, PageHeader } from '../../components/ui/primitives';
import { Donut } from '../../components/ui/charts';
import { Table, THead, TBody, Tr, Th, Td } from '../../components/ui/Table';
import { formatDateTime, titleCase } from '../../lib/format';
import { P } from '../../lib/permissions';

export default function DashboardPage() {
  const { user, isAdmin, isMentor, canAny } = useAuth();
  const [summary, setSummary] = useState<ReportSummary | null>(null);
  const [board, setBoard] = useState<RiskBoardRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let live = true;
    (async () => {
      try {
        if (canAny(P.governanceView, P.reportView, P.predictionView)) {
          setSummary(await reportSummary());
        }
        if (canAny(P.predictionView)) {
          setBoard((await riskBoard('HIGH')).slice(0, 6));
        } else {
          setBoard([]);
        }
      } catch (e: any) {
        if (live) setError(e?.message ?? 'Failed to load dashboard.');
      }
    })();
    return () => {
      live = false;
    };
  }, [canAny]);

  if (error) return <div className="rounded-xl bg-rose-50 p-4 text-sm text-rose-700 ring-1 ring-inset ring-rose-200">{error}</div>;
  if (summary === null && canAny(P.governanceView, P.reportView)) return <FullPageLoading label="Loading dashboard…" />;

  const risk = summary?.risk;

  return (
    <div>
      <PageHeader
        title={`Welcome back, ${user?.name.split(' ')[0]}`}
        subtitle={
          isAdmin
            ? 'Organization overview — evidence flows from imports to snapshots, predictions and human review.'
            : isMentor
              ? 'Your assigned caseload — AI supports; you decide interventions.'
              : 'Academic evidence hub — attendance and assessment uploads feed the prediction pipeline.'
        }
      />

      {summary && (
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
          <Stat label="Students" value={summary.students} sub={`${summary.activeStudents} active`} tone="blue" />
          <Stat label="High risk" value={summary.risk.HIGH} sub="latest predictions" tone="red" />
          <Stat label="Medium risk" value={summary.risk.MEDIUM} tone="amber" />
          <Stat label="Open interventions" value={summary.openInterventions} tone="indigo" />
          <Stat label="Pending follow-ups" value={summary.pendingFollowUps} tone="violet" />
          {isAdmin && <Stat label="Mentor access requests" value={summary.pendingMentorAccess} sub="awaiting review" tone="amber" />}
          {!isAdmin && <Stat label="Low risk" value={summary.risk.LOW} tone="green" />}
        </div>
      )}

      <div className="mt-6 grid gap-5 xl:grid-cols-3">
        {/* Risk distribution */}
        {risk && canAny(P.predictionView) && (
          <Card>
            <CardHeader title="Risk distribution" subtitle="Latest prediction per student (insights from the active AI model)" />
            <div className="flex justify-center px-5 py-6">
              <Donut
                centerLabel="students"
                centerValue={risk.HIGH + risk.MEDIUM + risk.LOW + risk.UNAVAILABLE}
                segments={[
                  { value: risk.HIGH, color: '#f43f5e', label: 'High risk' },
                  { value: risk.MEDIUM, color: '#f59e0b', label: 'Medium risk' },
                  { value: risk.LOW, color: '#10b981', label: 'Low risk' },
                  { value: risk.UNAVAILABLE, color: '#cbd5e1', label: 'No prediction yet' },
                ]}
              />
            </div>
            <div className="border-t border-slate-100 px-5 py-3 text-[11px] text-slate-400">
              Predictions are decision support only — they never auto-create interventions (PRD §5).
            </div>
          </Card>
        )}

        {/* High-risk watchlist */}
        {canAny(P.predictionView) && (
          <Card className="xl:col-span-2">
            <CardHeader
              title={isMentor ? 'My high-risk students' : 'High-risk watchlist'}
              subtitle="Requires human review — prediction is not a determination"
              actions={<Link to="/risk" className="text-xs font-semibold text-brand-600 hover:underline">Open risk monitoring →</Link>}
            />
            {!board ? (
              <FullPageLoading label="Loading…" />
            ) : board.length === 0 ? (
              <div className="px-5 py-8 text-center text-sm text-slate-400">No HIGH-risk students in your scope. 🎉</div>
            ) : (
              <Table>
                <THead>
                  <Tr><Th>Student</Th><Th>Programme</Th><Th>Prediction</Th><Th>Score</Th><Th>Open intervention</Th></Tr>
                </THead>
                <TBody>
                  {board.map((r) => (
                    <Tr key={r.studentId}>
                      <Td>
                        <Link to={`/academic/students/${r.studentId}`} className="font-semibold text-slate-800 hover:text-brand-600">
                          {r.studentName}
                        </Link>
                        <div className="text-[11px] text-slate-400">{r.primaryIdentifier}</div>
                      </Td>
                      <Td className="text-xs">{r.programName ?? '—'}<div className="text-[11px] text-slate-400">{r.levelName}</div></Td>
                      <Td><RiskBadge label="HIGH" /></Td>
                      <Td className="font-semibold">{r.prediction?.predictionScore ?? '—'}</Td>
                      <Td>{r.hasOpenIntervention ? <StatusBadge status="IN_PROGRESS" /> : <span className="text-xs text-slate-400">None yet</span>}</Td>
                    </Tr>
                  ))}
                </TBody>
              </Table>
            )}
          </Card>
        )}
      </div>

      {/* Recent imports */}
      {summary && summary.recentImports.length > 0 && canAny(P.importView, P.importHistory, P.importCreate) && (
        <Card className="mt-5">
          <CardHeader
            title="Recent import sessions"
            subtitle="Upload → Validate → Preview → Process → Commit"
            actions={<Link to="/imports" className="text-xs font-semibold text-brand-600 hover:underline">All imports →</Link>}
          />
          <Table>
            <THead>
              <Tr><Th>Type</Th><Th>File</Th><Th>Status</Th><Th>Initiated by</Th><Th>Created</Th></Tr>
            </THead>
            <TBody>
              {summary.recentImports.map((i) => (
                <Tr key={i.id}>
                  <Td className="font-medium">{titleCase(i.importType)}</Td>
                  <Td className="text-xs text-slate-500">{i.fileName}</Td>
                  <Td><StatusBadge status={i.status} /></Td>
                  <Td className="text-xs">{i.createdByName}</Td>
                  <Td className="text-xs text-slate-500">{formatDateTime(i.createdAt)}</Td>
                </Tr>
              ))}
            </TBody>
          </Table>
        </Card>
      )}
    </div>
  );
}
