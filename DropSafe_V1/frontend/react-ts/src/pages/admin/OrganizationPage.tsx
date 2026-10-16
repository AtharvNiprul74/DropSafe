import { useEffect, useState } from 'react';
import { getOrganization, getSettings, updateOrganization, updateSettings } from '../../api/services/org';
import type { Organization, OrganizationSettings } from '../../types/models';
import { ORG_TYPES, RETENTION_ACTIONS } from '../../types/enums';
import { Button, Card, CardHeader, Field, FullPageLoading, Input, PageHeader, Select, StatusBadge, Toggle, KV } from '../../components/ui/primitives';
import { Tabs } from '../../components/ui/Tabs';
import { useToast } from '../../components/ui/Toast';
import { useAuth } from '../../auth/AuthContext';
import { PrivacyNote } from '../../components/ui/PrivacyNote';
import { formatDateTime, titleCase } from '../../lib/format';
import { P } from '../../lib/permissions';

export default function OrganizationPage() {
  const { canAny } = useAuth();
  const { notify } = useToast();
  const [tab, setTab] = useState('profile');
  const [org, setOrg] = useState<Organization | null>(null);
  const [settings, setSettings] = useState<OrganizationSettings | null>(null);
  const canEdit = canAny(P.organizationUpdate);

  const load = async () => {
    setOrg(await getOrganization());
    setSettings(await getSettings());
  };
  useEffect(() => {
    void load().catch((e) => notify(e?.message ?? 'Failed to load', 'error'));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!org || !settings) return <FullPageLoading label="Loading organization…" />;

  return (
    <div>
      <PageHeader
        title="Organization & Settings"
        subtitle="Root tenant record and its single settings record (1:1). Settings affect future behaviour and never modify historical records."
      />
      <Tabs
        active={tab}
        onChange={setTab}
        tabs={[
          { id: 'profile', label: 'Organization profile' },
          { id: 'settings', label: 'Organization settings' },
        ]}
      />

      {tab === 'profile' && (
        <div className="grid gap-5 xl:grid-cols-2">
          <Card>
            <CardHeader title="Tenant record" subtitle="Organization code is globally unique; cross-organization access is prohibited" />
            <div className="space-y-4 px-5 py-5">
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Organization name" required>
                  <Input value={org.name} disabled={!canEdit} onChange={(e) => setOrg({ ...org, name: e.target.value })} />
                </Field>
                <Field label="Organization code" hint="Globally unique — immutable after creation">
                  <Input value={org.code} disabled />
                </Field>
                <Field label="Organization type">
                  <Select value={org.type} disabled={!canEdit} onChange={(e) => setOrg({ ...org, type: e.target.value as Organization['type'] })}>
                    {ORG_TYPES.map((t) => (
                      <option key={t} value={t}>{titleCase(t)}</option>
                    ))}
                  </Select>
                </Field>
                <Field label="Contact email">
                  <Input value={org.contactEmail ?? ''} disabled={!canEdit} onChange={(e) => setOrg({ ...org, contactEmail: e.target.value })} />
                </Field>
                <Field label="Phone">
                  <Input value={org.phone ?? ''} disabled={!canEdit} onChange={(e) => setOrg({ ...org, phone: e.target.value })} />
                </Field>
                <Field label="Address">
                  <Input value={org.address ?? ''} disabled={!canEdit} onChange={(e) => setOrg({ ...org, address: e.target.value })} />
                </Field>
              </div>
              {canEdit && (
                <div className="flex justify-end">
                  <Button
                    onClick={() =>
                      updateOrganization({ name: org.name, type: org.type, contactEmail: org.contactEmail, phone: org.phone, address: org.address })
                        .then(() => notify('Organization profile saved.'))
                        .catch((e) => notify(e?.message ?? 'Save failed', 'error'))
                    }
                  >
                    Save changes
                  </Button>
                </div>
              )}
            </div>
          </Card>

          <Card>
            <CardHeader title="Lifecycle" subtitle="Organizations are archived — never directly deleted" />
            <div className="divide-y divide-slate-100 px-5">
              <KV k="Current status" v={<StatusBadge status={org.status} />} />
              <KV k="Allowed transitions" v={org.status === 'ACTIVE' ? 'ACTIVE → INACTIVE' : org.status === 'INACTIVE' ? 'INACTIVE → ARCHIVED' : 'Terminal (ARCHIVED)'} />
              <KV k="Created" v={formatDateTime(org.createdAt)} />
              <KV k="Tenant isolation" v="Enforced" />
            </div>
            <div className="px-5 pb-5">
              <PrivacyNote title="Historical preservation">
                Archiving preserves all historical records for this organization; business records are never
                removed when an organization leaves the platform.
              </PrivacyNote>
            </div>
          </Card>
        </div>
      )}

      {tab === 'settings' && (
        <div className="grid gap-5 xl:grid-cols-2">
          <Card>
            <CardHeader title="Academic & data settings" subtitle="Read by application logic instead of hardcoding" />
            <div className="space-y-4 px-5 py-5">
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Student identifier label" hint="How the UI labels student IDs (e.g. PRN)">
                  <Input value={settings.studentIdentifierLabel} disabled={!canEdit} onChange={(e) => setSettings({ ...settings, studentIdentifierLabel: e.target.value })} />
                </Field>
                <Field label="Academic calendar type">
                  <Select value={settings.academicCalendarType} disabled={!canEdit} onChange={(e) => setSettings({ ...settings, academicCalendarType: e.target.value })}>
                    {['SEMESTER', 'TRIMESTER', 'ANNUAL'].map((c) => (
                      <option key={c} value={c}>{titleCase(c)}</option>
                    ))}
                  </Select>
                </Field>
                <Field label="Default upload frequency">
                  <Select value={settings.defaultUploadFrequency} disabled={!canEdit} onChange={(e) => setSettings({ ...settings, defaultUploadFrequency: e.target.value })}>
                    {['WEEKLY', 'FORTNIGHTLY', 'MONTHLY', 'TERM_END'].map((c) => (
                      <option key={c} value={c}>{titleCase(c)}</option>
                    ))}
                  </Select>
                </Field>
              </div>
              <div className="space-y-3 rounded-xl border border-slate-200 p-4">
                <div className="text-xs font-bold uppercase tracking-wide text-slate-400">Feature switches</div>
                <Toggle checked={settings.chatbotEnabled} onChange={(v) => canEdit && setSettings({ ...settings, chatbotEnabled: v })} label="Chatbot enabled (WhatsApp student interaction)" />
                <Toggle checked={settings.predictionEnabled} onChange={(v) => canEdit && setSettings({ ...settings, predictionEnabled: v })} label="Prediction enabled (AI risk support)" />
                <Toggle checked={settings.counselingEnabled} onChange={(v) => canEdit && setSettings({ ...settings, counselingEnabled: v })} label="Counseling enabled" />
              </div>
            </div>
          </Card>

          <Card>
            <CardHeader title="Graduated student retention" subtitle="Applied per approved retention/privacy process — never silently" />
            <div className="space-y-4 px-5 py-5">
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Retention (months)">
                  <Input type="number" min={0} value={settings.graduatedRetentionMonths} disabled={!canEdit} onChange={(e) => setSettings({ ...settings, graduatedRetentionMonths: Number(e.target.value) })} />
                </Field>
                <Field label="Retention action">
                  <Select value={settings.retentionAction} disabled={!canEdit} onChange={(e) => setSettings({ ...settings, retentionAction: e.target.value as OrganizationSettings['retentionAction'] })}>
                    {RETENTION_ACTIONS.map((a) => (
                      <option key={a} value={a}>{titleCase(a)}</option>
                    ))}
                  </Select>
                </Field>
              </div>
              <PrivacyNote title="Privacy first">
                Deletion/anonymization follows approved retention processes and must not silently alter
                historical meaning (PRD §21).
              </PrivacyNote>
              {canEdit && (
                <div className="flex justify-end">
                  <Button onClick={() => updateSettings(settings).then(() => notify('Settings saved.')).catch((e) => notify(e?.message ?? 'Save failed', 'error'))}>
                    Save settings
                  </Button>
                </div>
              )}
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
