import { useEffect, useState } from 'react';
import { decideMentorAccess, listMentorAccess } from '../../api/services/admin';
import type { MentorAccessRequest } from '../../types/models';
import { Badge, Button, Card, CardHeader, EmptyState, FullPageLoading, PageHeader, StatusBadge } from '../../components/ui/primitives';
import { Table, THead, TBody, Tr, Th, Td } from '../../components/ui/Table';
import { ConfirmModal } from '../../components/ui/Modal';
import { PrivacyNote } from '../../components/ui/PrivacyNote';
import { useToast } from '../../components/ui/Toast';
import { formatDateTime, titleCase } from '../../lib/format';

export default function MentorAccessPage() {
  const { notify } = useToast();
  const [rows, setRows] = useState<MentorAccessRequest[] | null>(null);
  const [decision, setDecision] = useState<{ req: MentorAccessRequest; approve: boolean } | null>(null);
  const [busy, setBusy] = useState(false);

  const load = async () => setRows(await listMentorAccess());
  useEffect(() => {
    void load().catch((e) => notify(e?.message ?? 'Failed to load', 'error'));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!rows) return <FullPageLoading label="Loading requests…" />;

  const pending = rows.filter((r) => r.status === 'PENDING');
  const decided = rows.filter((r) => r.status !== 'PENDING');

  return (
    <div>
      <PageHeader
        title="Mentor Access Approvals"
        subtitle="AI recommends — the Organization Admin decides. AI can never grant mentor access by itself (PRD §17)."
      />

      <PrivacyNote title="Limited mentor access">
        Approved mentors see assigned students and <em>approved</em> behaviour summaries only. Raw chatbot
        conversations and AI-internal analysis are never exposed to any portal role.
      </PrivacyNote>

      <Card className="mt-5">
        <CardHeader title="Pending review" subtitle={pending.length ? `${pending.length} request(s) awaiting your decision` : 'Nothing awaiting review'} />
        {pending.length === 0 ? (
          <EmptyState title="No pending requests" description="AI-triggered recommendations and manual mentor access requests will appear here." />
        ) : (
          <Table>
            <THead>
              <Tr><Th>Mentor</Th><Th>Student</Th><Th>Source</Th><Th>Reason</Th><Th>Requested</Th><Th className="text-right">Decision</Th></Tr>
            </THead>
            <TBody>
              {pending.map((r) => (
                <Tr key={r.id}>
                  <Td className="font-semibold">{r.mentorName}</Td>
                  <Td>{r.studentName}</Td>
                  <Td>{r.source === 'AI_RECOMMENDATION' ? <Badge tone="violet">AI Recommendation</Badge> : <Badge tone="blue">Manual</Badge>}</Td>
                  <Td className="max-w-sm text-xs text-slate-600">{r.reason}</Td>
                  <Td className="text-xs text-slate-500">{formatDateTime(r.createdAt)}</Td>
                  <Td>
                    <div className="flex justify-end gap-1.5">
                      <Button size="sm" variant="success" onClick={() => setDecision({ req: r, approve: true })}>Approve</Button>
                      <Button size="sm" variant="danger" onClick={() => setDecision({ req: r, approve: false })}>Reject</Button>
                    </div>
                  </Td>
                </Tr>
              ))}
            </TBody>
          </Table>
        )}
      </Card>

      {decided.length > 0 && (
        <Card className="mt-5">
          <CardHeader title="Decision history" subtitle="Approvals and rejections are preserved" />
          <Table>
            <THead>
              <Tr><Th>Mentor</Th><Th>Student</Th><Th>Source</Th><Th>Decision</Th><Th>Decided by</Th><Th>Decided at</Th></Tr>
            </THead>
            <TBody>
              {decided.map((r) => (
                <Tr key={r.id}>
                  <Td className="font-semibold">{r.mentorName}</Td>
                  <Td>{r.studentName}</Td>
                  <Td>{r.source === 'AI_RECOMMENDATION' ? <Badge tone="violet">AI</Badge> : <Badge tone="blue">Manual</Badge>}</Td>
                  <Td><StatusBadge status={r.status} /></Td>
                  <Td className="text-xs">{r.decidedByName}</Td>
                  <Td className="text-xs text-slate-500">{formatDateTime(r.decidedAt)}</Td>
                </Tr>
              ))}
            </TBody>
          </Table>
        </Card>
      )}

      <ConfirmModal
        open={!!decision}
        onClose={() => setDecision(null)}
        danger={!decision?.approve}
        busy={busy}
        title={decision?.approve ? 'Approve mentor access' : 'Reject mentor access'}
        confirmLabel={decision?.approve ? 'Approve access' : 'Reject request'}
        message={
          decision
            ? decision.approve
              ? `Grant ${decision.req.mentorName} limited access to ${decision.req.studentName}? This covers assigned-student monitoring and approved behaviour summaries — never raw chatbot conversations. The decision will be audit-logged.`
              : `Reject ${decision.req.mentorName}'s access to ${decision.req.studentName}? AI support continues without granting human access. The decision will be audit-logged.`
            : ''
        }
        onConfirm={async () => {
          if (!decision) return;
          setBusy(true);
          try {
            await decideMentorAccess(decision.req.id, decision.approve);
            notify(decision.approve ? 'Access approved.' : 'Request rejected.');
            setDecision(null);
            await load();
          } catch (e: any) {
            notify(e?.message ?? 'Failed', 'error');
          } finally {
            setBusy(false);
          }
        }}
      />
    </div>
  );
}
