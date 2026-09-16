import { useRef, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { fetchAuthFeaturesApi } from '../services/authApi'
import {
  sendAdminActionOtpApi,
  verifyAdminActionOtpApi,
} from '../services/managementApi'
import { useAuthStore } from '../store/authStore'

export function useAdminActionOtp() {
  const accessToken = useAuthStore((state) => state.accessToken)
  const user = useAuthStore((state) => state.user)
  const pendingActionRef = useRef(null)
  const [open, setOpen] = useState(false)
  const [code, setCode] = useState('')
  const [error, setError] = useState('')
  const [sending, setSending] = useState(false)
  const [verifying, setVerifying] = useState(false)

  const featuresQuery = useQuery({
    queryKey: ['auth-features'],
    queryFn: fetchAuthFeaturesApi,
    staleTime: 60_000,
  })

  const sendCode = async () => {
    setSending(true)
    setError('')
    try {
      await sendAdminActionOtpApi(accessToken)
    } catch (requestError) {
      setError(requestError.message || 'Unable to send verification code')
    } finally {
      setSending(false)
    }
  }

  const requestAdminAction = async (action) => {
    const otpEnabled = featuresQuery.data?.admin_action_otp_enabled !== false
    if (user?.role !== 'super_admin' || !otpEnabled) {
      action(null)
      return
    }
    pendingActionRef.current = action
    setCode('')
    setError('')
    setOpen(true)
    await sendCode()
  }

  const close = () => {
    if (sending || verifying) return
    pendingActionRef.current = null
    setOpen(false)
    setCode('')
    setError('')
  }

  const confirm = async (event) => {
    event.preventDefault()
    if (!/^\d{6}$/.test(code.trim())) {
      setError('Enter the 6-digit verification code.')
      return
    }
    setVerifying(true)
    setError('')
    try {
      const verified = await verifyAdminActionOtpApi(accessToken, code.trim())
      const token = verified?.otp_token
      if (!token) throw new Error('Verification succeeded but no token was returned.')
      const action = pendingActionRef.current
      pendingActionRef.current = null
      setOpen(false)
      setCode('')
      action?.(token)
    } catch (verifyError) {
      setError(verifyError.message || 'Unable to verify code')
    } finally {
      setVerifying(false)
    }
  }

  return {
    requestAdminAction,
    modalProps: {
      open,
      code,
      error,
      sending,
      verifying,
      onCodeChange: setCode,
      onConfirm: confirm,
      onClose: close,
      onResend: sendCode,
    },
  }
}
