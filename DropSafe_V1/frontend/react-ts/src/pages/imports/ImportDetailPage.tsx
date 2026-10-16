import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { getImport } from '../../api/services/imports';
import type { ImportWithReport } from '../../api/services/imports';
import { Card, CardHeader, FullPageLoading, KV, PageHeader, StatusBadge } from '../../components/ui/primitives';
import { PrivacyNote } from '../../components/ui/PrivacyNote';
import { formatDateTime, fmtNumber, titleCase } from '../../lib/format';

export default function ImportDetailPage() {
  const { id = '' } = useParams();
  const [data, setData] = useState<ImportWithReport | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getImport(id).then(setData).catch((e) => setError(e?.message ?? 'Not found'));
  }, [id]);

  if (error) return <div className="rounded-xl bg-rose-50 p-4 text-sm text-rose-700 ring-1 ring-inset ring-rose-200">{error}</div>;
  if (!data) return <FullPageLoading label="Loading import session…" />;

  const r = data.report;

  return (
    <div>
      <PageHeader
        crumbs={['Data Imports', 'Import Sessions', data.fileName ?? data.id]}
        title={`${titleCase(data.importType)} import — ${data.fileName}`}
        subtitle="Original files are never modified after upload; this record stores file metadata only."
        actions={<StatusBadge status={data.status} />}
      />

      <div className="grid gap-5 lg:grid-cols-2">
        <Card>
          <CardHeader title="Session" subtitle="Belongs to this organization; initiated by an authorized user" />
          <div className="divide-y divide-slate-100 px-5">
            <KV k="Import type" v={titleCase(data.importType)} />
            <KV k="Source type" v={data.sourceType} />
            <KV k="File" v={data.fileName} />
            <KV k="Size" v={`${((data.fileSizeBytes ?? 0) / 1024).toFixed(1)} KB`} />
            <KV k="Integrity hash" v={<span className="font-mono text-xs">{data.fileHash}</span>} />
            <KV k="MIME type" v={data.mimeType} />
            <KV k="Initiated by" v={data.createdByName} />
            <KV k="Created" v={formatDateTime(data.createdAt)} />
          </div>
        </Card>

        <div className="space-y-5">
          <Card>
            <CardHeader title="Import report" subtitle={r ? 'Historical — preserved even for failures' : 'No report yet'} />
            {r ? (
              <>
                <div className="flex items-center gap-3 px-5 pt-4">
                  <StatusBadge status={r.resultStatus} />
                  <span className="text-xs text-slate-500">{r.summary}</span>
                </div>
                <div className="grid grid-cols-3 gap-3 p-5 text-center sm:grid-cols-5">
                  {[
                    ['Total', r.totalRecords],
                    ['Valid', r.validRecords],
                    ['Rejected', r.rejectedRecords],
                    ['Inserted', r.insertedRecords],
                    ['Updated', r.updatedRecords],
                  ].map(([k, v]) => (
                    <div key={k} className="rounded-xl bg-slate-50 p-3 ring-1 ring-inset ring-slate-200">
                      <div className="text-lg font-bold text-slate-900">{fmtNumber(v as number)}</div>
                      <div className="text-[11px] text-slate-500">{k}</div>
                    </div>
                  ))}
                </div>
                <div className="border-t border-slate-100 px-5 py-3 text-[11px] text-slate-400">
                  Constraints: valid + rejected ≤ total · inserted + updated ≤ valid
                </div>
              </>
            ) : (
              <div className="px-5 py-6 text-sm text-slate-400">
                {data.errorMessage
                  ? <span className="text-rose-600">{data.errorMessage}</span>
                  : 'Report appears after the session is processed.'}
              </div>
            )}
          </Card>

          {data.status === 'FAILED' && (
            <PrivacyNote title="No partial commit">
              This session failed with a fatal error — academic data was <strong>not</strong> partially committed.
            </PrivacyNote>
          )}
          {data.status === 'CANCELLED' && (
            <PrivacyNote title="Cancelled">Cancelled imports do not modify academic data (PRD §10).</PrivacyNote>
          )}
        </div>
      </div>

      <div className="mt-5">
        <Link to="/imports" className="text-sm font-semibold text-brand-600 hover:underline">← Back to import sessions</Link>
      </div>
    </div>
  );
}
