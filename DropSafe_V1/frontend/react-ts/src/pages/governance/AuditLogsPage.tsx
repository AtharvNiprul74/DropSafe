import { useEffect, useState } from 'react';
import { listAuditLogs } from '../../api/services/governance';
import type { AuditLog } from '../../types/models';
import { Badge, Card, CardHeader, FullPageLoading, PageHeader, SearchInput, Select, StatusBadge } from '../../components/ui/primitives';
import { Table, THead, TBody, Tr, Th, Td } from '../../components/ui/Table';
import { PrivacyNote } from '../../components/ui/PrivacyNote';
import { useToast } from '../../components/ui/Toast';
import { formatDateTime } from '../../lib/format';

export default function AuditLogsPage() {
  const { notify } = useToast();
  const [rows, setRows] = useState<AuditLog[] | null>(null);
  const [q, setQ] = useState('');
  const [outcome, setOutcome] = useState('');

  useEffect(() => {
    const t = setTimeout(() => {
      listAuditLogs({ q, outcome }).then(setRows).catch((e) => notify(e?.message ?? 'Failed to load audit logs', 'error'));
    }, 200);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q, outcome]);

  return (
    <div>
      <PageHeader title="Audit Logs" subtitle="Immutable, append-only evidence that important business and admin actions occurred." />
      <PrivacyNote title="No sensitive payloads">
        Audit logs never store passwords, tokens, chatbot contents, counseling contents or copied business data
        (PRD §16). The Student Record is the source of truth — the audit log is evidence that an action occurred.
      </PrivacyNote>

      <Card className="mt-5">
        <CardHeader
          title={rows ? `${rows.length} entries` : 'Audit trail'}
          actions={
            <div className="flex items-center gap-2">
              <Select value={outcome} onChange={(e) => setOutcome(e.target.value)} className="w-36">
                <option value="">All outcomes</option>
                <option value="SUCCESS">Success</option>
                <option value="FAILURE">Failure</option>
              </Select>
              <SearchInput value={q} onChange={setQ} placeholder="Action, entity, actor…" />
            </div>
          }
        />
        {!rows ? (
          <FullPageLoading label="Loading…" />
        ) : (
          <Table>
            <THead>
              <Tr><Th>When</Th><Th>Actor</Th><Th>Action</Th><Th>Entity</Th><Th>Outcome</Th><Th>Detail</Th></Tr>
            </THead>
            <TBody>
              {rows.map((l) => (
                <Tr key={l.id}>
                  <Td className="whitespace-nowrap text-xs text-slate-500">{formatDateTime(l.createdAt)}</Td>
                  <Td>
                    <Badge tone={l.actorType === 'SYSTEM' ? 'violet' : 'blue'}>{l.actorType}</Badge>
                    {l.actorName && <div className="mt-0.5 text-xs">{l.actorName}</div>}
                  </Td>
                  <Td className="font-mono text-xs">{l.action}</Td>
                  <Td className="text-xs">{l.entityType}{l.entityId ? <span className="text-slate-400"> · {l.entityId}</span> : null}</Td>
                  <Td><StatusBadge status={l.outcome} /></Td>
                  <Td className="max-w-[220px] text-xs text-slate-500">{l.detail ?? '—'}</Td>
                </Tr>
              ))}
            </TBody>
          </Table>
        )}
      </Card>
    </div>
  );
}
