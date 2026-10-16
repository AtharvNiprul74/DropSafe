import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { listInterventions, transitionIntervention } from '../../api/services/ai';
import type { Intervention } from '../../types/models';
import { INTERVENTION_STATUSES } from '../../types/enums';
import { Badge, Button, Card, CardHeader, EmptyState, FullPageLoading, PageHeader, StatusBadge } from '../../components/ui/primitives';
import { Table, THead, TBody, Tr, Th, Td } from '../../components/ui/Table';
import { Tabs } from '../../components/ui/Tabs';
import { ConfirmModal } from '../../components/ui/Modal';
import { PrivacyNote } from '../../components/ui/PrivacyNote';
import { useToast } from '../../components/ui/Toast';
import { useAuth } from '../../auth/AuthContext';
import { allowedTransitions } from '../../lib/transitions';
import { formatDate, formatDateTime, titleCase } from '../../lib/format';
import { P } from '../../lib/permissions';
import { Can } from '../../auth/guards';

export default function InterventionsPage() {
  const { notify } = useToast();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [rows, setRows] = useState<Intervention[] | null>(null);
  const [status, setStatus] = useState('');
  const [confirm, setConfirm] = useState<{ row: Intervention; to: string } | null>(null);
  const [onlyMine, setOnlyMine] = useState(false);

  const load = async () => setRows(await listInterventions(status || undefined));
  useEffect(() => {
    void load().catch((e) => notify(e?.message ?? 'Failed to load interventions', 'error'));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status]);

  if (!rows) return <FullPageLoading label="Loading interventions…" />;

  const filtered = onlyMine ? rows.filter((r) => r.responsibleUserId === user?.id) : rows;

  return (
    <div>
      <PageHeader
        title="Interventions"
        subtitle="Human-led support actions. Lifecycle: PLANNED → IN_PROGRESS → COMPLETED · cancelled interventions cannot resume."
        actions={
          <label className="flex cursor-pointer items-center gap-2 text-xs font-medium text-slate-600">
            <input type="checkbox" checked={onlyMine} onChange={(e) => setOnlyMine(e.target.checked)} className="h-4 w-4 accent-brand-600" />
            Only my responsibility
          </label>
        }
      />

      <Tabs
        active={status || 'ALL'}
        onChange={(id) => setStatus(id === 'ALL' ? '' : id)}
        tabs={[{ id: 'ALL', label: 'All', count: rows.length }, ...INTERVENTION_STATUSES.map((s) => ({ id: s, label: titleCase(s), count: rows.filter((r) => r.status === s).length }))]}
      />

      <PrivacyNote title="Human-in-the-loop">
        An AI prediction is decision support only — every intervention shown here was created by a person after
        human review (PRD §5/§15). HIGH risk does not automatically mean counseling.
      </PrivacyNote>

      <Card className="mt-5">
        {filtered.length === 0 ? (
          <EmptyState title="No interventions" description="Interventions are created from the Risk Monitoring board after human review." />
        ) : (
          <Table>
            <THead>
              <Tr><Th>Intervention</Th><Th>Student</Th><Th>Type</Th><Th>Priority</Th><Th>Status</Th><Th>Responsible</Th><Th>Created</Th><Th className="text-right">Actions</Th></Tr>
            </THead>
            <TBody>
              {filtered.map((i) => (
                <Tr key={i.id} onClick={() => navigate(`/counseling/interventions/${i.id}`)}>
                  <Td className="max-w-[260px]">
                    <div className="truncate font-semibold text-slate-800">{i.title}</div>
                    {i.predictionId && <div className="text-[10px] text-slate-400">informed by prediction {i.predictionId}</div>}
                  </Td>
                  <Td className="text-xs">{i.studentName}</Td>
                  <Td><Badge tone="slate">{titleCase(i.interventionType)}</Badge></Td>
                  <Td><StatusBadge status={i.priority} /></Td>
                  <Td>
                    <StatusBadge status={i.status} />
                    {i.completedAt && <div className="mt-0.5 text-[10px] text-slate-400">{formatDate(i.completedAt)}</div>}
                  </Td>
                  <Td className="text-xs">{i.responsibleUserName}</Td>
                  <Td className="text-xs text-slate-500">{formatDateTime(i.createdAt)}</Td>
                  <Td onClick={(e) => e.stopPropagation()}>
                    <Can anyOf={[P.counselingUpdate]}>
                      <div className="flex justify-end gap-1.5">
                        {allowedTransitions('intervention', i.status).map((to) => (
                          <Button key={to} size="sm" variant={to === 'CANCELLED' ? 'danger' : to === 'COMPLETED' ? 'success' : 'secondary'} onClick={() => setConfirm({ row: i, to })}>
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

      <ConfirmModal
        open={!!confirm}
        onClose={() => setConfirm(null)}
        danger={confirm?.to === 'CANCELLED'}
        title={`${titleCase(confirm?.to)} intervention`}
        confirmLabel={confirm?.to === 'COMPLETED' ? 'Complete (sets completed_at)' : `Set ${titleCase(confirm?.to)}`}
        message={
          confirm
            ? confirm.to === 'COMPLETED'
              ? `Mark "${confirm.row.title}" as COMPLETED? The completion timestamp (completed_at) is required and will be recorded.`
              : confirm.to === 'CANCELLED'
                ? `Cancel "${confirm.row.title}"? A cancelled intervention cannot resume and remains preserved in history.`
                : `Move "${confirm.row.title}" to ${titleCase(confirm.to)}?`
            : ''
        }
        onConfirm={async () => {
          if (!confirm) return;
          try {
            await transitionIntervention(confirm.row.id, confirm.to);
            notify(`Intervention ${titleCase(confirm.to).toLowerCase()}.`);
            setConfirm(null);
            await load();
          } catch (e: any) {
            notify(e?.message ?? 'Transition rejected', 'error');
          }
        }}
      />
    </div>
  );
}
