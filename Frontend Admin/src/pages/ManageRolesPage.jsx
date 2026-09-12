import { Plus } from 'lucide-react'
import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import Modal from '../components/ui/Modal'
import { HostAlertModal } from '../components/live/HostAlertModal'
import { useAuthStore } from '../store/authStore'
import {
  createRoleApi,
  deleteRoleApi,
  listRolesApi,
  updateRoleApi,
} from '../services/managementApi'
import {
  ASSIGNABLE_DATA_SCOPES,
  DATA_SCOPE_LABELS,
  OPERATIONAL_RIGHTS,
  RIGHT_LABELS,
} from '../utils/userRights'

const emptyForm = {
  name: '',
  data_scope: 'own_sessions',
  permissions: [...OPERATIONAL_RIGHTS],
}

function StatusToggle({ checked, disabled, pending, onChange }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled || pending}
      onClick={() => onChange(!checked)}
      className={`group inline-flex items-center gap-2.5 rounded-full p-0.5 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/30 disabled:cursor-not-allowed ${
        disabled ? 'opacity-70' : ''
      }`}
    >
      <span
        className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors duration-200 ${
          checked ? 'bg-emerald-500' : 'bg-slate-300'
        } ${pending ? 'opacity-70' : ''} ${!disabled ? 'group-hover:brightness-95' : ''}`}
      >
        <span
          className={`inline-block size-5 rounded-full bg-white shadow-sm shadow-slate-900/15 transition-transform duration-200 ${
            checked ? 'translate-x-[22px]' : 'translate-x-0.5'
          }`}
        />
      </span>
      <span className={`text-xs font-semibold ${checked ? 'text-emerald-700' : 'text-slate-500'}`}>
        {checked ? 'Active' : 'Disabled'}
      </span>
    </button>
  )
}

function ManageRolesPage() {
  const accessToken = useAuthStore((state) => state.accessToken)
  const queryClient = useQueryClient()
  const [createOpen, setCreateOpen] = useState(false)
  const [editRole, setEditRole] = useState(null)
  const [alert, setAlert] = useState(null)
  const [form, setForm] = useState(emptyForm)

  const rolesQuery = useQuery({
    queryKey: ['manage-roles'],
    queryFn: () => listRolesApi(accessToken),
    enabled: Boolean(accessToken),
  })

  const createMutation = useMutation({
    mutationFn: (payload) => createRoleApi(accessToken, payload),
    onSuccess: (role) => {
      queryClient.invalidateQueries({ queryKey: ['manage-roles'] })
      setCreateOpen(false)
      setForm(emptyForm)
      setAlert({
        variant: 'success',
        title: 'Role created',
        message: `"${role?.name || 'Role'}" was created. Users assigned this role will share its permissions.`,
        confirmLabel: 'OK',
      })
    },
    onError: (error) => {
      setAlert({
        variant: 'error',
        title: 'Could not create role',
        message: error.message || 'Please try again.',
        confirmLabel: 'Close',
      })
    },
  })

  const updateMutation = useMutation({
    mutationFn: ({ roleId, input }) => updateRoleApi(accessToken, roleId, input),
    onSuccess: (role) => {
      queryClient.invalidateQueries({ queryKey: ['manage-roles'] })
      queryClient.invalidateQueries({ queryKey: ['manage-users'] })
      setEditRole(null)
      setForm(emptyForm)
      setAlert({
        variant: 'success',
        title: 'Role updated',
        message: `"${role?.name || 'Role'}" was saved. Everyone with this role now has the updated access.`,
        confirmLabel: 'OK',
      })
    },
    onError: (error) => {
      setAlert({
        variant: 'error',
        title: 'Could not update role',
        message: error.message || 'Please try again.',
        confirmLabel: 'Close',
      })
    },
  })

  const deleteMutation = useMutation({
    mutationFn: (roleId) => deleteRoleApi(accessToken, roleId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['manage-roles'] })
      setAlert({
        variant: 'success',
        title: 'Role deleted',
        message: 'The role was removed.',
        confirmLabel: 'OK',
      })
    },
    onError: (error) => {
      setAlert({
        variant: 'error',
        title: 'Could not delete role',
        message: error.message || 'Please try again.',
        confirmLabel: 'Close',
      })
    },
  })

  const isBusy = createMutation.isPending || updateMutation.isPending || deleteMutation.isPending
  const modalOpen = createOpen || Boolean(editRole)
  const lockedRole = editRole?.slug === 'super_admin'

  const handleSubmit = (event) => {
    event.preventDefault()
    if (lockedRole) return
    const name = form.name.trim()
    if (!name) return
    const payload = {
      name,
      permissions: OPERATIONAL_RIGHTS.filter((key) => form.permissions.includes(key)),
    }
    if (!editRole || !editRole.is_system) {
      payload.data_scope = form.data_scope
    }

    if (editRole) {
      updateMutation.mutate({ roleId: editRole.role_id, input: payload })
      return
    }

    createMutation.mutate(payload)
  }

  const openEdit = (role) => {
    if (role.slug === 'super_admin') return
    setCreateOpen(false)
    setEditRole(role)
    setForm({
      name: role.name || '',
      data_scope: role.data_scope === 'platform' ? 'client' : role.data_scope || 'own_sessions',
      permissions: Array.isArray(role.permissions) ? [...role.permissions] : [],
    })
  }

  return (
    <section className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.25em] text-navy-700">Administration</p>
          <h2 className="mt-1 text-2xl font-bold text-navy-900">Role Management</h2>
          <p className="mt-1 text-sm text-slate-600">
            Permissions belong to the role. Changing Host access updates every host. Department
            Analytics and Client Analytics stay super admin only.
          </p>
        </div>
        <button
          type="button"
          onClick={() => {
            setEditRole(null)
            setForm(emptyForm)
            setCreateOpen(true)
          }}
          className="inline-flex items-center gap-2 rounded-2xl bg-linear-to-r from-navy-900 via-navy-700 to-navy-600 px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-blue-900/25 transition hover:brightness-110"
        >
          <Plus className="size-4" />
          New Role
        </button>
      </div>

      {rolesQuery.isLoading ? (
        <div className="rounded-2xl border border-blue-200/70 bg-white/70 p-8 text-center text-slate-600">
          Loading roles...
        </div>
      ) : null}

      {rolesQuery.error ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-8 text-center text-red-700">
          {rolesQuery.error.message || 'Failed to load roles'}
        </div>
      ) : null}

      <div className="overflow-hidden rounded-2xl border border-blue-200/70 bg-white/90 shadow-sm shadow-blue-900/5">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-blue-100 bg-blue-50/50">
            <tr>
              <th className="px-4 py-3 font-semibold text-slate-700">Role</th>
              <th className="px-4 py-3 font-semibold text-slate-700">Data scope</th>
              <th className="px-4 py-3 font-semibold text-slate-700">Permissions</th>
              <th className="px-4 py-3 font-semibold text-slate-700">Users</th>
              <th className="px-4 py-3 font-semibold text-slate-700">Status</th>
              <th className="px-4 py-3 font-semibold text-slate-700">Actions</th>
            </tr>
          </thead>
          <tbody>
            {(rolesQuery.data || []).map((role) => {
              const isSuperAdmin = role.slug === 'super_admin'
              const canDelete = !role.is_system && Number(role.users_count || 0) === 0
              return (
                <tr key={role.role_id} className="border-b border-blue-50 last:border-b-0">
                  <td className="px-4 py-3">
                    <p className="font-semibold text-navy-900">{role.name}</p>
                    <p className="text-xs text-slate-500">
                      {role.slug}
                      {role.is_system ? ' · System' : ''}
                    </p>
                  </td>
                  <td className="px-4 py-3 text-slate-700">
                    {DATA_SCOPE_LABELS[role.data_scope] || role.data_scope}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-1.5">
                      {(role.permissions || []).length ? (
                        (role.permissions || []).map((key) => (
                          <span
                            key={key}
                            className="rounded-full bg-blue-50 px-2 py-0.5 text-[11px] font-semibold text-navy-800"
                          >
                            {RIGHT_LABELS[key] || key}
                          </span>
                        ))
                      ) : (
                        <span className="text-xs text-slate-500">None</span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-slate-700">{Number(role.users_count || 0)}</td>
                  <td className="px-4 py-3">
                    <StatusToggle
                      checked={Boolean(role.is_active)}
                      disabled={isSuperAdmin}
                      pending={updateMutation.isPending}
                      onChange={(isActive) => {
                        if (isSuperAdmin) return
                        updateMutation.mutate({
                          roleId: role.role_id,
                          input: { is_active: isActive },
                        })
                      }}
                    />
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        disabled={isSuperAdmin}
                        onClick={() => openEdit(role)}
                        className="rounded-lg border border-blue-200/70 bg-white px-2.5 py-1.5 text-xs font-semibold text-navy-800 transition hover:bg-blue-50 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        Edit
                      </button>
                      {canDelete ? (
                        <button
                          type="button"
                          disabled={isBusy}
                          onClick={() => deleteMutation.mutate(role.role_id)}
                          className="rounded-lg border border-red-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-red-700 transition hover:bg-red-50 disabled:opacity-50"
                        >
                          Delete
                        </button>
                      ) : null}
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      <Modal
        open={modalOpen}
        title={editRole ? `Edit role — ${editRole.name}` : 'New role'}
        onClose={() => {
          if (isBusy) return
          setCreateOpen(false)
          setEditRole(null)
          setForm(emptyForm)
        }}
      >
        <form className="space-y-4" onSubmit={handleSubmit}>
          <div>
            <label className="text-sm font-semibold text-slate-700">Name</label>
            <input
              value={form.name}
              onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
              className="mt-1 h-11 w-full rounded-xl border border-blue-200/70 bg-white px-3 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-500/15"
              placeholder="Presenter"
              required
              disabled={lockedRole}
            />
          </div>
          <div>
            <label className="text-sm font-semibold text-slate-700">Data scope</label>
            <select
              value={form.data_scope}
              onChange={(e) => setForm((prev) => ({ ...prev, data_scope: e.target.value }))}
              disabled={Boolean(editRole?.is_system) || lockedRole}
              className="mt-1 h-11 w-full rounded-xl border border-blue-200/70 bg-white px-3 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-500/15 disabled:cursor-not-allowed disabled:bg-slate-50"
            >
              {ASSIGNABLE_DATA_SCOPES.map((scope) => (
                <option key={scope} value={scope}>
                  {DATA_SCOPE_LABELS[scope]}
                </option>
              ))}
            </select>
            <p className="mt-1 text-xs text-slate-500">
              Platform scope is reserved for super admin. Department and Client Analytics cannot be
              granted here.
            </p>
          </div>
          <div className="space-y-2">
            <p className="text-sm font-semibold text-slate-700">Permissions</p>
            {OPERATIONAL_RIGHTS.map((key) => {
              const checked = form.permissions.includes(key)
              return (
                <label
                  key={key}
                  className="flex items-center justify-between gap-3 rounded-xl border border-blue-200/70 bg-white px-3 py-2.5"
                >
                  <span className="text-sm font-semibold text-slate-800">{RIGHT_LABELS[key]}</span>
                  <input
                    type="checkbox"
                    checked={checked}
                    disabled={lockedRole}
                    onChange={() => {
                      setForm((prev) => ({
                        ...prev,
                        permissions: checked
                          ? prev.permissions.filter((item) => item !== key)
                          : [...prev.permissions, key],
                      }))
                    }}
                    className="h-4 w-4 rounded border-slate-300 text-navy-700 focus:ring-blue-500/40"
                  />
                </label>
              )
            })}
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              disabled={isBusy}
              onClick={() => {
                setCreateOpen(false)
                setEditRole(null)
                setForm(emptyForm)
              }}
              className="h-11 rounded-xl border border-blue-200/70 bg-white px-4 text-sm font-semibold text-slate-700 transition hover:bg-blue-50 disabled:opacity-60"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isBusy || lockedRole}
              className="h-11 rounded-xl bg-linear-to-r from-navy-900 via-navy-700 to-navy-600 px-4 text-sm font-semibold text-white shadow-lg shadow-blue-900/25 transition hover:brightness-110 disabled:opacity-60"
            >
              {isBusy ? 'Saving…' : editRole ? 'Save role' : 'Create role'}
            </button>
          </div>
        </form>
      </Modal>

      <HostAlertModal
        open={Boolean(alert)}
        variant={alert?.variant ?? 'success'}
        title={alert?.title ?? ''}
        message={alert?.message ?? ''}
        confirmLabel={alert?.confirmLabel ?? 'OK'}
        onClose={() => setAlert(null)}
      />
    </section>
  )
}

export default ManageRolesPage
