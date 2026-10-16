import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { myStudents } from '../../api/services/students';
import type { StudentListRow } from '../../api/services/students';
import { Avatar, Card, EmptyState, FullPageLoading, PageHeader, RiskBadge, StatusBadge } from '../../components/ui/primitives';
import { PrivacyNote } from '../../components/ui/PrivacyNote';
import { useToast } from '../../components/ui/Toast';

/** Mentor caseload — assigned students only (PRD §3/§17). */
export default function MyStudentsPage() {
  const { notify } = useToast();
  const [rows, setRows] = useState<StudentListRow[] | null>(null);

  useEffect(() => {
    myStudents().then(setRows).catch((e) => notify(e?.message ?? 'Failed to load your students', 'error'));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!rows) return <FullPageLoading label="Loading your students…" />;

  return (
    <div>
      <PageHeader
        title="My Students"
        subtitle="Your assigned caseload. You see academic summaries and approved behaviour summaries — never raw chatbot conversations."
      />

      <PrivacyNote title="Assigned access">
        Access is limited to students assigned to you with administrator approval (PRD §17). Behaviour summaries
        you can view have been approved; prediction labels support — but never force — your decisions.
      </PrivacyNote>

      {rows.length === 0 ? (
        <Card className="mt-5">
          <EmptyState title="No assigned students yet" description="Ask your Organization Admin to assign students or approve an access request." />
        </Card>
      ) : (
        <div className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {rows.map((s) => {
            const pred = s.latestPrediction;
            return (
              <Link key={s.id} to={`/academic/students/${s.id}`} className="group">
                <Card className="h-full p-5 transition group-hover:border-brand-300 group-hover:shadow-md">
                  <div className="flex items-center gap-3">
                    <Avatar name={`${s.firstName} ${s.lastName}`} className="h-11 w-11 text-sm" />
                    <div className="min-w-0 flex-1">
                      <div className="truncate font-semibold text-slate-900">{s.firstName} {s.lastName}</div>
                      <div className="text-[11px] text-slate-400">{s.primaryIdentifier}</div>
                    </div>
                    <StatusBadge status={s.status} />
                  </div>
                  <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-3 text-xs">
                    <span className="text-slate-500">
                      {s.enrollment ? `${s.enrollment.levelName} · ${s.enrollment.periodCode}` : 'No active enrollment'}
                    </span>
                    {pred ? <RiskBadge label={pred.predictionLabel} /> : <RiskBadge label="UNAVAILABLE" />}
                  </div>
                </Card>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
