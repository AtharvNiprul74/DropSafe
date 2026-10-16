import { useEffect, useState } from 'react';
import { listAccessLogs } from '../../api/services/governance';
import type { AccessLog } from '../../types/models';
import { Card, CardHeader, FullPageLoading, PageHeader, Select, StatusBadge } from '../../components/ui/primitives';
import { Table, THead, TBody, Tr, Th, Td } from '../../components/ui/Table';
import { PrivacyNote } from '../../components/ui/PrivacyNote';
import { useToast } from '../../components/ui/Toast';
import { formatDateTime, titleCase } from '../../lib/format';

export default function AccessLogsPage() {
  const { notify } = useToast();
  const [rows, setRows] = useState<AccessLog[] | null>(null);
  const [result, setResult] = useState('');
  const [action, setAction] = useState('');

  useEffect(() => {
    listAccessLogs({ result, action }).then(setRows).catch((e) => notify(e?.message ?? 'Failed to load access logs', 'error'));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [result, action]);

  return (
    <div>
      <PageHeader title="Access Logs" subtitle="Security-relevant access attempts — including denies. Denied entries must carry a denial reason." />
      <PrivacyNote title="No resource content">
        Access logs record metadata only; protected resource content is never copied into logs (PRD §16).
      </PrivacyNote>

      <Card className="mt-5">
        <CardHeader
          title={rows ? `${rows.length} attempts` : 'Access attempts'}
          actions={
            <div className="flex items-center gap-2">
              <Select value={action} onChange={(e) => setAction(e.target.value)} className="w-32">
                <option value="">All actions</option>
                {['READ', 'WRITE', 'EXPORT'].map((a) => (
                  <option key={a} value={a}>{titleCase(a)}</option>
                ))}
              </Select>
              <Select value={result} onChange={(e) => setResult(e.target.value)} className="w-32">
                <option value="">All results</option>
                <option value="ALLOWED">Allowed</option>
                <option value="DENIED">Denied</option>
              </Select>
            </div>
          }
        />
        {!rows ? (
          <FullPageLoading label="Loading…" />
        ) : (
          <Table>
            <THead>
              <Tr><Th>When</Th><Th>User</Th><Th>Action</Th><Th>Resource</Th><Th>Result</Th><Th>Denial reason</Th></Tr>
            </THead>
            <TBody>
              {rows.map((l) => (
                <Tr key={l.id}>
                  <Td className="whitespace-nowrap text-xs text-slate-500">{formatDateTime(l.createdAt)}</Td>
                  <Td className="text-xs font-medium">{l.userName}</Td>
                  <Td className="text-xs">{titleCase(l.action)}</Td>
                  <Td className="font-mono text-xs">{l.resource}</Td>
                  <Td><StatusBadge status={l.result} /></Td>
                  <Td className="max-w-[260px] text-xs text-slate-500">{l.denialReason ?? '—'}</Td>
                </Tr>
              ))}
            </TBody>
          </Table>
        )}
      </Card>
    </div>
  );
}
