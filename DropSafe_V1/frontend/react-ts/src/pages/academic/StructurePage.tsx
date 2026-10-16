import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  createComponent, createLevel, createPeriod, createProgram,
  listComponents, listLevels, listPeriods, listPrograms,
  updateComponent, updateLevel, updatePeriod, updateProgram,
} from '../../api/services/academic';
import type { AcademicPeriod, LearningComponent, LearningLevel, LearningProgram } from '../../types/models';
import { COMPONENT_TYPES, PERIOD_STATUSES } from '../../types/enums';
import { Badge, Button, Card, EmptyState, Field, Input, PageHeader, Select, StatusBadge } from '../../components/ui/primitives';
import { Modal, ConfirmModal } from '../../components/ui/Modal';
import { useToast } from '../../components/ui/Toast';
import { useAuth } from '../../auth/AuthContext';
import { allowedTransitions } from '../../lib/transitions';
import { formatDate, titleCase } from '../../lib/format';
import { P } from '../../lib/permissions';

/**
 * Academic structure explorer — Organization → Learning Program → Learning Level
 * → Academic Period → Learning Component (PRD §8 hierarchy).
 */
export default function StructurePage() {
  const { notify } = useToast();
  const { canAny } = useAuth();
  const canManage = canAny(P.organizationUpdate, P.studentCreate);

  const [programs, setPrograms] = useState<LearningProgram[] | null>(null);
  const [levels, setLevels] = useState<LearningLevel[]>([]);
  const [periods, setPeriods] = useState<AcademicPeriod[]>([]);
  const [components, setComponents] = useState<LearningComponent[]>([]);
  const [openPrograms, setOpenPrograms] = useState<Set<string>>(new Set());
  const [openLevels, setOpenLevels] = useState<Set<string>>(new Set());
  const [openPeriods, setOpenPeriods] = useState<Set<string>>(new Set());

  const [create, setCreate] = useState<
    | { kind: 'program' }
    | { kind: 'level'; programId: string }
    | { kind: 'period'; levelId: string }
    | { kind: 'component'; periodId: string }
    | null
  >(null);
  const [transition, setTransition] = useState<{ kind: 'program' | 'level' | 'period' | 'component'; id: string; from: string; to: string; label: string } | null>(null);
  const [form, setForm] = useState<Record<string, string>>({});

  const load = useCallback(async () => {
    const [p, l, per, c] = await Promise.all([listPrograms(), listLevels(), listPeriods(), listComponents()]);
    setPrograms(p);
    setLevels(l);
    setPeriods(per);
    setComponents(c);
  }, []);

  useEffect(() => {
    void load().catch((e) => notify(e?.message ?? 'Failed to load structure', 'error'));
  }, [load, notify]);

  const toggle = (set: Set<string>, setter: (s: Set<string>) => void, id: string) => {
    const next = new Set(set);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setter(next);
  };

  const byParent = useMemo(
    () => ({
      levels: (programId: string) => levels.filter((l) => l.programId === programId),
      periods: (levelId: string) => periods.filter((p) => p.levelId === levelId),
      components: (periodId: string) => components.filter((c) => c.periodId === periodId),
    }),
    [levels, periods, components],
  );

  const submitCreate = async () => {
    if (!create) return;
    try {
      if (create.kind === 'program') await createProgram({ code: form.code, name: form.name, description: form.description });
      if (create.kind === 'level') await createLevel({ programId: create.programId, levelNumber: Number(form.levelNumber), name: form.name });
      if (create.kind === 'period') await createPeriod({ levelId: create.levelId, code: form.code, startDate: form.startDate, endDate: form.endDate });
      if (create.kind === 'component')
        await createComponent({ periodId: create.periodId, code: form.code, name: form.name, type: form.type ?? 'SUBJECT', maximumMarks: Number(form.maximumMarks), passingMarks: Number(form.passingMarks) });
      notify(`${titleCase(create.kind)} created.`);
      setCreate(null);
      setForm({});
      await load();
    } catch (e: any) {
      notify(e?.message ?? 'Create failed', 'error');
    }
  };

  const submitTransition = async () => {
    if (!transition) return;
    try {
      const fn = { program: updateProgram, level: updateLevel, period: updatePeriod, component: updateComponent }[transition.kind];
      await fn(transition.id, { status: transition.to });
      notify(`Status changed to ${titleCase(transition.to)}.`);
      setTransition(null);
      await load();
    } catch (e: any) {
      notify(e?.message ?? 'Transition rejected', 'error');
    }
  };

  const TransitionButtons = ({ kind, id, status, label }: { kind: 'program' | 'level' | 'period' | 'component'; id: string; status: string; label: string }) => {
    if (!canManage) return null;
    const next = allowedTransitions(kind, status);
    if (!next.length) return null;
    return (
      <span className="flex gap-1" onClick={(e) => e.stopPropagation()}>
        {next.map((to) => (
          <Button
            key={to}
            size="sm"
            variant={to === 'ARCHIVED' ? 'danger' : to === 'ACTIVE' ? 'success' : 'secondary'}
            onClick={() => setTransition({ kind, id, from: status, to, label })}
          >
            {titleCase(to)}
          </Button>
        ))}
      </span>
    );
  };

  if (!programs) return <div className="text-sm text-slate-400">Loading structure…</div>;

  return (
    <div>
      <PageHeader
        title="Academic Structure"
        subtitle="Organization → Learning Program → Learning Level → Academic Period → Learning Component. Archived nodes stop accepting new records."
        actions={canManage && <Button onClick={() => { setForm({}); setCreate({ kind: 'program' }); }}>+ New program</Button>}
      />

      {programs.length === 0 && <Card><EmptyState title="No programs yet" description="Create the first Learning Program to start building the academic hierarchy." /></Card>}

      <div className="space-y-3">
        {programs.map((prog) => {
          const open = openPrograms.has(prog.id);
          return (
            <Card key={prog.id} className="overflow-hidden">
              <button className="flex w-full items-center gap-3 px-5 py-4 text-left hover:bg-slate-50" onClick={() => toggle(openPrograms, setOpenPrograms, prog.id)}>
                <Chevron open={open} />
                <div className="flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-semibold text-slate-900">{prog.name}</span>
                    <Badge tone="slate">{prog.code}</Badge>
                    <StatusBadge status={prog.status} />
                  </div>
                  <div className="mt-0.5 text-xs text-slate-400">{byParent.levels(prog.id).length} levels</div>
                </div>
                {canManage && prog.status !== 'ARCHIVED' && (
                  <span onClick={(e) => e.stopPropagation()}>
                    <Button size="sm" variant="ghost" onClick={() => { setForm({}); setCreate({ kind: 'level', programId: prog.id }); }}>+ Level</Button>
                  </span>
                )}
                <TransitionButtons kind="program" id={prog.id} status={prog.status} label={prog.name} />
              </button>

              {open && (
                <div className="border-t border-slate-100 bg-slate-50/40 px-6 py-3">
                  {byParent.levels(prog.id).length === 0 && <div className="py-2 text-xs text-slate-400">No learning levels yet.</div>}
                  {byParent.levels(prog.id).map((lvl) => {
                    const lOpen = openLevels.has(lvl.id);
                    return (
                      <div key={lvl.id} className="border-l-2 border-slate-200 pl-4">
                        <button className="flex w-full items-center gap-2.5 rounded-lg px-2 py-2.5 text-left hover:bg-white" onClick={() => toggle(openLevels, setOpenLevels, lvl.id)}>
                          <Chevron open={lOpen} />
                          <span className="text-sm font-medium text-slate-800">Level {lvl.levelNumber} — {lvl.name}</span>
                          <StatusBadge status={lvl.status} />
                          <span className="flex-1" />
                          {canManage && lvl.status !== 'ARCHIVED' && (
                            <span onClick={(e) => e.stopPropagation()}>
                              <Button size="sm" variant="ghost" onClick={() => { setForm({}); setCreate({ kind: 'period', levelId: lvl.id }); }}>+ Period</Button>
                            </span>
                          )}
                          <TransitionButtons kind="level" id={lvl.id} status={lvl.status} label={`Level ${lvl.levelNumber} — ${lvl.name}`} />
                        </button>

                        {lOpen && (
                          <div className="ml-3 pb-2">
                            {byParent.periods(lvl.id).map((per) => {
                              const pOpen = openPeriods.has(per.id);
                              return (
                                <div key={per.id} className="border-l-2 border-brand-100 pl-4">
                                  <button className="flex w-full flex-wrap items-center gap-2.5 rounded-lg px-2 py-2 text-left hover:bg-white" onClick={() => toggle(openPeriods, setOpenPeriods, per.id)}>
                                    <Chevron open={pOpen} />
                                    <span className="text-sm font-medium text-slate-700">{per.code}</span>
                                    <span className="text-[11px] text-slate-400">{formatDate(per.startDate)} → {formatDate(per.endDate)}</span>
                                    <StatusBadge status={per.status} />
                                    {per.status === 'ACTIVE' && byParent.periods(lvl.id).filter((x) => x.status === 'ACTIVE').length === 1 && (
                                      <Badge tone="blue">Current active period</Badge>
                                    )}
                                    <span className="flex-1" />
                                    {canManage && ['ACTIVE', 'PLANNED'].includes(per.status) && (
                                      <span onClick={(e) => e.stopPropagation()}>
                                        <Button size="sm" variant="ghost" onClick={() => { setForm({ type: 'SUBJECT' }); setCreate({ kind: 'component', periodId: per.id }); }}>+ Component</Button>
                                      </span>
                                    )}
                                    <TransitionButtons kind="period" id={per.id} status={per.status} label={per.code} />
                                  </button>

                                  {pOpen && (
                                    <div className="ml-4 mt-1 space-y-1.5 pb-3">
                                      {byParent.components(per.id).length === 0 && <div className="py-1 text-xs text-slate-400">No learning components yet.</div>}
                                      {byParent.components(per.id).map((cmp) => (
                                        <div key={cmp.id} className="flex flex-wrap items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2">
                                          <Badge tone="indigo">{cmp.code}</Badge>
                                          <span className="text-sm font-medium text-slate-700">{cmp.name}</span>
                                          <Badge tone="slate">{titleCase(cmp.type)}</Badge>
                                          <span className="text-[11px] text-slate-400">max {cmp.maximumMarks} · pass at {cmp.passingMarks}</span>
                                          <StatusBadge status={cmp.status} />
                                          <span className="flex-1" />
                                          <TransitionButtons kind="component" id={cmp.id} status={cmp.status} label={`${cmp.code} — ${cmp.name}`} />
                                        </div>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                            {byParent.periods(lvl.id).length === 0 && <div className="py-1 text-xs text-slate-400">No academic periods yet.</div>}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </Card>
          );
        })}
      </div>

      {/* Create modal — fields differ per hierarchy node */}
      <Modal
        open={!!create}
        onClose={() => setCreate(null)}
        title={create ? `New ${titleCase(create.kind)}` : ''}
        subtitle={
          create?.kind === 'period'
            ? 'Rules: start_date < end_date · only one ACTIVE period per level'
            : create?.kind === 'component'
              ? 'Rule: passing marks cannot exceed maximum marks'
              : create?.kind === 'level'
                ? 'Rule: level number and name are unique within the Program'
                : 'Rule: program code and name are unique within the Organization'
        }
        footer={
          <>
            <Button variant="secondary" onClick={() => setCreate(null)}>Cancel</Button>
            <Button onClick={submitCreate}>Create</Button>
          </>
        }
      >
        {create && (
          <div className="space-y-4">
            {create.kind === 'program' && (
              <>
                <Field label="Program code" required><Input value={form.code ?? ''} onChange={(e) => setForm({ ...form, code: e.target.value })} placeholder="e.g. BTECH-CE" /></Field>
                <Field label="Program name" required><Input value={form.name ?? ''} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. B.Tech Computer Engineering" /></Field>
                <Field label="Description"><Input value={form.description ?? ''} onChange={(e) => setForm({ ...form, description: e.target.value })} /></Field>
              </>
            )}
            {create.kind === 'level' && (
              <>
                <Field label="Level number" required><Input type="number" min={1} value={form.levelNumber ?? ''} onChange={(e) => setForm({ ...form, levelNumber: e.target.value })} placeholder="e.g. 1" /></Field>
                <Field label="Level name" required><Input value={form.name ?? ''} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. First Year" /></Field>
              </>
            )}
            {create.kind === 'period' && (
              <>
                <Field label="Period code" required><Input value={form.code ?? ''} onChange={(e) => setForm({ ...form, code: e.target.value })} placeholder="e.g. SEM-1-2026" /></Field>
                <div className="grid grid-cols-2 gap-4">
                  <Field label="Start date" required><Input type="date" value={form.startDate ?? ''} onChange={(e) => setForm({ ...form, startDate: e.target.value })} /></Field>
                  <Field label="End date" required><Input type="date" value={form.endDate ?? ''} onChange={(e) => setForm({ ...form, endDate: e.target.value })} /></Field>
                </div>
              </>
            )}
            {create.kind === 'component' && (
              <>
                <div className="grid grid-cols-2 gap-4">
                  <Field label="Component code" required><Input value={form.code ?? ''} onChange={(e) => setForm({ ...form, code: e.target.value })} placeholder="e.g. MTH201" /></Field>
                  <Field label="Type" required>
                    <Select value={form.type ?? 'SUBJECT'} onChange={(e) => setForm({ ...form, type: e.target.value })}>
                      {COMPONENT_TYPES.map((t) => (
                        <option key={t} value={t}>{titleCase(t)}</option>
                      ))}
                    </Select>
                  </Field>
                </div>
                <Field label="Component name" required><Input value={form.name ?? ''} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. Engineering Mathematics II" /></Field>
                <div className="grid grid-cols-2 gap-4">
                  <Field label="Maximum marks" required><Input type="number" min={1} value={form.maximumMarks ?? ''} onChange={(e) => setForm({ ...form, maximumMarks: e.target.value })} placeholder="100" /></Field>
                  <Field label="Passing marks" required><Input type="number" min={0} value={form.passingMarks ?? ''} onChange={(e) => setForm({ ...form, passingMarks: e.target.value })} placeholder="40" /></Field>
                </div>
                {Number(form.passingMarks) > Number(form.maximumMarks) && (
                  <div className="rounded-lg bg-rose-50 px-3 py-2 text-xs text-rose-700 ring-1 ring-inset ring-rose-200">
                    Passing marks cannot exceed maximum marks (PRD §34).
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </Modal>

      {/* Lifecycle transition confirm */}
      <ConfirmModal
        open={!!transition}
        onClose={() => setTransition(null)}
        danger={transition?.to === 'ARCHIVED'}
        title={`${titleCase(transition?.to)} ${transition?.kind ?? ''}`}
        confirmLabel={`Set ${titleCase(transition?.to)}`}
        message={
          transition
            ? `Change "${transition.label}" from ${titleCase(transition.from)} to ${titleCase(transition.to)}?${
                transition.to === 'ARCHIVED'
                  ? ' Archived records stop accepting new students/enrollments/assessments but remain fully preserved.'
                  : transition.kind === 'period' && transition.to === 'ACTIVE'
                    ? ' Only one ACTIVE period is allowed per Learning Level — the server will reject this if another active period exists.'
                    : ''
              }`
            : ''
        }
        onConfirm={submitTransition}
      />
    </div>
  );
}

function Chevron({ open }: { open: boolean }) {
  return (
    <svg className={`h-4 w-4 shrink-0 text-slate-400 transition-transform ${open ? 'rotate-90' : ''}`} viewBox="0 0 20 20" fill="currentColor">
      <path fillRule="evenodd" d="M7.21 14.77a.75.75 0 01.02-1.06L11.168 10 7.23 6.29a.75.75 0 111.04-1.08l4.5 4.25a.75.75 0 010 1.08l-4.5 4.25a.75.75 0 01-1.06-.02z" clipRule="evenodd" />
    </svg>
  );
}
