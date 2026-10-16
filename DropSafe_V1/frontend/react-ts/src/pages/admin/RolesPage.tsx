import { useEffect, useState } from 'react';
import { createRole, listPermissionGroups, listPermissions, listRoles, updateRole } from '../../api/services/admin';
import type { Permission, PermissionGroup, Role } from '../../types/models';
import { Badge, Button, Card, CardHeader, Field, FullPageLoading, Input, PageHeader, StatusBadge, Textarea } from '../../components/ui/primitives';
import { Modal } from '../../components/ui/Modal';
import { useToast } from '../../components/ui/Toast';
import { useAuth } from '../../auth/AuthContext';
import { PrivacyNote } from '../../components/ui/PrivacyNote';
import { titleCase } from '../../lib/format';
import { P } from '../../lib/permissions';

export default function RolesPage() {
  const { notify } = useToast();
  const { canAny } = useAuth();
  const [roles, setRoles] = useState<Role[] | null>(null);
  const [groups, setGroups] = useState<PermissionGroup[]>([]);
  const [perms, setPerms] = useState<Permission[]>([]);
  const [selected, setSelected] = useState<Role | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [draft, setDraft] = useState({ name: '', description: '', permissionGroupIds: [] as string[] });
  const canManage = canAny(P.roleCreate, P.roleUpdate);

  const load = async () => {
    const [r, g, p] = await Promise.all([listRoles(), listPermissionGroups(), listPermissions()]);
    setRoles(r);
    setGroups(g);
    setPerms(p);
    setSelected((s) => s ?? r[0] ?? null);
  };

  useEffect(() => {
    void load().catch((e) => notify(e?.message ?? 'Failed to load roles', 'error'));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!roles) return <FullPageLoading label="Loading roles…" />;

  const toggleGroup = (id: string, list: string[], apply: (next: string[]) => void) => {
    apply(list.includes(id) ? list.filter((x) => x !== id) : [...list, id]);
  };

  const saveRole = async (role: Role) => {
    try {
      await updateRole(role.id, { permissionGroupIds: role.permissionGroupIds, description: role.description });
      notify('Role updated.');
      await load();
    } catch (e: any) {
      notify(e?.message ?? 'Update failed', 'error');
    }
  };

  return (
    <div>
      <PageHeader
        title="Roles & Permissions"
        subtitle="Permissions flow User → Role → Permission Group → Permission. Permissions are never assigned directly to users."
        actions={canManage && <Button onClick={() => { setDraft({ name: '', description: '', permissionGroupIds: [] }); setCreateOpen(true); }}>+ New custom role</Button>}
      />

      <div className="grid gap-5 lg:grid-cols-5">
        {/* Role list */}
        <Card className="lg:col-span-2">
          <CardHeader title={`${roles.length} roles`} subtitle="System roles are protected" />
          <div className="divide-y divide-slate-100">
            {roles.map((r) => (
              <button
                key={r.id}
                onClick={() => setSelected(r)}
                className={`flex w-full items-center justify-between px-5 py-3.5 text-left transition hover:bg-slate-50 ${selected?.id === r.id ? 'bg-brand-50/60' : ''}`}
              >
                <div>
                  <div className="flex items-center gap-2 text-sm font-semibold text-slate-800">
                    {titleCase(r.name)}
                    {r.isSystem && <Badge tone="indigo">System</Badge>}
                  </div>
                  <div className="mt-0.5 line-clamp-1 text-xs text-slate-400">{r.description}</div>
                </div>
                <div className="text-right text-xs text-slate-500">{r.memberCount ?? 0} users</div>
              </button>
            ))}
          </div>
        </Card>

        {/* Role detail */}
        <Card className="lg:col-span-3">
          {selected ? (
            <>
              <CardHeader
                title={titleCase(selected.name)}
                subtitle={selected.isSystem ? 'System Role — cannot be deleted or modified (PRD §7)' : 'Custom role'}
                actions={
                  canManage && !selected.isSystem && (
                    <Button size="sm" onClick={() => saveRole(selected)}>Save changes</Button>
                  )
                }
              />
              <div className="space-y-4 px-5 py-5">
                <div>
                  <div className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-400">Permission groups</div>
                  <div className="grid gap-2.5 sm:grid-cols-2">
                    {groups.map((g) => {
                      const active = selected.permissionGroupIds.includes(g.id);
                      return (
                        <button
                          key={g.id}
                          disabled={!canManage || selected.isSystem}
                          onClick={() =>
                            toggleGroup(g.id, selected.permissionGroupIds, (next) => {
                              const updated = { ...selected, permissionGroupIds: next };
                              setSelected(updated);
                              setRoles((rs) => rs?.map((r) => (r.id === updated.id ? updated : r)) ?? null);
                            })
                          }
                          className={`rounded-xl border p-3 text-left transition disabled:cursor-not-allowed ${active ? 'border-brand-300 bg-brand-50/60' : 'border-slate-200 hover:border-slate-300'}`}
                        >
                          <div className="flex items-center justify-between">
                            <span className="text-sm font-semibold text-slate-800">{g.name}</span>
                            <span className={`h-4 w-4 rounded-full border-2 ${active ? 'border-brand-600 bg-brand-600' : 'border-slate-300'}`} />
                          </div>
                          <div className="mt-1 text-[11px] text-slate-500">{g.description}</div>
                          <div className="mt-2 flex flex-wrap gap-1">
                            {g.permissionIds.map((pid) => {
                              const code = perms.find((p) => p.id === pid)?.code ?? pid;
                              return <Badge key={pid} tone={active ? 'indigo' : 'slate'}>{code}</Badge>;
                            })}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
                <PrivacyNote title="Authorization model">
                  The permission catalogue uses the <code>resource:action</code> convention (e.g.{' '}
                  <code>prediction:view</code>). Effective permissions resolve through the chain above on every
                  request, enforcing organization scope.
                </PrivacyNote>
              </div>
            </>
          ) : (
            <div className="p-8 text-center text-sm text-slate-400">Select a role to inspect its permission groups.</div>
          )}
        </Card>
      </div>

      {/* Create role */}
      <Modal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        title="New custom role"
        subtitle="System Roles cannot be deleted; custom roles extend the matrix per organization needs."
        footer={
          <>
            <Button variant="secondary" onClick={() => setCreateOpen(false)}>Cancel</Button>
            <Button
              disabled={!draft.name}
              onClick={async () => {
                try {
                  await createRole(draft);
                  notify('Role created.');
                  setCreateOpen(false);
                  await load();
                } catch (e: any) {
                  notify(e?.message ?? 'Create failed', 'error');
                }
              }}
            >
              Create role
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <Field label="Role name" required><Input value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} placeholder="e.g. HOD_VIEWER" /></Field>
          <Field label="Description"><Textarea value={draft.description} onChange={(e) => setDraft({ ...draft, description: e.target.value })} /></Field>
          <div>
            <div className="mb-2 text-xs font-semibold text-slate-600">Permission groups</div>
            <div className="space-y-2">
              {groups.map((g) => (
                <label key={g.id} className="flex cursor-pointer items-center gap-2.5 rounded-lg border border-slate-200 px-3 py-2 text-sm hover:bg-slate-50">
                  <input
                    type="checkbox"
                    checked={draft.permissionGroupIds.includes(g.id)}
                    onChange={() => toggleGroup(g.id, draft.permissionGroupIds, (next) => setDraft({ ...draft, permissionGroupIds: next }))}
                    className="h-4 w-4 accent-brand-600"
                  />
                  <span className="font-medium">{g.name}</span>
                  <span className="text-[11px] text-slate-400">{g.permissionIds.length} permissions</span>
                </label>
              ))}
            </div>
          </div>
        </div>
      </Modal>
    </div>
  );
}
