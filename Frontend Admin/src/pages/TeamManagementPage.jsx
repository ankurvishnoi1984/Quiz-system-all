import { BookOpen, Mail, Pencil, Plus, ShieldCheck, Trash2, UserCheck, Users } from 'lucide-react'
import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import Modal from '../components/ui/Modal'
import { HostAlertModal } from '../components/live/HostAlertModal'
import { useAuthStore } from '../store/authStore'
import {
  addTeamMemberApi,
  getMyTeamApi,
  removeTeamMemberApi,
  resendTeamMemberVerificationApi,
  updateTeamMemberApi,
} from '../services/teamApi'

export default function TeamManagementPage() {
  const accessToken = useAuthStore((state) => state.accessToken)
  const queryClient = useQueryClient()
  const [addOpen, setAddOpen] = useState(false)
  const [editMember, setEditMember] = useState(null)
  const [removeMember, setRemoveMember] = useState(null)
  const [form, setForm] = useState({ full_name: '', email: '', role: 'host' })
  const [alert, setAlert] = useState(null)

  const teamQuery = useQuery({
    queryKey: ['my-team'],
    queryFn: () => getMyTeamApi(accessToken),
    enabled: Boolean(accessToken),
  })
  const refresh = () => queryClient.invalidateQueries({ queryKey: ['my-team'] })

  const addMutation = useMutation({
    mutationFn: (payload) => addTeamMemberApi(accessToken, payload),
    onSuccess: (result) => {
      refresh()
      setAddOpen(false)
      setForm({ full_name: '', email: '', role: 'host' })
      setAlert({
        variant: result?.email_sent ? 'success' : 'error',
        title: 'Team member added',
        message: result?.email_sent
          ? 'The verification email and temporary password were sent.'
          : `The member was added, but the email could not be sent. ${result?.email_error || ''}`,
      })
    },
    onError: (error) =>
      setAlert({ variant: 'error', title: 'Could not add member', message: error.message }),
  })

  const resendMutation = useMutation({
    mutationFn: (memberId) => resendTeamMemberVerificationApi(accessToken, memberId),
    onSuccess: () =>
      setAlert({
        variant: 'success',
        title: 'Verification sent',
        message: 'A fresh verification link and temporary password were emailed.',
      }),
    onError: (error) =>
      setAlert({ variant: 'error', title: 'Could not resend email', message: error.message }),
  })

  const editMutation = useMutation({
    mutationFn: (payload) =>
      updateTeamMemberApi(accessToken, editMember.user_id, payload),
    onSuccess: () => {
      refresh()
      setEditMember(null)
      setAlert({
        variant: 'success',
        title: 'Member updated',
        message: 'Updated verification details and a new temporary password were emailed.',
      })
    },
    onError: (error) =>
      setAlert({ variant: 'error', title: 'Could not update member', message: error.message }),
  })

  const removeMutation = useMutation({
    mutationFn: (memberId) => removeTeamMemberApi(accessToken, memberId),
    onSuccess: () => {
      refresh()
      setRemoveMember(null)
      setAlert({
        variant: 'success',
        title: 'Member removed',
        message:
          removeMember?.role === 'host'
            ? 'The member can no longer sign in and the Host seat is available again.'
            : `The member can no longer sign in and the Question ${removeMember?.role === 'author' ? 'Author' : 'Auditor'} slot is available again.`,
      })
    },
    onError: (error) =>
      setAlert({ variant: 'error', title: 'Could not remove member', message: error.message }),
  })

  const team = teamQuery.data
  const seats = team?.seats || { used: 0, total: 0, remaining: 0 }
  const contentRoles = team?.content_roles || {
    author: { used: 0, limit: 1, remaining: 1 },
    auditor: { used: 0, limit: 1, remaining: 1 },
  }
  const canAddAny =
    Boolean(team?.plan && seats.remaining > 0) ||
    contentRoles.author.remaining > 0 ||
    contentRoles.auditor.remaining > 0
  const usagePercent = seats.total ? Math.min(100, Math.round((seats.used / seats.total) * 100)) : 0

  return (
    <section className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.25em] text-navy-700">Workspace</p>
          <h2 className="mt-1 text-2xl font-bold text-navy-900">Team Management</h2>
          <p className="mt-1 text-sm text-slate-600">
            Add Host teammates and manage your private Question Author and Auditor.
          </p>
        </div>
        <button
          type="button"
          onClick={() => {
            const hostAvailable = Boolean(team?.plan && seats.remaining > 0)
            const nextRole = hostAvailable
              ? 'host'
              : contentRoles.author.remaining > 0
                ? 'author'
                : 'auditor'
            setForm((current) => ({ ...current, role: nextRole }))
            setAddOpen(true)
          }}
          disabled={!canAddAny}
          className="inline-flex h-11 items-center gap-2 rounded-xl bg-navy-900 px-4 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"
        >
          <Plus className="size-4" /> Add member
        </button>
      </div>

      {teamQuery.isLoading ? (
        <div className="rounded-2xl border border-blue-200 bg-white p-8 text-center text-slate-600">
          Loading team…
        </div>
      ) : null}
      {teamQuery.error ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-5 text-red-700">
          {teamQuery.error.message}
        </div>
      ) : null}

      {team ? (
        <>
          <div className="rounded-2xl border border-blue-200/70 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="font-semibold text-navy-900">{team.plan?.name || 'No active team plan'}</p>
                <p className="mt-1 text-sm text-slate-600">
                  {seats.used} of {seats.total} member seats used
                </p>
              </div>
              <Users className="size-7 text-blue-600" />
            </div>
            <div className="mt-4 h-2 overflow-hidden rounded-full bg-blue-100">
              <div className="h-full rounded-full bg-blue-600" style={{ width: `${usagePercent}%` }} />
            </div>
            {!team.plan ? (
              <p className="mt-3 text-sm font-medium text-amber-700">
                A paid plan is required only for additional Hosts. Author and Auditor access remains available.
              </p>
            ) : seats.remaining <= 0 ? (
              <p className="mt-3 text-sm font-medium text-amber-700">
                All Host seats are used. Author and Auditor slots are managed separately below.
              </p>
            ) : null}
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="rounded-2xl border border-violet-200 bg-violet-50 p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-semibold text-violet-950">Question Author</p>
                  <p className="mt-1 text-sm text-violet-700">
                    {contentRoles.author.used} of {contentRoles.author.limit} assigned
                  </p>
                </div>
                <BookOpen className="size-6 text-violet-600" />
              </div>
            </div>
            <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-semibold text-emerald-950">Question Auditor</p>
                  <p className="mt-1 text-sm text-emerald-700">
                    {contentRoles.auditor.used} of {contentRoles.auditor.limit} assigned
                  </p>
                </div>
                <ShieldCheck className="size-6 text-emerald-600" />
              </div>
            </div>
          </div>

          <div className="overflow-hidden rounded-2xl border border-blue-200/70 bg-white shadow-sm">
            <div className="border-b border-blue-100 px-5 py-4">
              <h3 className="font-semibold text-navy-900">Team members</h3>
            </div>
            {team.members.length ? (
              <div className="divide-y divide-blue-50">
                {team.members.map((member) => {
                  const verified = member.verification_status === 'verified'
                  return (
                    <div key={member.user_id} className="flex flex-wrap items-center gap-4 px-5 py-4">
                      <span className="grid size-10 place-items-center rounded-full bg-blue-50 text-blue-700">
                        {verified ? <UserCheck className="size-5" /> : <Mail className="size-5" />}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="font-semibold text-navy-900">{member.full_name}</p>
                        <span className="mt-1 inline-flex rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-bold text-slate-700">
                          {member.role_name || member.role}
                        </span>
                        <p className="truncate text-sm text-slate-600">{member.email}</p>
                        <p className="mt-1 text-xs text-slate-500">
                          Added {new Date(member.created_at).toLocaleDateString()}
                          {verified && member.last_login_at
                            ? ` · Last login ${new Date(member.last_login_at).toLocaleString()}`
                            : ''}
                        </p>
                      </div>
                      <span
                        className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                          verified
                            ? 'bg-emerald-50 text-emerald-700'
                            : 'bg-amber-50 text-amber-700'
                        }`}
                      >
                        {verified ? 'Verified' : 'Pending'}
                      </span>
                      {!verified ? (
                        <>
                          <button
                            type="button"
                            onClick={() => setEditMember({ ...member })}
                            className="rounded-xl border border-slate-200 p-2 text-slate-700 hover:bg-slate-50"
                            aria-label={`Edit ${member.full_name}`}
                          >
                            <Pencil className="size-4" />
                          </button>
                          <button
                            type="button"
                            disabled={resendMutation.isPending}
                            onClick={() => resendMutation.mutate(member.user_id)}
                            className="rounded-xl border border-blue-200 px-3 py-2 text-xs font-semibold text-navy-800 hover:bg-blue-50"
                          >
                            Resend
                          </button>
                        </>
                      ) : null}
                      <button
                        type="button"
                        onClick={() => setRemoveMember(member)}
                        className="rounded-xl border border-red-200 p-2 text-red-700 hover:bg-red-50"
                        aria-label={`Remove ${member.full_name}`}
                      >
                        <Trash2 className="size-4" />
                      </button>
                    </div>
                  )
                })}
              </div>
            ) : (
              <p className="px-5 py-10 text-center text-sm text-slate-600">
                No team members yet.
              </p>
            )}
          </div>
        </>
      ) : null}

      <Modal open={addOpen} title="Add team member" onClose={() => setAddOpen(false)}>
        <form
          className="space-y-4"
          onSubmit={(event) => {
            event.preventDefault()
            addMutation.mutate(form)
          }}
        >
          <div>
            <label className="text-sm font-semibold text-slate-700">Role</label>
            <select
              value={form.role}
              onChange={(event) => setForm((old) => ({ ...old, role: event.target.value }))}
              className="mt-1 h-11 w-full rounded-xl border border-blue-200 bg-white px-3 text-sm outline-none focus:border-blue-400"
            >
              <option value="host" disabled={!team?.plan || seats.remaining <= 0}>
                Host team member{!team?.plan || seats.remaining <= 0 ? ' — unavailable' : ''}
              </option>
              <option value="author" disabled={contentRoles.author.remaining <= 0}>
                Question Author{contentRoles.author.remaining <= 0 ? ' — assigned' : ''}
              </option>
              <option value="auditor" disabled={contentRoles.auditor.remaining <= 0}>
                Question Auditor{contentRoles.auditor.remaining <= 0 ? ' — assigned' : ''}
              </option>
            </select>
            <p className="mt-1 text-xs text-slate-500">
              Author and Auditor roles do not use Host team seats.
            </p>
          </div>
          <div>
            <label className="text-sm font-semibold text-slate-700">Full name</label>
            <input
              value={form.full_name}
              onChange={(event) => setForm((old) => ({ ...old, full_name: event.target.value }))}
              className="mt-1 h-11 w-full rounded-xl border border-blue-200 px-3 text-sm outline-none focus:border-blue-400"
              required
            />
          </div>
          <div>
            <label className="text-sm font-semibold text-slate-700">Email</label>
            <input
              type="email"
              value={form.email}
              onChange={(event) => setForm((old) => ({ ...old, email: event.target.value }))}
              className="mt-1 h-11 w-full rounded-xl border border-blue-200 px-3 text-sm outline-none focus:border-blue-400"
              required
            />
          </div>
          <div className="flex justify-end gap-2">
            <button type="button" onClick={() => setAddOpen(false)} className="h-11 rounded-xl border border-blue-200 px-4 text-sm font-semibold">
              Cancel
            </button>
            <button type="submit" disabled={addMutation.isPending} className="h-11 rounded-xl bg-navy-900 px-4 text-sm font-semibold text-white disabled:opacity-60">
              {addMutation.isPending ? 'Adding…' : 'Add and send verification'}
            </button>
          </div>
        </form>
      </Modal>

      <Modal
        open={Boolean(editMember)}
        title="Edit pending team member"
        subtitle="Saving sends a new verification email and temporary password."
        onClose={() => setEditMember(null)}
      >
        {editMember ? (
          <form
            className="space-y-4"
            onSubmit={(event) => {
              event.preventDefault()
              editMutation.mutate({
                full_name: editMember.full_name,
                email: editMember.email,
                role: editMember.role,
              })
            }}
          >
            <div>
              <label className="text-sm font-semibold text-slate-700">Role</label>
              <select
                value={editMember.role}
                onChange={(event) =>
                  setEditMember((current) => ({ ...current, role: event.target.value }))
                }
                className="mt-1 h-11 w-full rounded-xl border border-blue-200 bg-white px-3 text-sm"
              >
                <option
                  value="host"
                  disabled={
                    editMember.role !== 'host' &&
                    (!team?.plan || seats.remaining <= 0)
                  }
                >
                  Host team member
                </option>
                <option
                  value="author"
                  disabled={
                    editMember.role !== 'author' &&
                    contentRoles.author.remaining <= 0
                  }
                >
                  Question Author
                </option>
                <option
                  value="auditor"
                  disabled={
                    editMember.role !== 'auditor' &&
                    contentRoles.auditor.remaining <= 0
                  }
                >
                  Question Auditor
                </option>
              </select>
            </div>
            <div>
              <label className="text-sm font-semibold text-slate-700">Full name</label>
              <input
                value={editMember.full_name}
                onChange={(event) =>
                  setEditMember((current) => ({ ...current, full_name: event.target.value }))
                }
                className="mt-1 h-11 w-full rounded-xl border border-blue-200 px-3 text-sm"
                required
              />
            </div>
            <div>
              <label className="text-sm font-semibold text-slate-700">Email</label>
              <input
                type="email"
                value={editMember.email}
                onChange={(event) =>
                  setEditMember((current) => ({ ...current, email: event.target.value }))
                }
                className="mt-1 h-11 w-full rounded-xl border border-blue-200 px-3 text-sm"
                required
              />
            </div>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setEditMember(null)}
                className="h-11 rounded-xl border border-blue-200 px-4 text-sm font-semibold"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={editMutation.isPending}
                className="h-11 rounded-xl bg-navy-900 px-4 text-sm font-semibold text-white disabled:opacity-60"
              >
                {editMutation.isPending ? 'Saving…' : 'Save and resend verification'}
              </button>
            </div>
          </form>
        ) : null}
      </Modal>

      <Modal open={Boolean(removeMember)} title="Remove team member?" onClose={() => setRemoveMember(null)}>
        <p className="text-sm text-slate-600">
          {removeMember?.full_name} will lose access immediately and their{' '}
          {removeMember?.role === 'host' ? 'Host seat' : `${removeMember?.role_name || 'content role'} slot`}{' '}
          will become available.
        </p>
        <div className="mt-5 flex justify-end gap-2">
          <button type="button" onClick={() => setRemoveMember(null)} className="h-11 rounded-xl border border-blue-200 px-4 text-sm font-semibold">
            Cancel
          </button>
          <button type="button" disabled={removeMutation.isPending} onClick={() => removeMutation.mutate(removeMember.user_id)} className="h-11 rounded-xl bg-red-600 px-4 text-sm font-semibold text-white disabled:opacity-60">
            {removeMutation.isPending ? 'Removing…' : 'Remove'}
          </button>
        </div>
      </Modal>

      <HostAlertModal
        open={Boolean(alert)}
        variant={alert?.variant || 'success'}
        title={alert?.title || ''}
        message={alert?.message || ''}
        confirmLabel="OK"
        onClose={() => setAlert(null)}
      />
    </section>
  )
}
