import { useEffect, useState } from 'react';
import { listNotifications } from '../../api/services/governance';
import type { NotificationRecord } from '../../types/models';
import { NOTIFICATION_CHANNELS, NOTIFICATION_STATUSES, NOTIFICATION_TYPES } from '../../types/enums';
import { Card, CardHeader, FullPageLoading, PageHeader, Select, StatusBadge } from '../../components/ui/primitives';
import { Table, THead, TBody, Tr, Th, Td } from '../../components/ui/Table';
import { PrivacyNote } from '../../components/ui/PrivacyNote';
import { useToast } from '../../components/ui/Toast';
import { formatDateTime, titleCase } from '../../lib/format';

export default function NotificationsPage() {
  const { notify } = useToast();
  const [rows, setRows] = useState<NotificationRecord[] | null>(null);
  const [channel, setChannel] = useState('');
  const [status, setStatus] = useState('');
  const [type, setType] = useState('');

  useEffect(() => {
    listNotifications({ channel, status, type }).then(setRows).catch((e) => notify(e?.message ?? 'Failed to load notifications', 'error'));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [channel, status, type]);

  return (
    <div>
      <PageHeader title="Notification History" subtitle="Delivery traceability for mentor alerts, student reminders, follow-up reminders and import notifications." />
      <PrivacyNote title="Minimal data">
        Notification records never store sensitive student information beyond what delivery requires (PRD §16).
        Terminal records are treated as historical.
      </PrivacyNote>

      <Card className="mt-5">
        <CardHeader
          title={rows ? `${rows.length} notifications` : 'Delivery records'}
          actions={
            <div className="flex flex-wrap items-center gap-2">
              <Select value={type} onChange={(e) => setType(e.target.value)} className="w-44">
                <option value="">All types</option>
                {NOTIFICATION_TYPES.map((t) => (
                  <option key={t} value={t}>{titleCase(t)}</option>
                ))}
              </Select>
              <Select value={channel} onChange={(e) => setChannel(e.target.value)} className="w-36">
                <option value="">All channels</option>
                {NOTIFICATION_CHANNELS.map((c) => (
                  <option key={c} value={c}>{titleCase(c)}</option>
                ))}
              </Select>
              <Select value={status} onChange={(e) => setStatus(e.target.value)} className="w-32">
                <option value="">All statuses</option>
                {NOTIFICATION_STATUSES.map((s) => (
                  <option key={s} value={s}>{titleCase(s)}</option>
                ))}
              </Select>
            </div>
          }
        />
        {!rows ? (
          <FullPageLoading label="Loading…" />
        ) : (
          <Table>
            <THead>
              <Tr><Th>When</Th><Th>Type</Th><Th>Channel</Th><Th>Recipient</Th><Th>Subject</Th><Th>Status</Th></Tr>
            </THead>
            <TBody>
              {rows.map((n) => (
                <Tr key={n.id}>
                  <Td className="whitespace-nowrap text-xs text-slate-500">{formatDateTime(n.createdAt)}</Td>
                  <Td className="text-xs">{titleCase(n.notificationType)}</Td>
                  <Td className="text-xs">{titleCase(n.channel)}</Td>
                  <Td className="text-xs font-medium">{n.recipientLabel}</Td>
                  <Td className="max-w-[300px] text-xs text-slate-600">{n.subject}</Td>
                  <Td><StatusBadge status={n.status} /></Td>
                </Tr>
              ))}
            </TBody>
          </Table>
        )}
      </Card>
    </div>
  );
}
