import { GoogleAuthProvider, signInWithPopup } from 'firebase/auth'
import { auth, isFirebaseConfigured } from '../config/firebase'

function mapFirebaseAuthError(error) {
  const code = String(error?.code || '')
  if (code === 'auth/popup-closed-by-user' || code === 'auth/cancelled-popup-request') {
    return 'Google sign-in was cancelled.'
  }
  if (code === 'auth/popup-blocked') {
    return 'Pop-up was blocked. Allow pop-ups for this site and try again.'
  }
  if (code === 'auth/network-request-failed') {
    return 'Network error during Google sign-in. Check your connection and try again.'
  }
  return error?.message || 'Google sign-in failed.'
}

/**
 * Opens Google sign-in via Firebase for website registration identity.
 * Returns Firebase ID token + profile fields to prefill the form.
 */
export async function signInWithGoogleForSignup() {
  if (!isFirebaseConfigured() || !auth) {
    const error = new Error('Google sign-in is not configured')
    error.code = 'GOOGLE_AUTH_DISABLED'
    throw error
  }

  try {
    const provider = new GoogleAuthProvider()
    provider.setCustomParameters({ prompt: 'select_account' })
    const result = await signInWithPopup(auth, provider)
    const idToken = await result.user.getIdToken()
    if (!idToken) {
      throw new Error('Unable to get Google sign-in token')
    }
    return {
      idToken,
      email: result.user.email || '',
      fullName: result.user.displayName || '',
      photoURL: result.user.photoURL || '',
    }
  } catch (error) {
    const mapped = new Error(mapFirebaseAuthError(error))
    mapped.code = error?.code
    mapped.cause = error
    throw mapped
  }
}
