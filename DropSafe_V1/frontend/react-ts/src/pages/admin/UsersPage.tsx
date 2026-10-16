import { useEffect, useState } from 'react';
import { createUser, listRoles, listUsers, updateUser } from '../../api/services/admin';
import type { PortalUser, Role } from '../../types/models';
import { Avatar, Button, Card, CardHeader, Field, FullPageLoading, Input, PageHeader, SearchInput, Select, StatusBadge } from '../../components/ui/primitives';
import { Table, THead, TBody, Tr, Th, Td } from '../../components/ui/Table';
import { Modal, ConfirmModal } from '../../components/ui/Modal';
import { useToast } from '../../components/ui/Toast';
import { useAuth } from '../../auth/AuthContext';
import { allowedTransitions } from '../../lib/transitions';
import { formatDateTime, titleCase } from '../../lib/format';
import { P } from '../../lib/permissions';

export default function UsersPage() {
  const { notify } = useToast();
  const { canAny, user: me } = useAuth();
  const [users, setUsers] = useState<PortalUser[] | null>(null);
  const [roles, setRoles] = useState<Role[]>([]);
  const [q, setQ] = useState('');
  const [createOpen, setCreateOpen] = useState(false);
  const [confirm, setConfirm] = useState<{ user: PortalUser; to: string } | null>(null);
  const [form, setForm] = useState({ name: '', email: '', password: '', roleId: '' });
  const canManage = canAny(P.userCreate, P.userUpdate);

  const load = async () => {
    const [u, r] = await Promise.all([listUsers(), listRoles()]);
    setUsers(u);
    setRoles(r);
    if (!form.roleId && r.length) setForm((f) => ({ ...f, roleId: r.find((x) => !x.isSystem || x.name !== 'ORG_ADMIN')?.id ?? r[0].id }));
  };

  useEffect(() => {
    void load().catch((e) => notify(e?.message ?? 'Failed to load users', 'error'));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!users) return <FullPageLoading label="Loading users…" />;

  const filtered = users.filter((u) => `${u.name} ${u.email}`.toLowerCase().includes(q.toLowerCase()));

  const submitCreate = async () => {
    try {
      await createUser({ name: form.name, email: form.email, password: form.password || undefined, roleIds: [form.roleId] });
      notify('User created. Credentials must be shared securely.');
      setCreateOpen(false);
      setForm((f) => ({ ...f, name: '', email: '', password: '' }));
      await load();
    } catch (e: any) {
      notify(e?.message ?? 'Create failed', 'error');
    }
  };

  return (
    <div>
      <PageHeader
        title="Users"
        subtitle="Authenticated portal users of this organization. Students are not portal users — they interact via the chatbot."
        actions={canManage && <Button onClick={() => setCreateOpen(true)}>+ New user</Button>}
      />
      <Card>
        <CardHeader title={`${filtered.length} users`} subtitle="Users can be disabled without deleting historical records" actions={<SearchInput value={q} onChange={setQ} placeholder="Search name or email…" />} />
        <Table>
          <THead>
            <Tr><Th>User</Th><Th>Roles</Th><Th>Status</Th><Th>Last login</Th><Th>Created</Th><Th /></Tr>
          </THead>
          <TBody>
            {filtered.map((u) => (
              <Tr key={u.id}>
                <Td>
                  <div className="flex items-center gap-2.5">
                    <Avatar name={u.name} />
                    <div>
                      <div className="font-semibold text-slate-800">{u.name}{u.id === me?.id && <span className="ml-1.5 text-[10px] font-bold text-brand-600">(you)</span>}</div>
                      <div className="text-[11px] text-slate-400">{u.email}</div>
                    </div>
                  </div>
                </Td>
                <Td>{u.roles.map((r) => <StatusBadge key={r.id} status={r.name} />)}</Td>
                <Td><StatusBadge status={u.status} /></Td>
                <Td className="text-xs text-slate-500">{u.lastLoginAt ? formatDateTime(u.lastLoginAt) : 'Never'}</Td>
                <Td className="text-xs text-slate-500">{formatDateTime(u.createdAt)}</Td>
                <Td className="text-right">
                  {canManage && u.id !== me?.id && allowedTransitions('user', u.status).length > 0 && (
                    <div className="flex justify-end gap-1.5">
                      {allowedTransitions('user', u.status).map((to) => (
                        <Button key={to} size="sm" variant={to === 'LOCKED' ? 'warning' : to === 'INACTIVE' ? 'danger' : 'secondary'} onClick={() => setConfirm({ user: u, to })}>
                          {titleCase(to)}
                        </Button>
                      ))}
                    </div>
                  )}
                </Td>
              </Tr>
            ))}
          </TBody>
        </Table>
      </Card>

      {/* Create user */}
      <Modal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        title="New portal user"
        subtitle="Authentication is email-based. Passwords are never stored in plain text."
        footer={
          <>
            <Button variant="secondary" onClick={() => setCreateOpen(false)}>Cancel</Button>
            <Button onClick={submitCreate} disabled={!form.name || !form.email || !form.roleId}>Create user</Button>
          </>
        }
      >
        <div className="space-y-4">
          <Field label="Full name" required><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. Priya Nair" /></Field>
          <Field label="Email (unique within the organization)" required><Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="name@vvce.edu.in" /></Field>
          <Field label="Temporary password" hint="User should change it on first sign-in">
            <Input type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} placeholder="Set a temporary password" />
          </Field>
          <Field label="Role" required hint="Roles grant permissions via permission groups">
            <Select value={form.roleId} onChange={(e) => setForm({ ...form, roleId: e.target.value })}>
              {roles.map((r) => (
                <option key={r.id} value={r.id}>{titleCase(r.name)}{r.isSystem ? ' (system)' : ''}</option>
              ))}
            </Select>
          </Field>
        </div>
      </Modal>

      {/* Status transition confirm */}
      <ConfirmModal
        open={!!confirm}
        onClose={() => setConfirm(null)}
        danger={confirm?.to !== 'ACTIVE'}
        title={`${titleCase(confirm?.to)} user`}
        message={confirm ? `Change ${confirm.user.name} from ${titleCase(confirm.user.status)} to ${titleCase(confirm.to)}? The user lifecycle is ACTIVE → LOCKED → INACTIVE, and historical records are preserved either way.` : ''}
        confirmLabel={`Set ${titleCase(confirm?.to)}`}
        onConfirm={async () => {
          if (!confirm) return;
          try {
            await updateUser(confirm.user.id, { status: confirm.to });
            notify('User status updated.');
            setConfirm(null);
            await load();
          } catch (e: any) {
            notify(e?.message ?? 'Update failed', 'error');
          }
        }}
      />
    </div>
  );
}
