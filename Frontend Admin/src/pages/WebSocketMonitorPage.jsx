import { Activity, Cpu, MemoryStick, RefreshCw, Server, ShieldAlert, ShieldBan, Users } from 'lucide-react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import StatCard from '../components/dashboard/StatCard'
import { WebSocketMonitorCharts } from '../components/monitor/WebSocketMonitorCharts'
import { WebSocketSessionsTable } from '../components/monitor/WebSocketSessionsTable'
import { WebSocketIpSecuritySection } from '../components/monitor/WebSocketIpSecuritySection'
import {
  WebSocketRateLimitSection,
  countRecentRateLimitEvents,
} from '../components/monitor/WebSocketRateLimitSection'
import { HostAlertModal } from '../components/live/HostAlertModal'
import { useAuthStore } from '../store/authStore'
import {
  blockWebSocketIpApi,
  closeWebSocketConnectionsApi,
  getWebSocketMonitorApi,
  unblockWebSocketIpApi,
} from '../services/monitorApi'
import { formatUptime } from '../utils/websocketMonitor'

const POLL_INTERVAL_MS = 5000

function WebSocketMonitorPage() {
  const accessToken = useAuthStore((state) => state.accessToken)
  const queryClient = useQueryClient()
  const [closingKey, setClosingKey] = useState(null)
  const [ipBusyKey, setIpBusyKey] = useState(null)
  const [alert, setAlert] = useState(null)

  const monitorQuery = useQuery({
    queryKey: ['websocket-monitor'],
    queryFn: () => getWebSocketMonitorApi(accessToken),
    enabled: Boolean(accessToken),
    refetchInterval: POLL_INTERVAL_MS,
    staleTime: 2000,
  })

  const closeMutation = useMutation({
    mutationFn: ({ sessionCode, role }) =>
      closeWebSocketConnectionsApi(accessToken, {
        session_code: sessionCode,
        role,
      }),
    onMutate: ({ sessionCode, role }) => {
      setClosingKey(`${sessionCode}:${role}`)
    },
    onSuccess: (data, variables) => {
      const count = Number(data?.closed_count || 0)
      setAlert({
        variant: count ? 'success' : 'info',
        title: count ? 'Connections closed' : 'No matching connections',
        message: count
          ? `Closed ${count} ${variables.role} connection${count === 1 ? '' : 's'} for ${variables.sessionCode}.`
          : `There were no open ${variables.role} connections for ${variables.sessionCode}.`,
      })
      queryClient.invalidateQueries({ queryKey: ['websocket-monitor'] })
    },
    onError: (error) => {
      setAlert({
        variant: 'error',
        title: 'Could not close connections',
        message: error?.message || 'Failed to close WebSocket connections',
      })
    },
    onSettled: () => {
      setClosingKey(null)
    },
  })

  const blockIpMutation = useMutation({
    mutationFn: ({ ip_address, reason }) =>
      blockWebSocketIpApi(accessToken, {
        ip_address,
        reason,
        close_existing: true,
      }),
    onMutate: ({ ip_address }) => {
      setIpBusyKey(`block:${ip_address}`)
    },
    onSuccess: (data) => {
      const closed = Number(data?.closed_count || 0)
      const ip = data?.blocked?.ip_address || 'IP'
      setAlert({
        variant: 'success',
        title: data?.created ? 'IP blocked' : 'IP already blocked',
        message: closed
          ? `${ip} is blocked. Closed ${closed} open connection${closed === 1 ? '' : 's'}.`
          : `${ip} is blocked. New WebSocket connections from this address will be rejected.`,
      })
      queryClient.invalidateQueries({ queryKey: ['websocket-monitor'] })
    },
    onError: (error) => {
      setAlert({
        variant: 'error',
        title: 'Could not block IP',
        message: error?.message || 'Failed to block IP address',
      })
    },
    onSettled: () => {
      setIpBusyKey(null)
    },
  })

  const unblockIpMutation = useMutation({
    mutationFn: ({ ip_address, reason }) =>
      unblockWebSocketIpApi(accessToken, {
        ip_address,
        reason,
      }),
    onMutate: ({ ip_address }) => {
      setIpBusyKey(`unblock:${ip_address}`)
    },
    onSuccess: (data) => {
      setAlert({
        variant: 'success',
        title: 'IP unblocked',
        message: `${data?.ip_address || 'IP'} can connect again.`,
      })
      queryClient.invalidateQueries({ queryKey: ['websocket-monitor'] })
    },
    onError: (error) => {
      setAlert({
        variant: 'error',
        title: 'Could not unblock IP',
        message: error?.message || 'Failed to unblock IP address',
      })
    },
    onSettled: () => {
      setIpBusyKey(null)
    },
  })

  const monitor = monitorQuery.data
  const isLoading = monitorQuery.isLoading && !monitor
  const isLive = !monitorQuery.isError
  const blockedCount = monitor?.blocked_ips?.length ?? 0
  const recent429Count = countRecentRateLimitEvents(monitor?.rate_limit?.events)

  const handleManualRefresh = () => {
    monitorQuery.refetch()
  }

  return (
    <section className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.25em] text-navy-700">
            System monitoring
          </p>
          <h2 className="mt-1 text-2xl font-bold text-navy-900">WebSocket connections</h2>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={handleManualRefresh}
            disabled={monitorQuery.isFetching}
            className="inline-flex h-11 items-center gap-2 rounded-2xl border border-blue-200/70 bg-white px-4 text-sm font-semibold text-slate-700 transition hover:bg-blue-50 disabled:opacity-60"
          >
            <RefreshCw className={`size-4 ${monitorQuery.isFetching ? 'animate-spin' : ''}`} />
            Refresh now
          </button>
        </div>
      </div>

      {monitorQuery.isError ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-600">
          {monitorQuery.error?.message || 'Failed to load monitor data'}
        </div>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-6">
        <StatCard
          label="Open connections"
          value={monitor?.total_connections ?? '—'}
          trendLabel="Active WebSocket sockets"
          sparkline={monitor?.history?.map((row) => row.total_connections) ?? []}
          accent="navy"
          pulse={isLive && (monitor?.total_connections ?? 0) > 0}
        />
        <StatCard
          label="Active sessions"
          value={monitor?.unique_sessions ?? '—'}
          trendLabel="Sessions with ≥1 socket"
          sparkline={monitor?.history?.map((row) => row.unique_sessions) ?? []}
          accent="blue"
        />
        <StatCard
          label="Connection buckets"
          value={monitor?.active_buckets ?? '—'}
          trendLabel="session:role groups"
          sparkline={monitor?.history?.map((row) => row.active_buckets) ?? []}
          accent="cyan"
        />
        <StatCard
          label="Blocked IPs"
          value={monitor ? blockedCount : '—'}
          trendLabel="Denied WebSocket addresses"
          sparkline={[]}
          accent="indigo"
        />
        <StatCard
          label="Rate-limit 429s"
          value={monitor ? recent429Count : '—'}
          trendLabel="Last 15 minutes"
          sparkline={[]}
          accent="indigo"
        />
        <StatCard
          label="Process uptime"
          value={monitor?.server ? formatUptime(monitor.server.process_uptime_seconds) : '—'}
          trendLabel={
            monitor?.server
              ? `Heap ${monitor.server.memory_heap_used_mb} MB · RSS ${monitor.server.memory_rss_mb} MB`
              : 'Node process'
          }
          sparkline={[]}
          accent="indigo"
        />
      </div>

      <WebSocketMonitorCharts monitor={monitor} isLoading={isLoading} />

      <div className="grid gap-4 xl:grid-cols-3">
        <div className="rounded-2xl border border-blue-200/70 bg-white/90 p-4 shadow-sm xl:col-span-1">
          <div className="mb-3 flex items-center gap-2">
            <Server className="size-4 text-navy-700" />
            <h3 className="text-sm font-bold text-navy-900">Server snapshot</h3>
          </div>
          <dl className="space-y-3 text-sm">
            <div className="flex items-center justify-between gap-3">
              <dt className="inline-flex items-center gap-2 text-slate-600">
                <Activity className="size-3.5" />
                Uptime
              </dt>
              <dd className="font-semibold text-navy-900">
                {monitor?.server ? formatUptime(monitor.server.process_uptime_seconds) : '—'}
              </dd>
            </div>
            <div className="flex items-center justify-between gap-3">
              <dt className="inline-flex items-center gap-2 text-slate-600">
                <MemoryStick className="size-3.5" />
                Heap used
              </dt>
              <dd className="font-semibold tabular-nums text-navy-900">
                {monitor?.server ? `${monitor.server.memory_heap_used_mb} MB` : '—'}
              </dd>
            </div>
            <div className="flex items-center justify-between gap-3">
              <dt className="inline-flex items-center gap-2 text-slate-600">
                <Cpu className="size-3.5" />
                RSS memory
              </dt>
              <dd className="font-semibold tabular-nums text-navy-900">
                {monitor?.server ? `${monitor.server.memory_rss_mb} MB` : '—'}
              </dd>
            </div>
            <div className="flex items-center justify-between gap-3">
              <dt className="inline-flex items-center gap-2 text-slate-600">
                <ShieldBan className="size-3.5" />
                Blocked IPs
              </dt>
              <dd className="font-semibold tabular-nums text-navy-900">{blockedCount}</dd>
            </div>
            <div className="flex items-center justify-between gap-3">
              <dt className="inline-flex items-center gap-2 text-slate-600">
                <ShieldAlert className="size-3.5" />
                429s (15 min)
              </dt>
              <dd className="font-semibold tabular-nums text-navy-900">{recent429Count}</dd>
            </div>
            <div className="flex items-center justify-between gap-3">
              <dt className="inline-flex items-center gap-2 text-slate-600">
                <Users className="size-3.5" />
                History points
              </dt>
              <dd className="font-semibold tabular-nums text-navy-900">
                {monitor?.history?.length ?? 0}
              </dd>
            </div>
          </dl>
        </div>

        <div className="xl:col-span-2">
          <WebSocketSessionsTable
            sessions={monitor?.sessions}
            isLoading={isLoading}
            closingKey={closingKey}
            onCloseRole={async (target) => {
              await closeMutation.mutateAsync(target)
            }}
          />
        </div>
      </div>

      <WebSocketIpSecuritySection
        connections={monitor?.connections}
        blockedIps={monitor?.blocked_ips}
        isLoading={isLoading}
        busyKey={ipBusyKey}
        onBlockIp={async (target) => {
          await blockIpMutation.mutateAsync(target)
        }}
        onUnblockIp={async (target) => {
          await unblockIpMutation.mutateAsync(target)
        }}
      />

      <WebSocketRateLimitSection
        rateLimit={monitor?.rate_limit}
        blockedIps={monitor?.blocked_ips}
        isLoading={isLoading}
        busyKey={ipBusyKey}
        onBlockIp={async (target) => {
          await blockIpMutation.mutateAsync(target)
        }}
        onUnblockIp={async (target) => {
          await unblockIpMutation.mutateAsync(target)
        }}
      />

      <HostAlertModal
        open={Boolean(alert)}
        variant={alert?.variant || 'success'}
        title={alert?.title}
        message={alert?.message}
        confirmLabel="OK"
        onClose={() => setAlert(null)}
      />
    </section>
  )
}

export default WebSocketMonitorPage
