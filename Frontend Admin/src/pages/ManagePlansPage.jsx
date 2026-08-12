import { Plus } from 'lucide-react'
import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import Modal from '../components/ui/Modal'
import { HostAlertModal } from '../components/live/HostAlertModal'
import { useAuthStore } from '../store/authStore'
import {
  createPlanApi,
  listPlansApi,
  updatePlanApi,
} from '../services/managementApi'

const emptyForm = {
  name: '',
  description: '',
  max_participants: '100',
  is_active: true,
}

function ManagePlansPage() {
  const accessToken = useAuthStore((state) => state.accessToken)
  const queryClient = useQueryClient()
  const [createOpen, setCreateOpen] = useState(false)
  const [editPlan, setEditPlan] = useState(null)
  const [alert, setAlert] = useState(null)
  const [form, setForm] = useState(emptyForm)

  const plansQuery = useQuery({
    queryKey: ['manage-plans'],
    queryFn: () => listPlansApi(accessToken),
    enabled: Boolean(accessToken),
  })

  const createMutation = useMutation({
    mutationFn: (payload) => createPlanApi(accessToken, payload),
    onSuccess: (plan) => {
      queryClient.invalidateQueries({ queryKey: ['manage-plans'] })
      setCreateOpen(false)
      setForm(emptyForm)
      setAlert({
        variant: 'success',
        title: 'Plan created',
        message: `"${plan?.name || 'Plan'}" was created successfully.`,
        confirmLabel: 'OK',
      })
    },
    onError: (error) => {
      setAlert({
        variant: 'error',
        title: 'Could not create plan',
        message: error.message || 'Please try again.',
        confirmLabel: 'Close',
      })
    },
  })

  const updateMutation = useMutation({
    mutationFn: ({ planId, input }) => updatePlanApi(accessToken, planId, input),
    onSuccess: (plan) => {
      queryClient.invalidateQueries({ queryKey: ['manage-plans'] })
      queryClient.invalidateQueries({ queryKey: ['manage-users'] })
      setEditPlan(null)
      setForm(emptyForm)
      setAlert({
        variant: 'success',
        title: 'Plan updated',
        message: `"${plan?.name || 'Plan'}" was saved successfully.`,
        confirmLabel: 'OK',
      })
    },
    onError: (error) => {
      setAlert({
        variant: 'error',
        title: 'Could not update plan',
        message: error.message || 'Please try again.',
        confirmLabel: 'Close',
      })
    },
  })

  const isBusy = createMutation.isPending || updateMutation.isPending

  const handleSubmit = (event) => {
    event.preventDefault()
    if (!form.name.trim()) return
    const maxParticipants = Number(form.max_participants)
    if (!Number.isInteger(maxParticipants) || maxParticipants <= 0) return

    const payload = {
      name: form.name.trim(),
      description: form.description.trim() || null,
      max_participants: maxParticipants,
      is_active: Boolean(form.is_active),
    }

    if (editPlan) {
      updateMutation.mutate({ planId: editPlan.plan_id, input: payload })
      return
    }

    createMutation.mutate(payload)
  }

  return (
    <section className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.25em] text-navy-700">Administration</p>
          <h2 className="mt-1 text-2xl font-bold text-navy-900">Paid Plans</h2>
          <p className="mt-1 text-sm text-slate-600">
            Each plan sets how many participants can be connected at the same time across all of a user&apos;s sessions. Disconnecting frees up capacity.
          </p>
        </div>
        <button
          type="button"
          onClick={() => {
            setEditPlan(null)
            setForm(emptyForm)
            setCreateOpen(true)
          }}
          className="inline-flex items-center gap-2 rounded-2xl bg-linear-to-r from-navy-900 via-navy-700 to-navy-600 px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-blue-900/25 transition hover:brightness-110"
        >
          <Plus className="size-4" />
          New Plan
        </button>
      </div>

      {plansQuery.isLoading ? (
        <div className="rounded-2xl border border-blue-200/70 bg-white/70 p-8 text-center text-slate-600">
          Loading plans...
        </div>
      ) : null}

      {plansQuery.error ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-8 text-center text-red-700">
          {plansQuery.error.message || 'Failed to load plans'}
        </div>
      ) : null}

      <div className="overflow-hidden rounded-2xl border border-blue-200/70 bg-white/90 shadow-sm shadow-blue-900/5">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-blue-100 bg-blue-50/50">
            <tr>
              <th className="px-4 py-3 font-semibold text-slate-700">Plan</th>
              <th className="px-4 py-3 font-semibold text-slate-700">Participant limit</th>
              <th className="px-4 py-3 font-semibold text-slate-700">Description</th>
              <th className="px-4 py-3 font-semibold text-slate-700">Status</th>
              <th className="px-4 py-3 font-semibold text-slate-700">Actions</th>
            </tr>
          </thead>
          <tbody>
            {(plansQuery.data || []).map((plan) => (
              <tr key={plan.plan_id} className="border-b border-blue-50 last:border-b-0">
                <td className="px-4 py-3 font-semibold text-navy-900">{plan.name}</td>
                <td className="px-4 py-3 text-slate-700">
                  {Number(plan.max_participants).toLocaleString()} connected at once
                </td>
                <td className="px-4 py-3 text-slate-600">{plan.description || '—'}</td>
                <td className="px-4 py-3">
                  <span
                    className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-semibold ${
                      plan.is_active
                        ? 'bg-emerald-50 text-emerald-700'
                        : 'bg-slate-100 text-slate-600'
                    }`}
                  >
                    {plan.is_active ? 'Active' : 'Inactive'}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <button
                    type="button"
                    onClick={() => {
                      setCreateOpen(false)
                      setEditPlan(plan)
                      setForm({
                        name: plan.name || '',
                        description: plan.description || '',
                        max_participants: String(plan.max_participants ?? ''),
                        is_active: Boolean(plan.is_active),
                      })
                    }}
                    className="rounded-xl border border-blue-200/70 bg-white px-3 py-1.5 text-xs font-semibold text-navy-800 transition hover:bg-blue-50"
                  >
                    Edit
                  </button>
                </td>
              </tr>
            ))}
            {!plansQuery.isLoading && !(plansQuery.data || []).length ? (
              <tr>
                <td colSpan={5} className="px-4 py-10 text-center text-slate-600">
                  No plans yet. Create a plan, then assign it to a user.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>

      <Modal
        open={createOpen || Boolean(editPlan)}
        title={editPlan ? 'Edit Plan' : 'New Plan'}
        onClose={() => {
          if (isBusy) return
          setCreateOpen(false)
          setEditPlan(null)
        }}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-sm font-semibold text-slate-700">Plan name</label>
            <input
              value={form.name}
              onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
              className="mt-1 h-11 w-full rounded-xl border border-blue-200/70 bg-white px-3 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-500/15"
              placeholder="Standard"
              required
            />
          </div>
          <div>
            <label className="text-sm font-semibold text-slate-700">Participant limit</label>
            <input
              type="number"
              min={1}
              step={1}
              value={form.max_participants}
              onChange={(e) => setForm((prev) => ({ ...prev, max_participants: e.target.value }))}
              className="mt-1 h-11 w-full rounded-xl border border-blue-200/70 bg-white px-3 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-500/15"
              placeholder="100"
              required
            />
            <p className="mt-1 text-xs text-slate-500">
              Maximum connected participants at the same time across all of the user&apos;s sessions.
            </p>
          </div>
          <div>
            <label className="text-sm font-semibold text-slate-700">Description (optional)</label>
            <input
              value={form.description}
              onChange={(e) => setForm((prev) => ({ ...prev, description: e.target.value }))}
              className="mt-1 h-11 w-full rounded-xl border border-blue-200/70 bg-white px-3 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-500/15"
              placeholder="Up to 100 connected participants at once"
            />
          </div>
          <label className="flex items-center gap-2 text-sm font-semibold text-slate-700">
            <input
              type="checkbox"
              checked={form.is_active}
              onChange={(e) => setForm((prev) => ({ ...prev, is_active: e.target.checked }))}
              className="size-4 rounded border-blue-300 text-navy-800"
            />
            Active
          </label>
          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              disabled={isBusy}
              onClick={() => {
                setCreateOpen(false)
                setEditPlan(null)
              }}
              className="h-11 rounded-xl border border-blue-200/70 bg-white px-4 text-sm font-semibold text-slate-700 transition hover:bg-blue-50 disabled:opacity-60"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isBusy}
              className="h-11 rounded-xl bg-linear-to-r from-navy-900 via-navy-700 to-navy-600 px-4 text-sm font-semibold text-white shadow-lg shadow-blue-900/25 transition hover:brightness-110 disabled:opacity-60"
            >
              {isBusy ? 'Saving…' : editPlan ? 'Save plan' : 'Create plan'}
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

export default ManagePlansPage
