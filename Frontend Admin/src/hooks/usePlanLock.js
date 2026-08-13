import { useQuery } from '@tanstack/react-query'
import { useAuthStore } from '../store/authStore'
import { getPlanUsageApi } from '../services/managementApi'
import { hasNoActivePlan } from '../components/dashboard/PlanExpiredNotice'

/**
 * Shared plan-lock state for hosts/admins (not super_admin).
 */
export function usePlanLock() {
  const accessToken = useAuthStore((state) => state.accessToken)
  const user = useAuthStore((state) => state.user)
  const skip = !accessToken || user?.role === 'super_admin'

  const planUsageQuery = useQuery({
    queryKey: ['plan-usage'],
    queryFn: () => getPlanUsageApi(accessToken),
    enabled: Boolean(accessToken && !skip),
  })

  const planUsage = planUsageQuery.data
  const planLocked = !skip && hasNoActivePlan(planUsage)

  return {
    planUsage,
    planLocked,
    planUsageQuery,
    isLoading: !skip && planUsageQuery.isLoading,
  }
}
