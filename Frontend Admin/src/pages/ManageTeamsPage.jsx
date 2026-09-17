import { Search, UserCheck, Users } from 'lucide-react'
import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useAuthStore } from '../store/authStore'
import { listTeamsForAdminApi } from '../services/managementApi'

export default function ManageTeamsPage() {
  const accessToken = useAuthStore((state) => state.accessToken)
  const [leadId, setLeadId] = useState('all')
  const [search, setSearch] = useState('')
  const teamsQuery = useQuery({
    queryKey: ['admin-teams'],
    queryFn: () => listTeamsForAdminApi(accessToken),
    enabled: Boolean(accessToken),
  })

  const teams = useMemo(() => {
    const term = search.trim().toLowerCase()
    return (teamsQuery.data || []).filter((team) => {
      if (leadId !== 'all' && String(team.team_lead.user_id) !== leadId) return false
      if (!term) return true
      return (
        team.team_lead.full_name.toLowerCase().includes(term) ||
        team.team_lead.email.toLowerCase().includes(term) ||
        team.members.some(
          (member) =>
            member.full_name.toLowerCase().includes(term) ||
            member.email.toLowerCase().includes(term),
        )
      )
    })
  }, [teamsQuery.data, leadId, search])

  return (
    <section className="space-y-6">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.25em] text-navy-700">Administration</p>
        <h2 className="mt-1 text-2xl font-bold text-navy-900">Team Management</h2>
        <p className="mt-1 text-sm text-slate-600">
          Review teams by lead, membership, verification status, and seat usage.
        </p>
      </div>

      <div className="grid gap-3 rounded-2xl border border-blue-200/70 bg-white p-4 sm:grid-cols-2">
        <div>
          <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">Team lead</label>
          <select
            value={leadId}
            onChange={(event) => setLeadId(event.target.value)}
            className="mt-1 h-11 w-full rounded-xl border border-blue-200 bg-white px-3 text-sm outline-none focus:border-blue-400"
          >
            <option value="all">All teams</option>
            {(teamsQuery.data || []).map((team) => (
              <option key={team.team_lead.user_id} value={team.team_lead.user_id}>
                {team.team_lead.full_name} ({team.team_lead.email}) · {team.members.length} members
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">Search</label>
          <div className="relative mt-1">
            <Search className="absolute left-3 top-3.5 size-4 text-slate-400" />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Lead or member email"
              className="h-11 w-full rounded-xl border border-blue-200 pl-9 pr-3 text-sm outline-none focus:border-blue-400"
            />
          </div>
        </div>
      </div>

      {teamsQuery.isLoading ? (
        <div className="rounded-2xl border border-blue-200 bg-white p-8 text-center text-slate-600">
          Loading teams…
        </div>
      ) : null}
      {teamsQuery.error ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-5 text-red-700">
          {teamsQuery.error.message}
        </div>
      ) : null}

      <div className="space-y-4">
        {teams.map((team) => (
          <article key={team.team_lead.user_id} className="overflow-hidden rounded-2xl border border-blue-200/70 bg-white shadow-sm">
            <div className="flex flex-wrap items-center gap-4 bg-blue-50/70 px-5 py-4">
              <span className="grid size-11 place-items-center rounded-full bg-white text-violet-700 shadow-sm">
                <Users className="size-5" />
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="font-bold text-navy-900">{team.team_lead.full_name}</h3>
                  <span className="rounded-full bg-violet-100 px-2.5 py-1 text-[11px] font-semibold text-violet-700">
                    Team Lead
                  </span>
                </div>
                <p className="text-sm text-slate-600">{team.team_lead.email}</p>
                <p className="mt-1 text-xs text-slate-500">
                  {team.plan?.name || 'No active plan'}
                  {team.team_lead.plan_expires_at ? ` · Expires ${team.team_lead.plan_expires_at}` : ''}
                </p>
              </div>
              <div className="text-right">
                <p className="font-semibold text-navy-900">{team.seats.used} / {team.seats.total} seats</p>
                <p className="text-xs text-slate-500">
                  {team.seats.included} included + {team.seats.extra} addon
                </p>
                <a href={`/manage/users`} className="mt-1 inline-block text-xs font-semibold text-blue-700 hover:underline">
                  Manage seat addons
                </a>
              </div>
            </div>
            <div className="divide-y divide-blue-50">
              {team.members.map((member) => {
                const verified = member.verification_status === 'verified'
                return (
                  <div key={member.user_id} className="flex flex-wrap items-center gap-3 px-5 py-3 pl-10">
                    <UserCheck className={`size-5 ${verified ? 'text-emerald-600' : 'text-amber-600'}`} />
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-semibold text-navy-900">{member.full_name}</p>
                        <span className="rounded-full bg-blue-50 px-2 py-0.5 text-[11px] font-semibold text-blue-700">
                          {member.role_name || member.role || 'Member'}
                        </span>
                      </div>
                      <p className="text-sm text-slate-600">{member.email}</p>
                    </div>
                    <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${verified ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'}`}>
                      {verified ? 'Verified' : 'Pending'}
                    </span>
                  </div>
                )
              })}
            </div>
          </article>
        ))}
        {!teamsQuery.isLoading && !teams.length ? (
          <div className="rounded-2xl border border-blue-200 bg-white p-8 text-center text-slate-600">
            No teams match the selected filters.
          </div>
        ) : null}
      </div>
    </section>
  )
}
