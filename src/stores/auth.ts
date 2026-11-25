import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import { api, ApiError, ensureCsrfCookie } from '@/lib/api'
import { disconnectRealtime } from '@/lib/realtime'
import { useMessagingStore } from '@/stores/messaging'
import type { Resource, Role, User } from '@/types/identity'

export type LoginResult = 'authenticated' | 'two-factor'

/** Customer login, step 1: where the WhatsApp code was sent. */
export interface CustomerCodeSent {
  phone: string
  expires_in_minutes: number
  /** Local development only: the code, since no WhatsApp message leaves the machine. */
  dev_code?: string
}

export const useAuthStore = defineStore('auth', () => {
  const user = ref<User | null>(null)
  const loaded = ref(false)
  /** True when the last session check failed for a reason other than "not logged in". */
  const apiUnavailable = ref(false)

  const isAuthenticated = computed(() => user.value !== null)
  const isStaff = computed(() => hasRole('super_admin', 'admin'))
  const isSuperAdmin = computed(() => hasRole('super_admin'))
  const isPartner = computed(() => hasRole('partner'))
  const isCustomer = computed(() => hasRole('customer'))

  /** Where a user lands after logging in. */
  const homeRoute = computed(() => {
    if (isStaff.value) return { name: 'admin.dashboard' }
    if (isPartner.value) return { name: 'partner.dashboard' }
    if (isCustomer.value) return { name: 'account' }
    return { name: 'home' }
  })

  function hasRole(...roles: Role[]): boolean {
    return user.value?.roles.some((role) => roles.includes(role)) ?? false
  }

  /**
   * Loads the session. Never throws: when the API is unreachable the visitor is treated
   * as logged out, so public pages still render (protected pages redirect to the login).
   */
  async function fetchUser(): Promise<User | null> {
    try {
      const response = await api.get<Resource<User>>('/api/v1/me')
      user.value = response.data
      apiUnavailable.value = false
    } catch (error) {
      user.value = null
      const isAuthError = error instanceof ApiError && [401, 403, 419].includes(error.status)
      apiUnavailable.value = !isAuthError
      if (!isAuthError) console.error('Impossible de charger la session', error)
    } finally {
      loaded.value = true
    }
    return user.value
  }

  /** Partner and back-office login: phone number (or, for older accounts, email) + password. */
  async function login(
    login: string,
    password: string,
    country = 'CI',
    remember = false,
  ): Promise<LoginResult> {
    await ensureCsrfCookie(true)
    const response = await api.post<{ two_factor: boolean }>('/auth/login', {
      login,
      country,
      password,
      remember,
    })
    if (response?.two_factor) return 'two-factor'
    await fetchUser()
    return 'authenticated'
  }

  async function confirmTwoFactor(
    payload: { code: string } | { recovery_code: string },
  ): Promise<void> {
    await api.post('/auth/two-factor-challenge', payload)
    await fetchUser()
  }

  /** Customer login (no password): sends a 6-digit code on WhatsApp. */
  async function requestCustomerCode(phone: string, country: string): Promise<CustomerCodeSent> {
    await ensureCsrfCookie(true)
    const response = await api.post<Resource<CustomerCodeSent>>('/auth/customer/code', {
      phone,
      country,
    })
    return response.data
  }

  /** Checks the code; the account is created on the first login. */
  async function verifyCustomerCode(phone: string, country: string, code: string): Promise<User> {
    const response = await api.post<Resource<User>>('/auth/customer/verify', {
      phone,
      country,
      code,
    })
    user.value = response.data
    loaded.value = true
    return response.data
  }

  /** First / forgotten password (partners, back office): code on WhatsApp to the login number. */
  async function requestPasswordCode(phone: string, country: string): Promise<CustomerCodeSent> {
    await ensureCsrfCookie(true)
    const response = await api.post<Resource<CustomerCodeSent>>('/auth/password/code', {
      phone,
      country,
    })
    return response.data
  }

  async function resetPasswordWithCode(payload: {
    phone: string
    country: string
    code: string
    password: string
    password_confirmation: string
  }): Promise<void> {
    await api.post('/auth/password/reset', payload)
  }

  async function logout(): Promise<void> {
    try {
      await api.post('/auth/logout')
    } finally {
      user.value = null
      // The next user must not inherit the real-time channels (Messaging).
      useMessagingStore().stop()
      disconnectRealtime()
    }
  }

  return {
    user,
    loaded,
    apiUnavailable,
    isAuthenticated,
    isStaff,
    isSuperAdmin,
    isPartner,
    isCustomer,
    homeRoute,
    hasRole,
    fetchUser,
    login,
    confirmTwoFactor,
    requestCustomerCode,
    verifyCustomerCode,
    requestPasswordCode,
    resetPasswordWithCode,
    logout,
  }
})
