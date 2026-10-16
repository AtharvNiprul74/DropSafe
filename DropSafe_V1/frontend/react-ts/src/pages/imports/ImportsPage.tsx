import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { cancelImport, createImport, listImports, processImport, validateImport } from '../../api/services/imports';
import type { ImportWithReport } from '../../api/services/imports';
import { IMPORT_TYPES } from '../../types/enums';
import { Badge, Button, Card, CardHeader, EmptyState, Field, FullPageLoading, Input, PageHeader, Select, StatusBadge } from '../../components/ui/primitives';
import { Table, THead, TBody, Tr, Th, Td } from '../../components/ui/Table';
import { Modal } from '../../components/ui/Modal';
import { useToast } from '../../components/ui/Toast';
import { useAuth } from '../../auth/AuthContext';
import { PrivacyNote } from '../../components/ui/PrivacyNote';
import { formatDateTime, titleCase } from '../../lib/format';
import type { ImportType } from '../../types/enums';
import { P } from '../../lib/permissions';

const STEPS = ['Upload', 'Validate', 'Preview', 'Process', 'Commit'];

export default function ImportsPage() {
  const { notify } = useToast();
  const { canAny } = useAuth();
  const navigate = useNavigate();
  const [rows, setRows] = useState<ImportWithReport[] | null>(null);
  const [wizardOpen, setWizardOpen] = useState(false);

  const load = async () => setRows(await listImports());
  useEffect(() => {
    void load().catch((e) => notify(e?.message ?? 'Failed to load imports', 'error'));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!rows) return <FullPageLoading label="Loading import sessions…" />;

  return (
    <div>
      <PageHeader
        title="Import Sessions"
        subtitle="Academic evidence enters through approved Import Sessions. Failed imports never partially commit academic data; cancelled imports change nothing."
        actions={canAny(P.importCreate) && <Button onClick={() => setWizardOpen(true)}>+ New import</Button>}
      />

      <Card>
        <CardHeader title={`${rows.length} sessions`} subtitle="Import history is preserved — including failures" />
        {rows.length === 0 ? (
          <EmptyState title="No import sessions yet" description="Start your first STUDENT, ENROLLMENT, ATTENDANCE or ASSESSMENT import." />
        ) : (
          <Table>
            <THead>
              <Tr><Th>Type</Th><Th>File</Th><Th>Status</Th><Th>Result</Th><Th>Initiated by</Th><Th>Created</Th><Th></Th></Tr>
            </THead>
            <TBody>
              {rows.map((s) => (
                <Tr key={s.id} onClick={() => navigate(`/imports/${s.id}`)}>
                  <Td className="font-medium">{titleCase(s.importType)}</Td>
                  <Td className="text-xs text-slate-500">{s.fileName}</Td>
                  <Td><StatusBadge status={s.status} /></Td>
                  <Td>{s.report ? <StatusBadge status={s.report.resultStatus} /> : <span className="text-xs text-slate-400">—</span>}</Td>
                  <Td className="text-xs">{s.createdByName}</Td>
                  <Td className="text-xs text-slate-500">{formatDateTime(s.createdAt)}</Td>
                  <Td className="text-right text-xs font-semibold text-brand-600">View →</Td>
                </Tr>
              ))}
            </TBody>
          </Table>
        )}
      </Card>

      <ImportWizard
        open={wizardOpen}
        onClose={() => setWizardOpen(false)}
        onDone={async () => {
          setWizardOpen(false);
          await load();
        }}
      />
    </div>
  );
}

/** Upload → Validate → Preview → Process → Commit (PRD §10 transaction flow). */
export function ImportWizard({ open, onClose, onDone }: { open: boolean; onClose: () => void; onDone: () => void }) {
  const { notify } = useToast();
  const [step, setStep] = useState(0);
  const [importType, setImportType] = useState<ImportType>('ATTENDANCE');
  const [file, setFile] = useState<File | null>(null);
  const [session, setSession] = useState<ImportWithReport | null>(null);
  const [busy, setBusy] = useState(false);

  const reset = () => {
    setStep(0);
    setFile(null);
    setSession(null);
    setBusy(false);
  };

  const fail = (e: any) => notify(e?.message ?? 'Operation failed', 'error');

  const doUpload = async () => {
    if (!file) return;
    setBusy(true);
    try {
      const s = await createImport({ importType, fileName: file.name, fileSizeBytes: file.size, mimeType: file.type || 'text/csv' });
      setSession(s);
      setStep(1);
    } catch (e) { fail(e); } finally { setBusy(false); }
  };

  const doValidate = async () => {
    if (!session) return;
    setBusy(true);
    try {
      const s = await validateImport(session.id);
      setSession(s);
      setStep(2);
      notify('Validation complete — review the preview before processing.');
    } catch (e) { fail(e); } finally { setBusy(false); }
  };

  const doProcess = async () => {
    if (!session) return;
    setBusy(true);
    try {
      const s = await processImport(session.id);
      setSession(s);
      setStep(4);
      notify(s.report?.resultStatus === 'PARTIAL_SUCCESS' ? 'Committed with exclusions — see import report.' : 'Import committed successfully.');
    } catch (e) { fail(e); } finally { setBusy(false); }
  };

  const doCancel = async () => {
    if (!session) return;
    try {
      await cancelImport(session.id);
      notify('Import cancelled — academic data untouched.');
      onDoneAndReset();
    } catch (e) { fail(e); }
  };

  const onDoneAndReset = () => {
    reset();
    onDone();
  };

  return (
    <Modal
      open={open}
      onClose={() => { reset(); onClose(); }}
      title="New import session"
      subtitle="Validation occurs before commit. Fatal errors = no commit; row-level rejections are excluded and reported."
      wide
      footer={
        <>
          {step === 0 && (
            <>
              <Button variant="secondary" onClick={() => { reset(); onClose(); }}>Cancel</Button>
              <Button onClick={doUpload} disabled={!file || busy}>{busy ? 'Uploading…' : 'Upload file'}</Button>
            </>
          )}
          {step === 1 && (
            <>
              <Button variant="danger" onClick={doCancel}>Cancel import</Button>
              <Button onClick={doValidate} disabled={busy}>{busy ? 'Validating…' : 'Run validation'}</Button>
            </>
          )}
          {step === 2 && (
            <>
              <Button variant="secondary" onClick={onDoneAndReset}>Finish later</Button>
              <Button onClick={() => setStep(3)}>Proceed to process</Button>
            </>
          )}
          {step === 3 && (
            <>
              <Button variant="secondary" onClick={() => setStep(2)}>Back to preview</Button>
              <Button variant="warning" onClick={doProcess} disabled={busy}>{busy ? 'Processing…' : 'Process & commit valid rows'}</Button>
            </>
          )}
          {step === 4 && <Button onClick={onDoneAndReset}>Done</Button>}
        </>
      }
    >
      {/* Stepper */}
      <div className="mb-6 flex items-center">
        {STEPS.map((label, i) => (
          <div key={label} className="flex flex-1 items-center">
            <div className="flex flex-col items-center gap-1">
              <span className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold ${i < step ? 'bg-emerald-500 text-white' : i === step ? 'bg-brand-600 text-white' : 'bg-slate-200 text-slate-500'}`}>
                {i < step ? '✓' : i + 1}
              </span>
              <span className={`text-[10px] font-semibold ${i === step ? 'text-brand-700' : 'text-slate-400'}`}>{label}</span>
            </div>
            {i < STEPS.length - 1 && <div className={`mx-1 mb-4 h-0.5 flex-1 ${i < step ? 'bg-emerald-400' : 'bg-slate-200'}`} />}
          </div>
        ))}
      </div>

      {step === 0 && (
        <div className="space-y-4">
          <Field label="Import type" required hint="Determines which business records this session may create/update">
            <Select value={importType} onChange={(e) => setImportType(e.target.value as ImportType)}>
              {IMPORT_TYPES.map((t) => (
                <option key={t} value={t}>{titleCase(t)}</option>
              ))}
            </Select>
          </Field>
          <Field label="CSV file" required hint="Files are integrity-checked (hash) and stored unmodified; metadata only is recorded here">
            <Input type="file" accept=".csv,text/csv" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
          </Field>
          {file && (
            <div className="rounded-xl bg-slate-50 px-4 py-3 text-xs text-slate-600 ring-1 ring-inset ring-slate-200">
              <span className="font-semibold">{file.name}</span> · {(file.size / 1024).toFixed(1)} KB · original file will not be modified after upload
            </div>
          )}
          <PrivacyNote title="Organization isolation">
            The session belongs to your organization and to you as the initiating authorized user.
          </PrivacyNote>
        </div>
      )}

      {step === 1 && session && (
        <div className="space-y-3 text-sm">
          <Row k="Session" v={<span className="font-mono text-xs">{session.id}</span>} />
          <Row k="Type" v={titleCase(session.importType)} />
          <Row k="File" v={`${session.fileName} (${((session.fileSizeBytes ?? 0) / 1024).toFixed(1)} KB)`} />
          <Row k="Integrity hash" v={<span className="font-mono text-xs">{session.fileHash}</span>} />
          <Row k="Status" v={<StatusBadge status={session.status} />} />
          <PrivacyNote title="Validation scope">
            Required fields, identifiers, duplicates, academic period/component existence, marks and attendance
            ranges, and dependency checks all run before anything is committed.
          </PrivacyNote>
        </div>
      )}

      {step === 2 && session?.preview && (
        <div className="space-y-4">
          <div className="grid grid-cols-3 gap-3 text-center">
            <div className="rounded-xl bg-slate-50 p-3 ring-1 ring-inset ring-slate-200">
              <div className="text-xl font-bold text-slate-900">{session.preview.validRecords + session.preview.rejectedRecords}</div>
              <div className="text-[11px] text-slate-500">Total rows</div>
            </div>
            <div className="rounded-xl bg-emerald-50 p-3 ring-1 ring-inset ring-emerald-200">
              <div className="text-xl font-bold text-emerald-700">{session.preview.validRecords}</div>
              <div className="text-[11px] text-emerald-700">Valid rows</div>
            </div>
            <div className="rounded-xl bg-rose-50 p-3 ring-1 ring-inset ring-rose-200">
              <div className="text-xl font-bold text-rose-700">{session.preview.rejectedRecords}</div>
              <div className="text-[11px] text-rose-700">Rejected rows</div>
            </div>
          </div>
          {session.preview.sampleRejectedRows.length > 0 && (
            <div>
              <div className="mb-2 text-xs font-bold uppercase tracking-wide text-rose-600">Rejected rows (sample)</div>
              <div className="space-y-2">
                {session.preview.sampleRejectedRows.map((r, i) => (
                  <div key={i} className="rounded-xl border border-rose-200 bg-rose-50/60 px-4 py-2.5 text-xs">
                    <div className="font-mono text-slate-600">{r.row.join(' · ')}</div>
                    <div className="mt-1 font-semibold text-rose-700">{r.reason}</div>
                  </div>
                ))}
              </div>
              <p className="mt-2 text-[11px] text-slate-500">Valid rows may commit; rejected rows are excluded and recorded in the Import Report.</p>
            </div>
          )}
        </div>
      )}

      {step === 3 && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3.5 text-sm text-amber-900">
          <strong>Ready to process.</strong> Committing inserts/updates only the {session?.preview?.validRecords ?? 'valid'} validated rows.
          {session?.preview?.rejectedRecords ? ` ${session.preview.rejectedRecords} rejected row(s) will be excluded and reported as PARTIAL_SUCCESS.` : ''}{' '}
          A successful import may trigger Student Snapshot creation for affected enrollments.
        </div>
      )}

      {step === 4 && session?.report && (
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <StatusBadge status={session.report.resultStatus} />
            <span className="text-sm font-medium text-slate-700">Import committed — report preserved.</span>
          </div>
          <div className="grid grid-cols-3 gap-3 text-center sm:grid-cols-5">
            {[
              ['Total', session.report.totalRecords], ['Valid', session.report.validRecords], ['Rejected', session.report.rejectedRecords],
              ['Inserted', session.report.insertedRecords], ['Updated', session.report.updatedRecords],
            ].map(([k, v]) => (
              <div key={k} className="rounded-xl bg-slate-50 p-3 ring-1 ring-inset ring-slate-200">
                <div className="text-lg font-bold text-slate-900">{v}</div>
                <div className="text-[11px] text-slate-500">{k}</div>
              </div>
            ))}
          </div>
          {session.report.summary && <p className="rounded-xl bg-slate-50 px-4 py-3 text-xs text-slate-600 ring-1 ring-inset ring-slate-200">{session.report.summary}</p>}
        </div>
      )}
    </Modal>
  );
}

function Row({ k, v }: { k: string; v: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between border-b border-slate-100 pb-2">
      <span className="text-slate-500">{k}</span>
      <span className="font-medium text-slate-800">{v}</span>
    </div>
  );
}
