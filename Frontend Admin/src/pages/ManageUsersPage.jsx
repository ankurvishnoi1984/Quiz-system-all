import { Eye, EyeOff, LoaderCircle, Paperclip, Plus, X } from 'lucide-react'
import { useMemo, useRef, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import Modal from '../components/ui/Modal'
import { HostAlertModal } from '../components/live/HostAlertModal'
// import { PasswordRevealCell } from '../components/management/PasswordRevealCell'
import { useShell } from '../context/ShellContext'
import { useAuthStore } from '../store/authStore'
import { listClientsApi, listDepartmentsApi } from '../services/dashboardApi'
import { fetchAuthFeaturesApi } from '../services/authApi'
import {
  adjustUserExtraParticipantsApi,
  adjustUserExtraQuestionsApi,
  adjustUserTeamSeatsApi,
  assignUserPlanApi,
  createUserApi,
  setUserStatusApi,
  listPlansApi,
  listRolesApi,
  listUserExtraParticipantsApi,
  listUserExtraQuestionsApi,
  listUserTeamSeatAddonsApi,
  listUsersApi,
  sendAdminActionOtpApi,
  verifyAdminActionOtpApi,
  uploadExtraSeatAttachmentApi,
  uploadExtraQuestionAttachmentApi,
} from '../services/managementApi'
import { filterUsersByShell } from '../utils/shellFilterPaths'
import { resolveQuestionMediaUrl } from '../utils/questionMedia'
import { needsClientForScope, needsDepartmentForScope } from '../utils/adminRoles'
// import { getStoredUserPasswords, setStoredUserPassword } from '../utils/userPasswordVault'

const ROLE_LABELS = {
  super_admin: 'Super admin',
  client_admin: 'Client admin',
  dept_admin: 'Department admin',
  host: 'Host',
  author: 'Question Author',
  auditor: 'Question Auditor',
}

function StatusToggle({ checked, disabled, pending, onChange, activeLabel = 'Active', inactiveLabel = 'Inactive' }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={checked ? activeLabel : inactiveLabel}
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
      <span
        className={`text-xs font-semibold ${checked ? 'text-emerald-700' : 'text-slate-500'}`}
      >
        {checked ? activeLabel : inactiveLabel}
      </span>
    </button>
  )
}

const EXTRA_ATTACHMENT_ACCEPT = 'image/jpeg,image/png,image/webp,image/gif,application/pdf'
const EXTRA_ATTACHMENT_MAX_BYTES = 10 * 1024 * 1024

function extraAttachmentError(file) {
  if (!file) return ''
  if (file.size > EXTRA_ATTACHMENT_MAX_BYTES) return 'Attachment must be 10 MB or smaller.'
  const allowed = EXTRA_ATTACHMENT_ACCEPT.split(',')
  if (file.type && !allowed.includes(file.type)) {
    return 'Use a JPEG, PNG, WebP, GIF, or PDF file.'
  }
  return ''
}

const emptyForm = {
  full_name: '',
  email: '',
  password: '',
  role: 'host',
  client_id: '',
  dept_id: '',
  plan_id: '',
  plan_expires_at: '',
}

function ManageUsersPage() {
  const accessToken = useAuthStore((state) => state.accessToken)
  const currentUser = useAuthStore((state) => state.user)
  const { clientId, departmentId } = useShell()
  const queryClient = useQueryClient()
  const [createOpen, setCreateOpen] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [alert, setAlert] = useState(null)
  const [form, setForm] = useState(emptyForm)
  const [extraUser, setExtraUser] = useState(null)
  const [extraSeats, setExtraSeats] = useState('20')
  const [extraNote, setExtraNote] = useState('')
  const [extraFile, setExtraFile] = useState(null)
  const [extraFileError, setExtraFileError] = useState('')
  const [extraQuestionsUser, setExtraQuestionsUser] = useState(null)
  const [extraQuestions, setExtraQuestions] = useState('10')
  const [extraQuestionsNote, setExtraQuestionsNote] = useState('')
  const [extraQuestionsFile, setExtraQuestionsFile] = useState(null)
  const [extraQuestionsFileError, setExtraQuestionsFileError] = useState('')
  const [teamSeatsUser, setTeamSeatsUser] = useState(null)
  const [teamSeats, setTeamSeats] = useState('1')
  const [teamSeatPrice, setTeamSeatPrice] = useState('')
  const [planEditUser, setPlanEditUser] = useState(null)
  const [planEditForm, setPlanEditForm] = useState({ plan_id: '', plan_expires_at: '' })
  const [adminOtpOpen, setAdminOtpOpen] = useState(false)
  const [adminOtpCode, setAdminOtpCode] = useState('')
  const [adminOtpError, setAdminOtpError] = useState('')
  const [adminOtpSending, setAdminOtpSending] = useState(false)
  const [adminOtpVerifying, setAdminOtpVerifying] = useState(false)
  const pendingAdminActionRef = useRef(null)
  // const [passwordVault, setPasswordVault] = useState(() => getStoredUserPasswords())

  const usersQuery = useQuery({
    queryKey: ['manage-users'],
    queryFn: () => listUsersApi(accessToken),
    enabled: Boolean(accessToken),
  })

  const rolesQuery = useQuery({
    queryKey: ['manage-roles'],
    queryFn: () => listRolesApi(accessToken),
    enabled: Boolean(accessToken),
  })

  const authFeaturesQuery = useQuery({
    queryKey: ['auth-features'],
    queryFn: fetchAuthFeaturesApi,
    staleTime: 60_000,
  })
  const adminActionOtpEnabled = authFeaturesQuery.data?.admin_action_otp_enabled !== false

  const clientsQuery = useQuery({
    queryKey: ['manage-clients'],
    queryFn: () => listClientsApi(accessToken),
    enabled: Boolean(accessToken),
  })

  const departmentsQuery = useQuery({
    queryKey: ['manage-user-departments', form.client_id],
    queryFn: () => listDepartmentsApi(accessToken, form.client_id),
    enabled: Boolean(accessToken && form.client_id),
  })

  const plansQuery = useQuery({
    queryKey: ['manage-plans'],
    queryFn: () => listPlansApi(accessToken),
    enabled: Boolean(accessToken),
  })

  const activePlans = (plansQuery.data || []).filter((plan) => plan.is_active && !plan.is_free)

  const clientsById = useMemo(() => {
    const map = new Map()
    for (const client of clientsQuery.data || []) {
      map.set(String(client.client_id), client.name)
    }
    return map
  }, [clientsQuery.data])

  const allDepartmentsQuery = useQuery({
    queryKey: ['manage-all-departments'],
    queryFn: () => listDepartmentsApi(accessToken),
    enabled: Boolean(accessToken),
  })

  const tableDepartmentsById = useMemo(() => {
    const map = new Map()
    for (const dept of allDepartmentsQuery.data || []) {
      map.set(String(dept.dept_id), dept.name)
    }
    return map
  }, [allDepartmentsQuery.data])

  const filteredUsers = useMemo(
    () => filterUsersByShell(usersQuery.data, { clientId, departmentId }),
    [usersQuery.data, clientId, departmentId],
  )

  const assignableRoles = useMemo(
    () =>
      (rolesQuery.data || []).filter(
        (role) =>
          role.is_active &&
          !['super_admin', 'sub_admin', 'author', 'auditor'].includes(role.slug),
      ),
    [rolesQuery.data],
  )
  const selectedRole = assignableRoles.find((role) => role.slug === form.role) || null
  const needsClient = needsClientForScope(selectedRole?.data_scope)
  const needsDepartment = needsDepartmentForScope(selectedRole?.data_scope)

  const createMutation = useMutation({
    mutationFn: (payload) => createUserApi(accessToken, payload),
    onSuccess: (result) => {
      // Password vault storage disabled — credentials are emailed to the user instead.
      // const userId = result?.user?.user_id
      // if (userId && variables.password) {
      //   setStoredUserPassword(userId, variables.password)
      //   setPasswordVault(getStoredUserPasswords())
      // }
      queryClient.invalidateQueries({ queryKey: ['manage-users'] })
      setCreateOpen(false)
      setShowPassword(false)
      setForm(emptyForm)
      const emailSent = result?.email_sent
      setAlert({
        variant: emailSent ? 'success' : 'error',
        title: emailSent ? 'User created' : 'User created — email not sent',
        message: emailSent
          ? `"${result?.user?.full_name || 'User'}" was created. A welcome email with sign-in details was sent`
          : `"${result?.user?.full_name || 'User'}" was created, but the welcome email could not be sent.${result?.email_error ? ` ${result.email_error}` : ''}`,
        confirmLabel: 'OK',
      })
    },
    onError: (error) => {
      setAlert({
        variant: 'error',
        title: 'Could not create user',
        message: error.message || 'Please try again.',
        confirmLabel: 'Close',
      })
    },
  })

  const handleSubmit = (event) => {
    event.preventDefault()
    if (!form.full_name.trim() || !form.email.trim() || !form.password.trim() || !form.role) return
    if (needsClient && !form.client_id) return
    if (needsDepartment && !form.dept_id) return

    const payload = {
      full_name: form.full_name.trim(),
      email: form.email.trim(),
      password: form.password,
      role: form.role,
    }

    if (needsClient) payload.client_id = Number(form.client_id)
    if (needsDepartment) payload.dept_id = Number(form.dept_id)
    if (form.plan_id) {
      payload.plan_id = Number(form.plan_id)
      payload.plan_expires_at = form.plan_expires_at || null
    }

    requestAdminActionOtp({
      type: 'create-user',
      payload,
    })
  }

  const extraHistoryQuery = useQuery({
    queryKey: ['user-extra-participants', extraUser?.user_id],
    queryFn: () => listUserExtraParticipantsApi(accessToken, extraUser.user_id),
    enabled: Boolean(accessToken && extraUser?.user_id),
  })

  const extraQuestionsHistoryQuery = useQuery({
    queryKey: ['user-extra-questions', extraQuestionsUser?.user_id],
    queryFn: () => listUserExtraQuestionsApi(accessToken, extraQuestionsUser.user_id),
    enabled: Boolean(accessToken && extraQuestionsUser?.user_id),
  })

  const teamSeatHistoryQuery = useQuery({
    queryKey: ['user-team-seats', teamSeatsUser?.user_id],
    queryFn: () => listUserTeamSeatAddonsApi(accessToken, teamSeatsUser.user_id),
    enabled: Boolean(accessToken && teamSeatsUser?.user_id),
  })

  const extraMutation = useMutation({
    mutationFn: async ({ userId, payload, file, otpToken }) => {
      const nextPayload = { ...payload }
      if (otpToken) nextPayload.otp_token = otpToken
      if (file) {
        const uploaded = await uploadExtraSeatAttachmentApi(userId, file, otpToken)
        nextPayload.attachment_url = uploaded?.file_path || null
        nextPayload.attachment_filename = uploaded?.original_filename || file.name
      }
      return adjustUserExtraParticipantsApi(accessToken, userId, nextPayload)
    },
    onSuccess: (user) => {
      queryClient.invalidateQueries({ queryKey: ['manage-users'] })
      queryClient.invalidateQueries({ queryKey: ['user-extra-participants', user?.user_id] })
      queryClient.invalidateQueries({ queryKey: ['plan-usage'] })
      setExtraUser((prev) => (prev && user ? { ...prev, ...user } : prev))
      setExtraSeats('20')
      setExtraNote('')
      setExtraFile(null)
      setExtraFileError('')
      setAlert({
        variant: 'success',
        title: 'Extra seats updated',
        message: `"${user?.full_name || 'User'}" now has ${Number(user?.extra_participants || 0).toLocaleString()} extra participant seats.`,
        confirmLabel: 'OK',
      })
    },
    onError: (error) => {
      setAlert({
        variant: 'error',
        title: 'Could not update extra seats',
        message: error.message || 'Please try again.',
        confirmLabel: 'Close',
      })
    },
  })

  const extraQuestionsMutation = useMutation({
    mutationFn: async ({ userId, payload, file, otpToken }) => {
      const nextPayload = { ...payload }
      if (otpToken) nextPayload.otp_token = otpToken
      if (file) {
        const uploaded = await uploadExtraQuestionAttachmentApi(userId, file, otpToken)
        nextPayload.attachment_url = uploaded?.file_path || null
        nextPayload.attachment_filename = uploaded?.original_filename || file.name
      }
      return adjustUserExtraQuestionsApi(accessToken, userId, nextPayload)
    },
    onSuccess: (user) => {
      queryClient.invalidateQueries({ queryKey: ['manage-users'] })
      queryClient.invalidateQueries({ queryKey: ['user-extra-questions', user?.user_id] })
      queryClient.invalidateQueries({ queryKey: ['plan-usage'] })
      setExtraQuestionsUser((prev) => (prev && user ? { ...prev, ...user } : prev))
      setExtraQuestions('10')
      setExtraQuestionsNote('')
      setExtraQuestionsFile(null)
      setExtraQuestionsFileError('')
      setAlert({
        variant: 'success',
        title: 'Extra questions updated',
        message: `"${user?.full_name || 'User'}" now has ${Number(user?.extra_questions || 0).toLocaleString()} extra questions per session.`,
        confirmLabel: 'OK',
      })
    },
    onError: (error) => {
      setAlert({
        variant: 'error',
        title: 'Could not update extra questions',
        message: error.message || 'Please try again.',
        confirmLabel: 'Close',
      })
    },
  })

  const teamSeatsMutation = useMutation({
    mutationFn: ({ userId, payload, otpToken }) =>
      adjustUserTeamSeatsApi(accessToken, userId, {
        ...payload,
        ...(otpToken ? { otp_token: otpToken } : {}),
      }),
    onSuccess: (user) => {
      queryClient.invalidateQueries({ queryKey: ['manage-users'] })
      queryClient.invalidateQueries({ queryKey: ['user-team-seats', user?.user_id] })
      setTeamSeatsUser((prev) => (prev && user ? { ...prev, ...user } : prev))
      setTeamSeats('1')
      setTeamSeatPrice('')
      setAlert({
        variant: 'success',
        title: 'Team seats updated',
        message: `"${user?.full_name || 'User'}" now has ${Number(user?.extra_team_members || 0).toLocaleString()} extra team seats.`,
        confirmLabel: 'OK',
      })
    },
    onError: (error) => {
      setAlert({
        variant: 'error',
        title: 'Could not update team seats',
        message: error.message || 'Please try again.',
        confirmLabel: 'Close',
      })
    },
  })

  const statusMutation = useMutation({
    mutationFn: ({ userId, isActive, otpToken }) =>
      setUserStatusApi(accessToken, userId, isActive, otpToken),
    onSuccess: (user) => {
      queryClient.invalidateQueries({ queryKey: ['manage-users'] })
      setAlert({
        variant: 'success',
        title: user?.is_active ? 'User activated' : 'User deactivated',
        message: user?.is_active
          ? `"${user?.full_name || 'User'}" can sign in again.`
          : `"${user?.full_name || 'User'}" can no longer sign in.`,
        confirmLabel: 'OK',
      })
    },
    onError: (error) => {
      setAlert({
        variant: 'error',
        title: 'Could not update user status',
        message: error.message || 'Please try again.',
        confirmLabel: 'Close',
      })
    },
  })

  const assignPlanMutation = useMutation({
    mutationFn: ({ userId, planId, planExpiresAt, otpToken }) =>
      assignUserPlanApi(accessToken, userId, planId, planExpiresAt, otpToken),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['manage-users'] })
      queryClient.invalidateQueries({ queryKey: ['plan-usage'] })
      setPlanEditUser(null)
      setAlert({
        variant: 'success',
        title: 'Plan updated',
        message: 'The user plan was saved. Expiry follows the plan duration.',
        confirmLabel: 'OK',
      })
    },
    onError: (error) => {
      setAlert({
        variant: 'error',
        title: 'Could not assign plan',
        message: error.message || 'Please try again.',
        confirmLabel: 'Close',
      })
    },
  })

  const requestAdminActionOtp = async (pendingAction) => {
    if (!adminActionOtpEnabled) {
      runPendingAdminAction(pendingAction, null)
      return
    }
    pendingAdminActionRef.current = pendingAction
    setAdminOtpCode('')
    setAdminOtpError('')
    setAdminOtpOpen(true)
    setAdminOtpSending(true)
    try {
      await sendAdminActionOtpApi(accessToken)
    } catch (error) {
      setAdminOtpError(error.message || 'Unable to send verification code')
    } finally {
      setAdminOtpSending(false)
    }
  }

  const runPendingAdminAction = (pendingAction, otpToken) => {
    if (!pendingAction) return
    if (pendingAction.type === 'plan') {
      assignPlanMutation.mutate({ ...pendingAction.payload, otpToken })
      return
    }
    if (pendingAction.type === 'create-user') {
      createMutation.mutate({
        ...pendingAction.payload,
        ...(otpToken ? { otp_token: otpToken } : {}),
      })
      return
    }
    if (pendingAction.type === 'user-status') {
      statusMutation.mutate({ ...pendingAction.payload, otpToken })
      return
    }
    if (pendingAction.type === 'seats') {
      extraMutation.mutate({ ...pendingAction.payload, otpToken })
      return
    }
    if (pendingAction.type === 'questions') {
      extraQuestionsMutation.mutate({ ...pendingAction.payload, otpToken })
      return
    }
    if (pendingAction.type === 'team-seats') {
      teamSeatsMutation.mutate({ ...pendingAction.payload, otpToken })
    }
  }

  const confirmAdminActionOtp = async (event) => {
    event.preventDefault()
    const code = adminOtpCode.trim()
    if (!/^\d{6}$/.test(code)) {
      setAdminOtpError('Enter the 6-digit code from email.')
      return
    }
    setAdminOtpVerifying(true)
    setAdminOtpError('')
    try {
      const verified = await verifyAdminActionOtpApi(accessToken, code)
      const otpToken = verified?.otp_token
      if (!otpToken) {
        setAdminOtpError('Verification succeeded but no token was returned.')
        return
      }
      const pending = pendingAdminActionRef.current
      pendingAdminActionRef.current = null
      setAdminOtpOpen(false)
      runPendingAdminAction(pending, otpToken)
    } catch (error) {
      setAdminOtpError(error.message || 'Unable to verify code')
    } finally {
      setAdminOtpVerifying(false)
    }
  }

  const openPlanEditor = (user) => {
    setPlanEditUser(user)
    setPlanEditForm({
      plan_id: user.plan_id ? String(user.plan_id) : '',
      plan_expires_at: user.plan_expires_at || '',
    })
  }

  const selectedPlanForEdit = (plansQuery.data || []).find(
    (plan) => String(plan.plan_id) === String(planEditForm.plan_id),
  )

  return (
    <section className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.25em] text-navy-700">Administration</p>
          <h2 className="mt-1 text-2xl font-bold text-navy-900">User Management</h2>
        </div>
        <button
          type="button"
          onClick={() => {
            const defaultRole = assignableRoles.find((role) => role.slug === 'host') || assignableRoles[0]
            setForm({
              ...emptyForm,
              role: defaultRole?.slug || '',
              client_id: clientId || '',
              dept_id: departmentId || '',
            })
            setShowPassword(false)
            setCreateOpen(true)
          }}
          className="inline-flex items-center gap-2 rounded-2xl bg-linear-to-r from-navy-900 via-navy-700 to-navy-600 px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-blue-900/25 transition hover:brightness-110"
        >
          <Plus className="size-4" />
          New User
        </button>
      </div>

      {usersQuery.isLoading ? (
        <div className="rounded-2xl border border-blue-200/70 bg-white/70 p-8 text-center text-slate-600">
          Loading users...
        </div>
      ) : null}

      {usersQuery.error ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-8 text-center text-red-700">
          {usersQuery.error.message || 'Failed to load users'}
        </div>
      ) : null}

      <div className="overflow-hidden rounded-2xl border border-blue-200/70 bg-white/90 shadow-sm shadow-blue-900/5">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-blue-100 bg-blue-50/50">
            <tr>
              <th className="px-4 py-3 font-semibold text-slate-700">Name</th>
              <th className="px-4 py-3 font-semibold text-slate-700">Email</th>
              {/* Password column hidden — credentials are emailed on create; vault UI may return later. */}
              <th className="px-4 py-3 font-semibold text-slate-700">Role</th>
              <th className="px-4 py-3 font-semibold text-slate-700">Team</th>
              <th className="px-4 py-3 font-semibold text-slate-700">Client</th>
              <th className="px-4 py-3 font-semibold text-slate-700">Department</th>
              <th className="px-4 py-3 font-semibold text-slate-700">Plan</th>
              <th className="px-4 py-3 font-semibold text-slate-700">Expires</th>
              <th className="px-4 py-3 font-semibold text-slate-700">Participants</th>
              <th className="px-4 py-3 font-semibold text-slate-700">Questions / session</th>
              <th className="px-4 py-3 font-semibold text-slate-700">Extra seats</th>
              <th className="px-4 py-3 font-semibold text-slate-700">Team seats</th>
              <th className="px-4 py-3 font-semibold text-slate-700">Extra questions</th>
              <th className="px-4 py-3 font-semibold text-slate-700">Status</th>
            </tr>
          </thead>
          <tbody>
            {filteredUsers.map((user) => (
              <tr key={user.user_id} className="border-b border-blue-50 last:border-b-0">
                <td className="px-4 py-3 font-semibold text-navy-900">{user.full_name}</td>
                <td className="px-4 py-3 text-slate-700">{user.email}</td>
                {/* <td className="px-4 py-3">
                  <PasswordRevealCell password={passwordVault[String(user.user_id)]} />
                </td> */}
                <td className="px-4 py-3 text-slate-700">{user.role_name || ROLE_LABELS[user.role] || user.role}</td>
                <td className="px-4 py-3 text-slate-700">
                  {user.parent_id ? (
                    <div>
                      <span className="rounded-full bg-blue-50 px-2 py-1 text-[11px] font-semibold text-blue-700">
                        Member
                      </span>
                      <p className="mt-1 text-xs text-slate-500">
                        {user.team_owner?.full_name || user.team_owner?.email || `Lead #${user.parent_id}`}
                      </p>
                    </div>
                  ) : user.role === 'host' &&
                    (Number(user.extra_team_members || 0) > 0 ||
                      Number(user.plan?.included_team_members || 0) > 0) ? (
                    <span className="rounded-full bg-violet-50 px-2 py-1 text-[11px] font-semibold text-violet-700">
                      Team lead
                    </span>
                  ) : (
                    <span className="text-xs text-slate-500">Independent</span>
                  )}
                </td>
                <td className="px-4 py-3 text-slate-700">
                  {user.client_id
                    ? clientsById.get(String(user.client_id)) || `Client ${user.client_id}`
                    : '—'}
                </td>
                <td className="px-4 py-3 text-slate-700">
                  {user.dept_id
                    ? tableDepartmentsById.get(String(user.dept_id)) || `Dept ${user.dept_id}`
                    : '—'}
                </td>
                <td className="px-4 py-3">
                  <button
                    type="button"
                    onClick={() => openPlanEditor(user)}
                    className="rounded-lg border border-blue-200/70 bg-white px-2.5 py-1.5 text-left text-xs font-semibold text-navy-800 transition hover:bg-blue-50"
                  >
                    {user.plan?.name || 'No plan'}
                    {user.plan_expired ? (
                      <span className="mt-0.5 block text-[10px] font-semibold text-amber-700">
                        Expired
                      </span>
                    ) : null}
                  </button>
                </td>
                <td className="px-4 py-3 text-slate-700">
                  {user.plan?.is_free
                    ? 'Never'
                    : user.plan_expires_at
                      ? user.plan_expires_at
                      : user.plan_id
                        ? 'No end date'
                        : '—'}
                </td>
                <td className="px-4 py-3 text-slate-700">
                  {user.plan?.max_participants != null
                    ? `${Number(user.participants_used || 0).toLocaleString()} / ${(
                        Number(user.plan.max_participants) + Number(user.extra_participants || 0)
                      ).toLocaleString()}`
                    : `${Number(user.participants_used || 0).toLocaleString()} / Unlimited`}
                </td>
                <td className="px-4 py-3 text-slate-700">
                  {user.plan?.max_questions_per_session != null
                    ? (
                        Number(user.plan.max_questions_per_session) +
                        Number(user.extra_questions || 0)
                      ).toLocaleString()
                    : 'Unlimited'}
                </td>
                <td className="px-4 py-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-slate-700">
                      {Number(user.extra_participants || 0).toLocaleString()}
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        setExtraUser(user)
                        setExtraSeats('20')
                        setExtraNote('')
                        setExtraFile(null)
                        setExtraFileError('')
                      }}
                      className="rounded-lg border border-blue-200/70 bg-white px-2 py-1 text-[11px] font-semibold text-navy-800 transition hover:bg-blue-50"
                    >
                      Add extra
                    </button>
                  </div>
                </td>
                <td className="px-4 py-3">
                  {user.parent_id ? (
                    <span className="text-xs text-slate-500">Managed by lead</span>
                  ) : (
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-slate-700">
                        {Number(user.extra_team_members || 0).toLocaleString()}
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          setTeamSeatsUser(user)
                          setTeamSeats('1')
                          setTeamSeatPrice('')
                        }}
                        className="rounded-lg border border-blue-200/70 bg-white px-2 py-1 text-[11px] font-semibold text-navy-800 transition hover:bg-blue-50"
                      >
                        Add seats
                      </button>
                    </div>
                  )}
                </td>
                <td className="px-4 py-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-slate-700">
                      {Number(user.extra_questions || 0).toLocaleString()}
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        setExtraQuestionsUser(user)
                        setExtraQuestions('10')
                        setExtraQuestionsNote('')
                        setExtraQuestionsFile(null)
                        setExtraQuestionsFileError('')
                      }}
                      className="rounded-lg border border-blue-200/70 bg-white px-2 py-1 text-[11px] font-semibold text-navy-800 transition hover:bg-blue-50"
                    >
                      Add extra
                    </button>
                  </div>
                </td>
                <td className="px-4 py-3">
                  <StatusToggle
                    checked={Boolean(user.is_active)}
                    disabled={
                      user.role === 'super_admin' ||
                      Number(currentUser?.user_id) === Number(user.user_id)
                    }
                    pending={statusMutation.isPending}
                    onChange={(isActive) =>
                      requestAdminActionOtp({
                        type: 'user-status',
                        payload: {
                          userId: user.user_id,
                          isActive,
                        },
                      })
                    }
                  />
                </td>
              </tr>
            ))}
            {!usersQuery.isLoading && !filteredUsers.length ? (
              <tr>
                <td colSpan={12} className="px-4 py-10 text-center text-slate-600">
                  {(usersQuery.data || []).length
                    ? 'No users match the selected client or department.'
                    : 'No users found.'}
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>

      <Modal
        open={createOpen}
        title="New User"
        onClose={() => {
          if (createMutation.isPending) return
          setCreateOpen(false)
          setShowPassword(false)
        }}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-sm font-semibold text-slate-700">Full name</label>
            <input
              value={form.full_name}
              onChange={(e) => setForm((prev) => ({ ...prev, full_name: e.target.value }))}
              className="mt-1 h-11 w-full rounded-xl border border-blue-200/70 bg-white px-3 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-500/15"
              placeholder="Jane Doe"
              required
            />
          </div>
          <div>
            <label className="text-sm font-semibold text-slate-700">Email</label>
            <input
              type="email"
              value={form.email}
              onChange={(e) => setForm((prev) => ({ ...prev, email: e.target.value }))}
              className="mt-1 h-11 w-full rounded-xl border border-blue-200/70 bg-white px-3 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-500/15"
              placeholder="jane@example.com"
              required
            />
          </div>
          <div>
            <label className="text-sm font-semibold text-slate-700">Password</label>
            <div className="relative mt-1">
              <input
                type={showPassword ? 'text' : 'password'}
                value={form.password}
                onChange={(e) => setForm((prev) => ({ ...prev, password: e.target.value }))}
                className="h-11 w-full rounded-xl border border-blue-200/70 bg-white px-3 pr-11 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-500/15"
                placeholder="Minimum 8 characters"
                minLength={8}
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword((prev) => !prev)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 transition hover:text-slate-600"
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
              </button>
            </div>
          </div>
          <div>
            <label className="text-sm font-semibold text-slate-700">Role</label>
            <select
              value={form.role}
              onChange={(e) => {
                const role = e.target.value
                const questionBankRole = role === 'author' || role === 'auditor'
                setForm((prev) => ({
                  ...prev,
                  role,
                  client_id: '',
                  dept_id: '',
                  plan_id: questionBankRole ? '' : prev.plan_id,
                  plan_expires_at: questionBankRole ? '' : prev.plan_expires_at,
                }))
              }}
              className="mt-1 h-11 w-full rounded-xl border border-blue-200/70 bg-white px-3 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-500/15"
            >
              {assignableRoles.map((role) => (
                <option key={role.slug} value={role.slug}>
                  {role.name}
                </option>
              ))}
            </select>
          </div>
          {needsClient ? (
            <div>
              <label className="text-sm font-semibold text-slate-700">Client</label>
              <select
                value={form.client_id}
                onChange={(e) =>
                  setForm((prev) => ({
                    ...prev,
                    client_id: e.target.value,
                    dept_id: '',
                  }))
                }
                className="mt-1 h-11 w-full rounded-xl border border-blue-200/70 bg-white px-3 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-500/15"
                required
              >
                <option value="">Select client</option>
                {(clientsQuery.data || []).map((client) => (
                  <option key={client.client_id} value={client.client_id}>
                    {client.name}
                  </option>
                ))}
              </select>
            </div>
          ) : null}
          {!['author', 'auditor'].includes(form.role) ? <div>
            <label className="text-sm font-semibold text-slate-700">Paid plan</label>
            <select
              value={form.plan_id}
              onChange={(e) => {
                const planId = e.target.value
                const plan = activePlans.find((p) => String(p.plan_id) === planId)
                let expires = ''
                if (plan?.default_duration_days) {
                  const date = new Date()
                  date.setUTCDate(date.getUTCDate() + Number(plan.default_duration_days))
                  expires = date.toISOString().slice(0, 10)
                }
                setForm((prev) => ({
                  ...prev,
                  plan_id: planId,
                  plan_expires_at: plan?.is_free ? '' : expires,
                }))
              }}
              className="mt-1 h-11 w-full rounded-xl border border-blue-200/70 bg-white px-3 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-500/15"
            >
              <option value="">No plan (unlimited)</option>
              {activePlans.map((plan) => (
                <option key={plan.plan_id} value={plan.plan_id}>
                  {plan.name} — {Number(plan.max_participants).toLocaleString()} participants
                </option>
              ))}
            </select>
            <p className="mt-1 text-xs text-slate-500">
              Limits how many participants can be connected at once across all of this user&apos;s sessions.
            </p>
          </div> : null}
          {form.plan_id && !activePlans.find((p) => String(p.plan_id) === form.plan_id)?.is_free ? (
            <div>
              <label className="text-sm font-semibold text-slate-700">Plan expiry date</label>
              <input
                type="date"
                value={form.plan_expires_at}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, plan_expires_at: e.target.value }))
                }
                className="mt-1 h-11 w-full rounded-xl border border-blue-200/70 bg-white px-3 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-500/15"
              />
              <p className="mt-1 text-xs text-slate-500">
                Leave blank for no end date. After expiry the user has no active plan until you renew.
              </p>
            </div>
          ) : null}
          {needsDepartment ? (
            <div>
              <label className="text-sm font-semibold text-slate-700">Department</label>
              <select
                value={form.dept_id}
                onChange={(e) => setForm((prev) => ({ ...prev, dept_id: e.target.value }))}
                className="mt-1 h-11 w-full rounded-xl border border-blue-200/70 bg-white px-3 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-500/15"
                required
                disabled={!form.client_id}
              >
                <option value="">Select department</option>
                {(departmentsQuery.data || []).map((dept) => (
                  <option key={dept.dept_id} value={dept.dept_id}>
                    {dept.name}
                  </option>
                ))}
              </select>
            </div>
          ) : null}
          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              disabled={createMutation.isPending}
              onClick={() => {
                setCreateOpen(false)
                setShowPassword(false)
              }}
              className="h-11 rounded-xl border border-blue-200/70 bg-white px-4 text-sm font-semibold text-slate-700 transition hover:bg-blue-50 disabled:opacity-60"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={createMutation.isPending}
              className="h-11 rounded-xl bg-linear-to-r from-navy-900 via-navy-700 to-navy-600 px-4 text-sm font-semibold text-white shadow-lg shadow-blue-900/25 transition hover:brightness-110 disabled:opacity-60"
            >
              {createMutation.isPending ? 'Creating…' : 'Create user'}
            </button>
          </div>
        </form>
      </Modal>

      <Modal
        open={Boolean(extraUser)}
        title={extraUser ? `Extra seats — ${extraUser.full_name}` : 'Extra seats'}
        onClose={() => {
          if (extraMutation.isPending) return
          setExtraUser(null)
          setExtraFile(null)
          setExtraFileError('')
          setExtraNote('')
        }}
      >
        <form
          className="space-y-4"
          onSubmit={(event) => {
            event.preventDefault()
            const add = Number(extraSeats)
            if (!extraUser || !Number.isInteger(add) || add === 0) return
            requestAdminActionOtp({
              type: 'seats',
              payload: {
                userId: extraUser.user_id,
                payload: { add, note: extraNote.trim() || null },
                file: extraFile,
              },
            })
          }}
        >
          <p className="text-sm text-slate-600">
            Current extra seats:{' '}
            <strong className="text-navy-900">
              {Number(extraUser?.extra_participants || 0).toLocaleString()}
            </strong>
            {extraUser?.plan?.max_participants != null ? (
              <>
                {' '}
                · Plan {Number(extraUser.plan.max_participants).toLocaleString()} + extra ={' '}
                <strong className="text-navy-900">
                  {(
                    Number(extraUser.plan.max_participants) +
                    Number(extraUser.extra_participants || 0)
                  ).toLocaleString()}
                </strong>
              </>
            ) : null}
          </p>
          <div>
            <label className="text-sm font-semibold text-slate-700">Add extra participants</label>
            <input
              type="number"
              min={1}
              step={1}
              value={extraSeats}
              onChange={(e) => setExtraSeats(e.target.value)}
              className="mt-1 h-11 w-full rounded-xl border border-blue-200/70 bg-white px-3 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-500/15"
              placeholder="20"
              required
            />
            <p className="mt-1 text-xs text-slate-500">
              Example: plan 100 + extra 20 = 120 total joins. Record this after the user pays you.
            </p>
          </div>
          <div>
            <label className="text-sm font-semibold text-slate-700">Comment</label>
            <textarea
              value={extraNote}
              onChange={(e) => setExtraNote(e.target.value)}
              rows={3}
              maxLength={2000}
              className="mt-1 w-full rounded-xl border border-blue-200/70 bg-white px-3 py-2 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-500/15"
              placeholder="Reason for extra seats, payment details, invoice number…"
            />
          </div>
          <div>
            <label className="text-sm font-semibold text-slate-700">Attachment</label>
            <p className="mt-0.5 text-xs text-slate-500">JPEG, PNG, WebP, GIF, or PDF · 10 MB max</p>
            {extraFile ? (
              <div className="mt-2 flex items-center justify-between gap-2 rounded-xl border border-blue-200/70 bg-white px-3 py-2">
                <p className="min-w-0 truncate text-sm text-slate-700">
                  <Paperclip className="mr-1 inline size-3.5 text-navy-700" aria-hidden />
                  {extraFile.name}
                </p>
                <button
                  type="button"
                  disabled={extraMutation.isPending}
                  onClick={() => {
                    setExtraFile(null)
                    setExtraFileError('')
                  }}
                  className="rounded-lg p-1 text-slate-500 transition hover:bg-slate-100 hover:text-slate-800"
                  aria-label="Remove attachment"
                >
                  <X className="size-4" />
                </button>
              </div>
            ) : (
              <label className="mt-2 flex h-11 cursor-pointer items-center justify-center rounded-xl border border-dashed border-blue-300 bg-white px-3 text-sm font-semibold text-navy-800 transition hover:bg-blue-50">
                <input
                  type="file"
                  accept={EXTRA_ATTACHMENT_ACCEPT}
                  className="sr-only"
                  disabled={extraMutation.isPending}
                  onChange={(event) => {
                    const file = event.target.files?.[0] || null
                    const error = extraAttachmentError(file)
                    setExtraFileError(error)
                    setExtraFile(error ? null : file)
                    event.target.value = ''
                  }}
                />
                Choose file
              </label>
            )}
            {extraFileError ? <p className="mt-1 text-xs text-red-600">{extraFileError}</p> : null}
          </div>
          {extraHistoryQuery.data?.length ? (
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">History</p>
              <ul className="mt-2 max-h-40 space-y-2 overflow-y-auto text-xs text-slate-600">
                {extraHistoryQuery.data.map((row) => {
                  const attachmentUrl = resolveQuestionMediaUrl(row.attachment_url)
                  return (
                    <li key={row.addon_id} className="rounded-lg border border-slate-100 bg-slate-50 px-2.5 py-2">
                      <p>
                        <span className="font-semibold text-navy-900">
                          {row.seats > 0 ? '+' : ''}
                          {Number(row.seats).toLocaleString()} seats
                        </span>
                        {row.created_at ? (
                          <span className="text-slate-500">
                            {' '}
                            · {new Date(row.created_at).toLocaleString()}
                          </span>
                        ) : null}
                      </p>
                      {row.note ? <p className="mt-1 whitespace-pre-wrap text-slate-700">{row.note}</p> : null}
                      {attachmentUrl ? (
                        <a
                          href={attachmentUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="mt-1 inline-flex items-center gap-1 font-semibold text-navy-800 hover:underline"
                        >
                          <Paperclip className="size-3" aria-hidden />
                          {row.attachment_filename || 'View attachment'}
                        </a>
                      ) : null}
                    </li>
                  )
                })}
              </ul>
            </div>
          ) : null}
          <div className="flex flex-wrap justify-end gap-2 pt-2">
            {Number(extraUser?.extra_participants || 0) > 0 ? (
              <button
                type="button"
                disabled={extraMutation.isPending}
                onClick={() =>
                  requestAdminActionOtp({
                    type: 'seats',
                    payload: {
                      userId: extraUser.user_id,
                      payload: { set: 0, note: 'Cleared extra seats' },
                    },
                  })
                }
                className="h-11 rounded-xl border border-red-200 bg-white px-4 text-sm font-semibold text-red-700 transition hover:bg-red-50 disabled:opacity-60"
              >
                Clear extra
              </button>
            ) : null}
            <button
              type="button"
              disabled={extraMutation.isPending}
              onClick={() => setExtraUser(null)}
              className="h-11 rounded-xl border border-blue-200/70 bg-white px-4 text-sm font-semibold text-slate-700 transition hover:bg-blue-50 disabled:opacity-60"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={extraMutation.isPending || Boolean(extraFileError)}
              className="h-11 rounded-xl bg-linear-to-r from-navy-900 via-navy-700 to-navy-600 px-4 text-sm font-semibold text-white shadow-lg shadow-blue-900/25 transition hover:brightness-110 disabled:opacity-60"
            >
              {extraMutation.isPending ? 'Saving…' : 'Add extra seats'}
            </button>
          </div>
        </form>
      </Modal>

      <Modal
        open={Boolean(teamSeatsUser)}
        title={teamSeatsUser ? `Team seats — ${teamSeatsUser.full_name}` : 'Team seats'}
        onClose={() => {
          if (teamSeatsMutation.isPending) return
          setTeamSeatsUser(null)
        }}
      >
        <form
          className="space-y-4"
          onSubmit={(event) => {
            event.preventDefault()
            const add = Number(teamSeats)
            if (!teamSeatsUser || !Number.isInteger(add) || add <= 0) return
            requestAdminActionOtp({
              type: 'team-seats',
              payload: {
                userId: teamSeatsUser.user_id,
                payload: {
                  add,
                  price_at_purchase: teamSeatPrice === '' ? null : Number(teamSeatPrice),
                },
              },
            })
          }}
        >
          <p className="text-sm text-slate-600">
            Current extra team seats:{' '}
            <strong className="text-navy-900">
              {Number(teamSeatsUser?.extra_team_members || 0).toLocaleString()}
            </strong>
          </p>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="text-sm font-semibold text-slate-700">Add team seats</label>
              <input
                type="number"
                min={1}
                step={1}
                value={teamSeats}
                onChange={(event) => setTeamSeats(event.target.value)}
                className="mt-1 h-11 w-full rounded-xl border border-blue-200/70 bg-white px-3 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-500/15"
                required
              />
            </div>
            <div>
              <label className="text-sm font-semibold text-slate-700">Price recorded per addon</label>
              <input
                type="number"
                min={0}
                step="0.01"
                value={teamSeatPrice}
                onChange={(event) => setTeamSeatPrice(event.target.value)}
                className="mt-1 h-11 w-full rounded-xl border border-blue-200/70 bg-white px-3 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-500/15"
                placeholder="Optional"
              />
            </div>
          </div>
          {teamSeatHistoryQuery.data?.length ? (
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">History</p>
              <ul className="mt-2 max-h-40 space-y-2 overflow-y-auto text-xs text-slate-600">
                {teamSeatHistoryQuery.data.map((row) => (
                  <li key={row.addon_id} className="rounded-lg border border-slate-100 bg-slate-50 px-2.5 py-2">
                    <span className="font-semibold text-navy-900">
                      {row.seats_added > 0 ? '+' : ''}
                      {Number(row.seats_added).toLocaleString()} seats
                    </span>
                    {row.price_at_purchase != null
                      ? ` · ${teamSeatsUser?.plan?.currency || 'INR'} ${Number(row.price_at_purchase).toLocaleString()}`
                      : ''}
                    {row.created_at ? ` · ${new Date(row.created_at).toLocaleString()}` : ''}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
          <div className="flex flex-wrap justify-end gap-2 pt-2">
            {Number(teamSeatsUser?.extra_team_members || 0) > 0 ? (
              <button
                type="button"
                disabled={teamSeatsMutation.isPending}
                onClick={() =>
                  requestAdminActionOtp({
                    type: 'team-seats',
                    payload: {
                      userId: teamSeatsUser.user_id,
                      payload: { set: 0, price_at_purchase: null },
                    },
                  })
                }
                className="h-11 rounded-xl border border-red-200 bg-white px-4 text-sm font-semibold text-red-700 transition hover:bg-red-50 disabled:opacity-60"
              >
                Clear extra
              </button>
            ) : null}
            <button
              type="button"
              disabled={teamSeatsMutation.isPending}
              onClick={() => setTeamSeatsUser(null)}
              className="h-11 rounded-xl border border-blue-200/70 bg-white px-4 text-sm font-semibold text-slate-700 transition hover:bg-blue-50 disabled:opacity-60"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={teamSeatsMutation.isPending}
              className="h-11 rounded-xl bg-linear-to-r from-navy-900 via-navy-700 to-navy-600 px-4 text-sm font-semibold text-white disabled:opacity-60"
            >
              {teamSeatsMutation.isPending ? 'Saving…' : 'Add team seats'}
            </button>
          </div>
        </form>
      </Modal>

      <Modal
        open={Boolean(extraQuestionsUser)}
        title={
          extraQuestionsUser
            ? `Extra questions — ${extraQuestionsUser.full_name}`
            : 'Extra questions'
        }
        onClose={() => {
          if (extraQuestionsMutation.isPending) return
          setExtraQuestionsUser(null)
          setExtraQuestionsFile(null)
          setExtraQuestionsFileError('')
          setExtraQuestionsNote('')
        }}
      >
        <form
          className="space-y-4"
          onSubmit={(event) => {
            event.preventDefault()
            const add = Number(extraQuestions)
            if (!extraQuestionsUser || !Number.isInteger(add) || add === 0) return
            requestAdminActionOtp({
              type: 'questions',
              payload: {
                userId: extraQuestionsUser.user_id,
                payload: { add, note: extraQuestionsNote.trim() || null },
                file: extraQuestionsFile,
              },
            })
          }}
        >
          <p className="text-sm text-slate-600">
            Current extra questions:{' '}
            <strong className="text-navy-900">
              {Number(extraQuestionsUser?.extra_questions || 0).toLocaleString()}
            </strong>
            {extraQuestionsUser?.plan?.max_questions_per_session != null ? (
              <>
                {' '}
                · Plan {Number(extraQuestionsUser.plan.max_questions_per_session).toLocaleString()} +
                extra ={' '}
                <strong className="text-navy-900">
                  {(
                    Number(extraQuestionsUser.plan.max_questions_per_session) +
                    Number(extraQuestionsUser.extra_questions || 0)
                  ).toLocaleString()}
                </strong>
              </>
            ) : null}
          </p>
          <div>
            <label className="text-sm font-semibold text-slate-700">Add extra questions</label>
            <input
              type="number"
              min={1}
              step={1}
              value={extraQuestions}
              onChange={(e) => setExtraQuestions(e.target.value)}
              className="mt-1 h-11 w-full rounded-xl border border-blue-200/70 bg-white px-3 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-500/15"
              placeholder="10"
              required
            />
            <p className="mt-1 text-xs text-slate-500">
              Example: plan 15 + extra 10 = 25 questions per session. Record this after the user pays
              you.
            </p>
          </div>
          <div>
            <label className="text-sm font-semibold text-slate-700">Note (optional)</label>
            <textarea
              value={extraQuestionsNote}
              onChange={(e) => setExtraQuestionsNote(e.target.value)}
              rows={3}
              className="mt-1 w-full rounded-xl border border-blue-200/70 bg-white px-3 py-2 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-500/15"
              placeholder="Reason for extra questions, payment details, invoice number…"
            />
          </div>
          <div>
            <label className="text-sm font-semibold text-slate-700">Attachment (optional)</label>
            {extraQuestionsFile ? (
              <div className="mt-1 flex items-center gap-2 rounded-xl border border-blue-200/70 bg-white px-3 py-2 text-sm">
                <span className="min-w-0 flex-1 truncate text-slate-700">
                  {extraQuestionsFile.name}
                </span>
                <button
                  type="button"
                  disabled={extraQuestionsMutation.isPending}
                  onClick={() => {
                    setExtraQuestionsFile(null)
                    setExtraQuestionsFileError('')
                  }}
                  className="rounded-lg p-1 text-slate-500 hover:bg-slate-100"
                  aria-label="Remove attachment"
                >
                  <X className="size-4" />
                </button>
              </div>
            ) : (
              <label className="mt-1 inline-flex cursor-pointer items-center gap-2 rounded-xl border border-dashed border-blue-200 bg-blue-50/50 px-3 py-2 text-sm font-semibold text-navy-800 transition hover:bg-blue-50">
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/gif,application/pdf"
                  className="hidden"
                  disabled={extraQuestionsMutation.isPending}
                  onChange={(event) => {
                    const file = event.target.files?.[0] || null
                    const error = extraAttachmentError(file)
                    setExtraQuestionsFileError(error)
                    setExtraQuestionsFile(error ? null : file)
                    event.target.value = ''
                  }}
                />
                Choose file
              </label>
            )}
            {extraQuestionsFileError ? (
              <p className="mt-1 text-xs text-red-600">{extraQuestionsFileError}</p>
            ) : null}
          </div>
          {extraQuestionsHistoryQuery.data?.length ? (
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">History</p>
              <ul className="mt-2 max-h-40 space-y-2 overflow-y-auto text-xs text-slate-600">
                {extraQuestionsHistoryQuery.data.map((row) => {
                  const attachmentUrl = resolveQuestionMediaUrl(row.attachment_url)
                  return (
                    <li
                      key={row.addon_id}
                      className="rounded-lg border border-slate-100 bg-slate-50 px-2.5 py-2"
                    >
                      <p>
                        <span className="font-semibold text-navy-900">
                          {row.questions > 0 ? '+' : ''}
                          {Number(row.questions).toLocaleString()} questions
                        </span>
                        {row.created_at ? (
                          <span className="text-slate-500">
                            {' '}
                            · {new Date(row.created_at).toLocaleString()}
                          </span>
                        ) : null}
                      </p>
                      {row.note ? (
                        <p className="mt-1 whitespace-pre-wrap text-slate-700">{row.note}</p>
                      ) : null}
                      {attachmentUrl ? (
                        <a
                          href={attachmentUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="mt-1 inline-flex items-center gap-1 font-semibold text-navy-800 hover:underline"
                        >
                          <Paperclip className="size-3" aria-hidden />
                          {row.attachment_filename || 'View attachment'}
                        </a>
                      ) : null}
                    </li>
                  )
                })}
              </ul>
            </div>
          ) : null}
          <div className="flex flex-wrap justify-end gap-2 pt-2">
            {Number(extraQuestionsUser?.extra_questions || 0) > 0 ? (
              <button
                type="button"
                disabled={extraQuestionsMutation.isPending}
                onClick={() =>
                  requestAdminActionOtp({
                    type: 'questions',
                    payload: {
                      userId: extraQuestionsUser.user_id,
                      payload: { set: 0, note: 'Cleared extra questions' },
                    },
                  })
                }
                className="h-11 rounded-xl border border-red-200 bg-white px-4 text-sm font-semibold text-red-700 transition hover:bg-red-50 disabled:opacity-60"
              >
                Clear extra
              </button>
            ) : null}
            <button
              type="button"
              disabled={extraQuestionsMutation.isPending}
              onClick={() => setExtraQuestionsUser(null)}
              className="h-11 rounded-xl border border-blue-200/70 bg-white px-4 text-sm font-semibold text-slate-700 transition hover:bg-blue-50 disabled:opacity-60"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={extraQuestionsMutation.isPending || Boolean(extraQuestionsFileError)}
              className="h-11 rounded-xl bg-linear-to-r from-navy-900 via-navy-700 to-navy-600 px-4 text-sm font-semibold text-white shadow-lg shadow-blue-900/25 transition hover:brightness-110 disabled:opacity-60"
            >
              {extraQuestionsMutation.isPending ? 'Saving…' : 'Add extra questions'}
            </button>
          </div>
        </form>
      </Modal>

      <Modal
        open={Boolean(planEditUser)}
        title={planEditUser ? `Plan — ${planEditUser.full_name}` : 'Plan'}
        onClose={() => {
          if (assignPlanMutation.isPending) return
          setPlanEditUser(null)
        }}
      >
        <form
          className="space-y-4"
          onSubmit={(event) => {
            event.preventDefault()
            if (!planEditUser) return
            requestAdminActionOtp({
              type: 'plan',
              payload: {
                userId: planEditUser.user_id,
                planId: planEditForm.plan_id ? Number(planEditForm.plan_id) : null,
                planExpiresAt: selectedPlanForEdit?.is_free
                  ? null
                  : planEditForm.plan_expires_at || null,
              },
            })
          }}
        >
          <div>
            <label className="text-sm font-semibold text-slate-700">Plan</label>
            <select
              value={planEditForm.plan_id}
              onChange={(e) => {
                const planId = e.target.value
                const plan = (plansQuery.data || []).find((p) => String(p.plan_id) === planId)
                let expires = ''
                if (plan?.default_duration_days && !plan.is_free) {
                  const date = new Date()
                  date.setUTCDate(date.getUTCDate() + Number(plan.default_duration_days))
                  expires = date.toISOString().slice(0, 10)
                }
                setPlanEditForm({
                  plan_id: planId,
                  plan_expires_at: plan?.is_free ? '' : expires || planEditForm.plan_expires_at,
                })
              }}
              className="mt-1 h-11 w-full rounded-xl border border-blue-200/70 bg-white px-3 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-500/15"
            >
              <option value="">No plan (unlimited)</option>
              {(plansQuery.data || [])
                .filter((plan) => !plan.is_free)
                .map((plan) => (
                <option key={plan.plan_id} value={plan.plan_id} disabled={!plan.is_active}>
                  {plan.name} ({Number(plan.max_participants).toLocaleString()})
                </option>
              ))}
            </select>
          </div>
          {planEditForm.plan_id && !selectedPlanForEdit?.is_free ? (
            <div>
              <label className="text-sm font-semibold text-slate-700">Expiry date</label>
              <input
                type="date"
                value={planEditForm.plan_expires_at}
                readOnly
                disabled
                className="mt-1 h-11 w-full cursor-not-allowed rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm text-slate-600 outline-none"
              />
              <p className="mt-1 text-xs text-slate-500">
                Set automatically from the plan duration when you change the plan. Not editable here.
              </p>
            </div>
          ) : null}
          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              disabled={assignPlanMutation.isPending}
              onClick={() => setPlanEditUser(null)}
              className="h-11 rounded-xl border border-blue-200/70 bg-white px-4 text-sm font-semibold text-slate-700 transition hover:bg-blue-50 disabled:opacity-60"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={assignPlanMutation.isPending}
              className="h-11 rounded-xl bg-linear-to-r from-navy-900 via-navy-700 to-navy-600 px-4 text-sm font-semibold text-white shadow-lg shadow-blue-900/25 transition hover:brightness-110 disabled:opacity-60"
            >
              {assignPlanMutation.isPending ? 'Saving…' : 'Save plan'}
            </button>
          </div>
        </form>
      </Modal>

      <Modal
        open={adminOtpOpen}
        title="Verify admin action"
        onClose={() => {
          if (adminOtpSending || adminOtpVerifying) return
          pendingAdminActionRef.current = null
          setAdminOtpOpen(false)
          setAdminOtpCode('')
          setAdminOtpError('')
        }}
      >
        <form className="space-y-4" onSubmit={confirmAdminActionOtp}>
          <p className="text-sm text-slate-600">
            A one-time code was sent to the configured admin OTP mailbox
            {adminOtpSending ? '…' : '.'} Enter it to confirm this plan or quota change.
          </p>
          <div>
            <label htmlFor="adminOtpCode" className="text-sm font-semibold text-slate-700">
              Verification code
            </label>
            <input
              id="adminOtpCode"
              type="text"
              inputMode="numeric"
              autoComplete="one-time-code"
              maxLength={6}
              value={adminOtpCode}
              onChange={(e) => {
                setAdminOtpCode(e.target.value.replace(/\D/g, '').slice(0, 6))
                setAdminOtpError('')
              }}
              className="mt-1 h-11 w-full rounded-xl border border-blue-200/70 bg-white px-3 text-sm tracking-[0.35em] outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-500/15"
              placeholder="••••••"
              required
            />
          </div>
          {adminOtpError ? (
            <p className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {adminOtpError}
            </p>
          ) : null}
          <div className="flex flex-wrap justify-between gap-2 pt-1">
            <button
              type="button"
              disabled={adminOtpSending || adminOtpVerifying}
              onClick={async () => {
                setAdminOtpSending(true)
                setAdminOtpError('')
                try {
                  await sendAdminActionOtpApi(accessToken)
                  setAdminOtpCode('')
                } catch (error) {
                  setAdminOtpError(error.message || 'Unable to resend code')
                } finally {
                  setAdminOtpSending(false)
                }
              }}
              className="h-11 rounded-xl border border-blue-200/70 bg-white px-4 text-sm font-semibold text-slate-700 transition hover:bg-blue-50 disabled:opacity-60"
            >
              {adminOtpSending ? 'Sending…' : 'Resend code'}
            </button>
            <div className="flex gap-2">
              <button
                type="button"
                disabled={adminOtpSending || adminOtpVerifying}
                onClick={() => {
                  pendingAdminActionRef.current = null
                  setAdminOtpOpen(false)
                }}
                className="h-11 rounded-xl border border-blue-200/70 bg-white px-4 text-sm font-semibold text-slate-700 transition hover:bg-blue-50 disabled:opacity-60"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={adminOtpSending || adminOtpVerifying}
                className="inline-flex h-11 items-center gap-2 rounded-xl bg-linear-to-r from-navy-900 via-navy-700 to-navy-600 px-4 text-sm font-semibold text-white shadow-lg shadow-blue-900/25 transition hover:brightness-110 disabled:opacity-60"
              >
                {adminOtpVerifying ? (
                  <>
                    <LoaderCircle className="size-4 animate-spin" />
                    Verifying…
                  </>
                ) : (
                  'Confirm'
                )}
              </button>
            </div>
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

export default ManageUsersPage
