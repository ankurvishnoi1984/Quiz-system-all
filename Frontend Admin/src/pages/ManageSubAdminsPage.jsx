import { Eye, Plus, Shield } from 'lucide-react'
import { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import Modal from '../components/ui/Modal'
import { HostAlertModal } from '../components/live/HostAlertModal'
import { AdminActionOtpModal } from '../components/management/AdminActionOtpModal'
import { useAdminActionOtp } from '../hooks/useAdminActionOtp'
import { useAuthStore } from '../store/authStore'
import { listClientsApi, listDepartmentsApi } from '../services/dashboardApi'
import {
  createSubAdminApi,
  listSubAdminActionsApi,
  listSubAdminsApi,
  updateSubAdminApi,
} from '../services/managementApi'
import {
  RIGHT_GROUPS,
  RIGHT_LABELS,
  SUB_ADMIN_ACCESS_MODES,
  formatRightsSummary,
} from '../utils/userRights'

const emptyForm = {
  full_name: '',
  email: '',
  password: '',
  rights: ['manage_users'],
  sub_admin_access: 'all',
  allowed_client_ids: [],
  allowed_dept_ids: [],
  is_active: true,
}

function toggleInList(list, value) {
  const id = Number(value)
  return list.includes(id) ? list.filter((item) => item !== id) : [...list, id]
}

function ManageSubAdminsPage() {
  const accessToken = useAuthStore((state) => state.accessToken)
  const queryClient = useQueryClient()
  const [createOpen, setCreateOpen] = useState(false)
  const [editUser, setEditUser] = useState(null)
  const [actionsUser, setActionsUser] = useState(null)
  const [alert, setAlert] = useState(null)
  const [form, setForm] = useState(emptyForm)
  const { requestAdminAction, modalProps: adminOtpModalProps } = useAdminActionOtp()

  const subAdminsQuery = useQuery({
    queryKey: ['manage-sub-admins'],
    queryFn: () => listSubAdminsApi(accessToken),
    enabled: Boolean(accessToken),
  })

  const clientsQuery = useQuery({
    queryKey: ['manage-clients'],
    queryFn: () => listClientsApi(accessToken),
    enabled: Boolean(accessToken),
  })

  const departmentsQuery = useQuery({
    queryKey: ['manage-departments-all'],
    queryFn: () => listDepartmentsApi(accessToken),
    enabled: Boolean(accessToken),
  })

  const actionsQuery = useQuery({
    queryKey: ['sub-admin-actions', actionsUser?.user_id],
    queryFn: () => listSubAdminActionsApi(accessToken, actionsUser.user_id, { limit: 50 }),
    enabled: Boolean(accessToken && actionsUser?.user_id),
  })

  const createMutation = useMutation({
    mutationFn: (payload) => createSubAdminApi(accessToken, payload),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['manage-sub-admins'] })
      setCreateOpen(false)
      setForm(emptyForm)
      setAlert({
        variant: 'success',
        title: 'Sub admin created',
        message: data?.email_sent
          ? 'Account created and welcome email sent.'
          : 'Account created, but the welcome email could not be sent.',
        confirmLabel: 'OK',
      })
    },
    onError: (error) => {
      setAlert({
        variant: 'error',
        title: 'Could not create sub admin',
        message: error.message || 'Please try again.',
        confirmLabel: 'Close',
      })
    },
  })

  const updateMutation = useMutation({
    mutationFn: ({ userId, input }) => updateSubAdminApi(accessToken, userId, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['manage-sub-admins'] })
      setEditUser(null)
      setForm(emptyForm)
      setAlert({
        variant: 'success',
        title: 'Sub admin updated',
        message: 'Permissions and access were saved.',
        confirmLabel: 'OK',
      })
    },
    onError: (error) => {
      setAlert({
        variant: 'error',
        title: 'Could not update sub admin',
        message: error.message || 'Please try again.',
        confirmLabel: 'Close',
      })
    },
  })

  const summary = subAdminsQuery.data?.summary || { total: 0, active: 0 }
  const rows = subAdminsQuery.data?.sub_admins || []
  const clients = clientsQuery.data || []
  const departments = departmentsQuery.data || []

  const accessLabel = (row) => {
    if (row.sub_admin_access === 'clients') {
      return `${row.allowed_client_ids?.length || 0} client(s)`
    }
    if (row.sub_admin_access === 'departments') {
      return `${row.allowed_dept_ids?.length || 0} department(s)`
    }
    return 'All clients & departments'
  }

  const openCreate = () => {
    setForm(emptyForm)
    setCreateOpen(true)
  }

  const openEdit = (row) => {
    setEditUser(row)
    setForm({
      full_name: row.full_name || '',
      email: row.email || '',
      password: '',
      rights: Array.isArray(row.rights) ? [...row.rights] : [],
      sub_admin_access: row.sub_admin_access || 'all',
      allowed_client_ids: Array.isArray(row.allowed_client_ids) ? [...row.allowed_client_ids] : [],
      allowed_dept_ids: Array.isArray(row.allowed_dept_ids) ? [...row.allowed_dept_ids] : [],
      is_active: Boolean(row.is_active),
    })
  }

  const buildPayload = () => {
    const payload = {
      full_name: form.full_name.trim(),
      rights: form.rights,
      sub_admin_access: form.sub_admin_access,
      allowed_client_ids: form.sub_admin_access === 'clients' ? form.allowed_client_ids : [],
      allowed_dept_ids: form.sub_admin_access === 'departments' ? form.allowed_dept_ids : [],
    }
    if (!editUser) {
      payload.email = form.email.trim().toLowerCase()
      payload.password = form.password
    } else {
      payload.is_active = form.is_active
      if (form.password.trim()) payload.password = form.password
    }
    return payload
  }

  const submitForm = (event) => {
    event.preventDefault()
    const payload = buildPayload()
    requestAdminAction((otpToken) => {
      const body = otpToken ? { ...payload, otp_token: otpToken } : payload
      if (editUser) {
        updateMutation.mutate({ userId: editUser.user_id, input: body })
      } else {
        createMutation.mutate(body)
      }
    })
  }

  const formModalOpen = createOpen || Boolean(editUser)
  const formTitle = editUser ? 'Edit sub admin' : 'Create sub admin'
  const pending = createMutation.isPending || updateMutation.isPending

  const permissionEditor = useMemo(
    () => (
      <div className="space-y-4">
        {RIGHT_GROUPS.map((group) => (
          <div key={group.id} className="rounded-2xl border border-slate-200 bg-slate-50/70 p-3">
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
              {group.label}
            </p>
            <div className="grid gap-2 sm:grid-cols-2">
              {group.rights.map((right) => {
                const checked = form.rights.includes(right)
                return (
                  <label
                    key={right}
                    className="flex items-start gap-2 rounded-xl border border-transparent bg-white px-3 py-2 text-sm text-slate-700"
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() =>
                        setForm((prev) => ({
                          ...prev,
                          rights: checked
                            ? prev.rights.filter((item) => item !== right)
                            : [...prev.rights, right],
                        }))
                      }
                      className="mt-0.5"
                    />
                    <span>{RIGHT_LABELS[right] || right}</span>
                  </label>
                )
              })}
            </div>
          </div>
        ))}
      </div>
    ),
    [form.rights],
  )

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wide text-blue-600">Platform</p>
          <h2 className="mt-1 text-2xl font-bold text-navy-900">Sub Admin Management</h2>
          <p className="mt-1 text-sm text-slate-600">
            Create sub admins, choose their permissions, and limit them to specific clients or
            departments. Role management stays with super admin only.
          </p>
        </div>
        <button
          type="button"
          onClick={openCreate}
          className="inline-flex items-center gap-2 rounded-xl bg-navy-900 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-navy-800"
        >
          <Plus className="size-4" />
          Add sub admin
        </button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="rounded-3xl border border-blue-100 bg-white p-5 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Total</p>
          <p className="mt-2 text-3xl font-bold text-navy-900">{summary.total}</p>
        </div>
        <div className="rounded-3xl border border-emerald-100 bg-white p-5 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Active</p>
          <p className="mt-2 text-3xl font-bold text-emerald-700">{summary.active}</p>
        </div>
      </div>

      <div className="overflow-hidden rounded-3xl border border-blue-100 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-4 py-3 font-semibold">Sub admin</th>
                <th className="px-4 py-3 font-semibold">Permissions</th>
                <th className="px-4 py-3 font-semibold">Access</th>
                <th className="px-4 py-3 font-semibold">Status</th>
                <th className="px-4 py-3 font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody>
              {subAdminsQuery.isLoading ? (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-slate-500">
                    Loading sub admins…
                  </td>
                </tr>
              ) : rows.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-slate-500">
                    No sub admins yet. Create one to delegate platform work.
                  </td>
                </tr>
              ) : (
                rows.map((row) => (
                  <tr key={row.user_id} className="border-t border-slate-100">
                    <td className="px-4 py-3">
                      <div className="font-semibold text-navy-900">{row.full_name}</div>
                      <div className="text-xs text-slate-500">{row.email}</div>
                    </td>
                    <td className="px-4 py-3 text-slate-700">
                      {formatRightsSummary(row.rights)}
                    </td>
                    <td className="px-4 py-3 text-slate-700">{accessLabel(row)}</td>
                    <td className="px-4 py-3">
                      <span
                        className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                          row.is_active
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-slate-200 text-slate-600'
                        }`}
                      >
                        {row.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={() => openEdit(row)}
                          className="rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-semibold text-navy-800 hover:bg-slate-50"
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          onClick={() => setActionsUser(row)}
                          className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-semibold text-navy-800 hover:bg-slate-50"
                        >
                          <Eye className="size-3.5" />
                          Actions
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <Modal
        open={formModalOpen}
        onClose={() => {
          if (pending) return
          setCreateOpen(false)
          setEditUser(null)
          setForm(emptyForm)
        }}
        title={formTitle}
        size="xl"
      >
        <form onSubmit={submitForm} className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block text-sm">
              <span className="mb-1 block font-semibold text-slate-700">Full name</span>
              <input
                required
                value={form.full_name}
                onChange={(event) => setForm((prev) => ({ ...prev, full_name: event.target.value }))}
                className="w-full rounded-xl border border-slate-200 px-3 py-2"
              />
            </label>
            <label className="block text-sm">
              <span className="mb-1 block font-semibold text-slate-700">Email</span>
              <input
                required={!editUser}
                type="email"
                disabled={Boolean(editUser)}
                value={form.email}
                onChange={(event) => setForm((prev) => ({ ...prev, email: event.target.value }))}
                className="w-full rounded-xl border border-slate-200 px-3 py-2 disabled:bg-slate-100"
              />
            </label>
          </div>

          <label className="block text-sm">
            <span className="mb-1 block font-semibold text-slate-700">
              {editUser ? 'New password (optional)' : 'Temporary password'}
            </span>
            <input
              required={!editUser}
              type="text"
              minLength={8}
              value={form.password}
              onChange={(event) => setForm((prev) => ({ ...prev, password: event.target.value }))}
              className="w-full rounded-xl border border-slate-200 px-3 py-2"
            />
          </label>

          {editUser ? (
            <label className="inline-flex items-center gap-2 text-sm font-semibold text-slate-700">
              <input
                type="checkbox"
                checked={form.is_active}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, is_active: event.target.checked }))
                }
              />
              Active
            </label>
          ) : null}

          <div>
            <p className="mb-2 flex items-center gap-2 text-sm font-semibold text-slate-700">
              <Shield className="size-4" />
              Permissions
            </p>
            {permissionEditor}
          </div>

          <div>
            <p className="mb-2 text-sm font-semibold text-slate-700">Data access</p>
            <div className="space-y-2">
              {SUB_ADMIN_ACCESS_MODES.map((mode) => (
                <label key={mode.value} className="flex items-center gap-2 text-sm text-slate-700">
                  <input
                    type="radio"
                    name="sub_admin_access"
                    checked={form.sub_admin_access === mode.value}
                    onChange={() =>
                      setForm((prev) => ({ ...prev, sub_admin_access: mode.value }))
                    }
                  />
                  {mode.label}
                </label>
              ))}
            </div>
          </div>

          {form.sub_admin_access === 'clients' ? (
            <div className="max-h-48 space-y-2 overflow-auto rounded-2xl border border-slate-200 p-3">
              {clients.map((client) => (
                <label key={client.client_id} className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={form.allowed_client_ids.includes(Number(client.client_id))}
                    onChange={() =>
                      setForm((prev) => ({
                        ...prev,
                        allowed_client_ids: toggleInList(prev.allowed_client_ids, client.client_id),
                      }))
                    }
                  />
                  {client.name}
                </label>
              ))}
            </div>
          ) : null}

          {form.sub_admin_access === 'departments' ? (
            <div className="max-h-48 space-y-2 overflow-auto rounded-2xl border border-slate-200 p-3">
              {departments.map((dept) => (
                <label key={dept.dept_id} className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={form.allowed_dept_ids.includes(Number(dept.dept_id))}
                    onChange={() =>
                      setForm((prev) => ({
                        ...prev,
                        allowed_dept_ids: toggleInList(prev.allowed_dept_ids, dept.dept_id),
                      }))
                    }
                  />
                  {dept.name}
                  {dept.client?.name ? (
                    <span className="text-xs text-slate-500">({dept.client.name})</span>
                  ) : null}
                </label>
              ))}
            </div>
          ) : null}

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              disabled={pending}
              onClick={() => {
                setCreateOpen(false)
                setEditUser(null)
                setForm(emptyForm)
              }}
              className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={pending || form.rights.length === 0}
              className="rounded-xl bg-navy-900 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
            >
              {pending ? 'Saving…' : editUser ? 'Save changes' : 'Create sub admin'}
            </button>
          </div>
        </form>
      </Modal>

      <Modal
        open={Boolean(actionsUser)}
        onClose={() => setActionsUser(null)}
        title={actionsUser ? `Actions — ${actionsUser.full_name}` : 'Actions'}
        size="lg"
      >
        <div className="max-h-[60vh] space-y-3 overflow-auto">
          {actionsQuery.isLoading ? (
            <p className="text-sm text-slate-500">Loading actions…</p>
          ) : (actionsQuery.data?.logs || actionsQuery.data?.items || []).length === 0 ? (
            <p className="text-sm text-slate-500">No recorded actions yet.</p>
          ) : (
            (actionsQuery.data?.logs || actionsQuery.data?.items || []).map((log) => (
              <div
                key={log.audit_log_id || `${log.action}-${log.created_at}`}
                className="rounded-2xl border border-slate-200 px-3 py-2 text-sm"
              >
                <div className="font-semibold text-navy-900">
                  {log.action} {log.entity_type}
                  {log.entity_id ? ` #${log.entity_id}` : ''}
                </div>
                <div className="text-xs text-slate-500">
                  {log.created_at ? new Date(log.created_at).toLocaleString() : '—'}
                  {log.request_path ? ` · ${log.request_path}` : ''}
                </div>
              </div>
            ))
          )}
        </div>
      </Modal>

      <AdminActionOtpModal {...adminOtpModalProps} />
      <HostAlertModal
        open={Boolean(alert)}
        onClose={() => setAlert(null)}
        variant={alert?.variant}
        title={alert?.title}
        message={alert?.message}
        confirmLabel={alert?.confirmLabel}
      />
    </div>
  )
}

export default ManageSubAdminsPage
