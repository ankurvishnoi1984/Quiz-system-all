import { useQuery } from '@tanstack/react-query'
import { useAuthStore } from '../store/authStore'
import { getPlanUsageApi } from '../services/managementApi'
import { hasNoActivePlan, canSelfServePlanChange } from '../components/dashboard/PlanExpiredNotice'
import { skipsPlanLock } from '../utils/adminRoles'

/**
 * Shared plan-lock state for hosts/admins (not super_admin / sub_admin).
 */
export function usePlanLock() {
  const accessToken = useAuthStore((state) => state.accessToken)
  const user = useAuthStore((state) => state.user)
  const skip = !accessToken || skipsPlanLock(user)

  const planUsageQuery = useQuery({
    queryKey: ['plan-usage'],
    queryFn: () => getPlanUsageApi(accessToken),
    enabled: Boolean(accessToken && !skip),
  })

  const planUsage = planUsageQuery.data
  const planLocked = !skip && hasNoActivePlan(planUsage)
  const canManagePlan = !skip && canSelfServePlanChange(planUsage)

  return {
    planUsage,
    planLocked,
    canManagePlan,
    planUsageQuery,
    isLoading: !skip && planUsageQuery.isLoading,
  }
}
