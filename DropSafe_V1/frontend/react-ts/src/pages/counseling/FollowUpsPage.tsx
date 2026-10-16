import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { listFollowUps, transitionFollowUp } from '../../api/services/ai';
import type { FollowUp } from '../../types/models';
import { FOLLOW_UP_STATUSES } from '../../types/enums';
import { Badge, Button, Card, EmptyState, FullPageLoading, PageHeader, StatusBadge } from '../../components/ui/primitives';
import { Table, THead, TBody, Tr, Th, Td } from '../../components/ui/Table';
import { Tabs } from '../../components/ui/Tabs';
import { useToast } from '../../components/ui/Toast';
import { useAuth } from '../../auth/AuthContext';
import { allowedTransitions } from '../../lib/transitions';
import { daysUntil, formatDate, titleCase } from '../../lib/format';
import { P } from '../../lib/permissions';
import { Can } from '../../auth/guards';

export default function FollowUpsPage() {
  const { notify } = useToast();
  const { isAdmin } = useAuth();
  const [rows, setRows] = useState<FollowUp[] | null>(null);
  const [status, setStatus] = useState('PENDING');
  const [mine, setMine] = useState(!isAdmin);

  const load = async () => setRows(await listFollowUps({ mine, status: status || undefined }));
  useEffect(() => {
    void load().catch((e) => notify(e?.message ?? 'Failed to load follow-ups', 'error'));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, mine]);

  if (!rows) return <FullPageLoading label="Loading follow-ups…" />;

  return (
    <div>
      <PageHeader
        title="Follow-ups"
        subtitle="Reviews, check-ins, actions and referrals after interventions and counseling sessions."
        actions={
          <label className="flex cursor-pointer items-center gap-2 text-xs font-medium text-slate-600">
            <input type="checkbox" checked={mine} onChange={(e) => setMine(e.target.checked)} className="h-4 w-4 accent-brand-600" />
            Only assigned to me
          </label>
        }
      />

      <Tabs
        active={status || 'ALL'}
        onChange={(id) => setStatus(id === 'ALL' ? '' : id)}
        tabs={[{ id: 'ALL', label: 'All' }, ...FOLLOW_UP_STATUSES.map((s) => ({ id: s, label: titleCase(s) }))]}
      />

      <Card>
        {rows.length === 0 ? (
          <EmptyState title="No follow-ups" description="Follow-ups are created from an intervention's detail page." />
        ) : (
          <Table>
            <THead>
              <Tr><Th>Type</Th><Th>Intervention</Th><Th>Student</Th><Th>Due</Th><Th>Assigned</Th><Th>Status</Th><Th className="text-right">Actions</Th></Tr>
            </THead>
            <TBody>
              {rows.map((f) => {
                const d = daysUntil(f.dueDate);
                return (
                  <Tr key={f.id}>
                    <Td><Badge tone="slate">{titleCase(f.followUpType)}</Badge></Td>
                    <Td>
                      <Link to={`/counseling/interventions/${f.interventionId}`} className="text-xs font-semibold text-brand-600 hover:underline">
                        {f.interventionTitle}
                      </Link>
                    </Td>
                    <Td className="text-xs">{f.studentName}</Td>
                    <Td>
                      <div className="text-xs">{formatDate(f.dueDate)}</div>
                      {f.status === 'PENDING' && d !== null && (
                        <div className={`text-[10px] font-semibold ${d < 0 ? 'text-rose-600' : d <= 2 ? 'text-amber-600' : 'text-slate-400'}`}>
                          {d < 0 ? `${-d}d overdue` : d === 0 ? 'Due today' : `in ${d}d`}
                        </div>
                      )}
                    </Td>
                    <Td className="text-xs">{f.assignedUserName}</Td>
                    <Td><StatusBadge status={f.status} /></Td>
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
                );
              })}
            </TBody>
          </Table>
        )}
      </Card>
    </div>
  );
}
