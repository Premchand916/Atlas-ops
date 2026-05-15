import { createContext, useContext, useEffect, useState } from 'react'
import type { User } from 'firebase/auth'
import {
  onAuthStateChanged,
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
  signOut,
} from 'firebase/auth'
import { auth, googleProvider } from '../lib/firebase'

interface AuthContextType {
  user: User | null
  loading: boolean
  authError: string | null
  signIn: () => Promise<void>
  signOut: () => Promise<void>
  clearAuthError: () => void
}

const AuthContext = createContext<AuthContextType>({} as AuthContextType)

function getAuthErrorMessage(error: unknown) {
  const code = typeof error === 'object' && error && 'code' in error
    ? String(error.code)
    : ''

  switch (code) {
    case 'auth/unauthorized-domain':
      return 'This domain is not authorized for Google sign-in. Add the current host in Firebase Authentication settings.'
    case 'auth/operation-not-allowed':
      return 'Google sign-in is not enabled for this Firebase project.'
    case 'auth/popup-blocked':
      return 'The sign-in popup was blocked. Allow popups for this site and try again.'
    case 'auth/popup-closed-by-user':
      return 'Sign-in was cancelled before it finished.'
    case 'auth/cancelled-popup-request':
      return 'Another sign-in popup is already open.'
    default:
      return 'Google sign-in failed. Please try again.'
  }
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [authError, setAuthError] = useState<string | null>(null)

  useEffect(() => {
    getRedirectResult(auth)
      .then(result => { if (result?.user) setUser(result.user) })
      .catch((err: unknown) => {
        setAuthError(getAuthErrorMessage(err))
      })

    const unsub = onAuthStateChanged(auth, (u) => {
      setUser(u)
      setLoading(false)
      if (u) setAuthError(null)
    })
    return unsub
  }, [])

  const signIn = async () => {
    setAuthError(null)

    try {
      await signInWithPopup(auth, googleProvider)
    } catch (err: unknown) {
      const code = typeof err === 'object' && err && 'code' in err ? String(err.code) : ''

      if (code === 'auth/popup-blocked') {
        try {
          await signInWithRedirect(auth, googleProvider)
        } catch (redirectErr: unknown) {
          setAuthError(getAuthErrorMessage(redirectErr))
        }
        return
      }

      setAuthError(getAuthErrorMessage(err))
    }
  }

  const signOutUser = async () => {
    await signOut(auth)
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        authError,
        signIn,
        signOut: signOutUser,
        clearAuthError: () => setAuthError(null),
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
