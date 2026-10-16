import { useState } from 'react';
import { exportReport } from '../../api/services/governance';
import type { ReportResult } from '../../types/models';
import { Button, Card, CardHeader, FullPageLoading, PageHeader } from '../../components/ui/primitives';
import { Table, THead, TBody, Tr, Th, Td } from '../../components/ui/Table';
import { PrivacyNote } from '../../components/ui/PrivacyNote';
import { useToast } from '../../components/ui/Toast';
import { useAuth } from '../../auth/AuthContext';
import { downloadTextFile, formatDateTime } from '../../lib/format';
import { P } from '../../lib/permissions';
import { Icon } from '../../layout/icons';
import type { IconName } from '../../layout/icons';

const REPORTS: { kind: string; title: string; desc: string; icon: IconName }[] = [
  { kind: 'predictions', title: 'Risk Predictions', desc: 'Latest prediction per student with model versions and scores', icon: 'pulse' },
  { kind: 'attendance', title: 'Attendance Evidence', desc: 'Source attendance records with derived percentages', icon: 'check' },
  { kind: 'interventions', title: 'Interventions', desc: 'All interventions with status, priority and ownership', icon: 'heart' },
  { kind: 'imports', title: 'Import Sessions', desc: 'Import history including failures and cancellations', icon: 'upload' },
];

export default function ReportsPage() {
  const { notify } = useToast();
  const { canAny } = useAuth();
  const [report, setReport] = useState<ReportResult | null>(null);
  const [loading, setLoading] = useState<string | null>(null);
  const canExport = canAny(P.reportExport);

  const run = async (kind: string) => {
    setLoading(kind);
    try {
      setReport(await exportReport(kind));
    } catch (e: any) {
      notify(e?.message ?? 'Report failed', 'error');
    } finally {
      setLoading(null);
    }
  };

  const exportCsv = () => {
    if (!report) return;
    const header = report.columns.map((c) => c.label).join(',');
    const body = report.rows
      .map((r) => report.columns.map((c) => JSON.stringify(r[c.key] ?? '')).join(','))
      .join('\n');
    downloadTextFile(`dropsafe-${report.kind}-report.csv`, `${header}\n${body}`);
    notify('Report exported. The export is recorded in Access Logs (action: EXPORT).', 'info');
  };

  return (
    <div>
      <PageHeader
        title="Reports"
        subtitle="Authorized reporting across academic evidence, predictions, counseling and imports — always within organization scope."
      />
      <PrivacyNote title="Authorization & audit">
        Viewing requires <code>report:view</code>; exporting requires <code>report:export</code>. Exports are
        recorded in Access Logs, and reports never cross organization boundaries (PRD §25).
      </PrivacyNote>

      <div className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {REPORTS.map((r) => (
          <Card key={r.kind} className="p-5">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-50 text-brand-600">
              <Icon name={r.icon} />
            </div>
            <div className="mt-3 text-sm font-semibold text-slate-900">{r.title}</div>
            <p className="mt-1 text-xs text-slate-500">{r.desc}</p>
            <Button
              size="sm"
              variant={report?.kind === r.kind ? 'primary' : 'secondary'}
              className="mt-4 w-full"
              disabled={loading !== null}
              onClick={() => run(r.kind)}
            >
              {loading === r.kind ? 'Generating…' : report?.kind === r.kind ? 'Refresh report' : 'Run report'}
            </Button>
          </Card>
        ))}
      </div>

      {report && (
        <Card className="mt-5">
          <CardHeader
            title={report.title}
            subtitle={`Generated ${formatDateTime(report.generatedAt)} · ${report.rows.length} rows · organization-scoped`}
            actions={canExport && <Button size="sm" onClick={exportCsv}>Export CSV</Button>}
          />
          {loading ? (
            <FullPageLoading label="Generating…" />
          ) : (
            <Table>
              <THead>
                <Tr>{report.columns.map((c) => <Th key={c.key}>{c.label}</Th>)}</Tr>
              </THead>
              <TBody>
                {report.rows.map((r, i) => (
                  <Tr key={i}>{report.columns.map((c) => <Td key={c.key} className="text-xs">{String(r[c.key] ?? '—')}</Td>)}</Tr>
                ))}
              </TBody>
            </Table>
          )}
        </Card>
      )}

      {!canExport && (
        <p className="mt-4 text-xs text-slate-400">
          Your role can view reports but not export them (<code>report:export</code> not granted).
        </p>
      )}
    </div>
  );
}
