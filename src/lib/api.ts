/**
 * Minimal HTTP client for the KiffUp API.
 * - Sanctum SPA authentication: session cookie + XSRF-TOKEN cookie echoed in X-XSRF-TOKEN.
 * - Errors are RFC 9457 Problem Details, exposed as ApiError.
 */

const BASE_URL = (import.meta.env.VITE_API_URL ?? '').replace(/\/$/, '')

export interface ProblemDetails {
  type: string
  title: string
  status: number
  detail?: string
  instance?: string
  errors?: Record<string, string[]>
}

export class ApiError extends Error {
  readonly status: number
  readonly type: string
  readonly detail?: string
  readonly errors: Record<string, string[]>

  constructor(problem: ProblemDetails) {
    super(problem.detail ?? problem.title)
    this.name = 'ApiError'
    this.status = problem.status
    this.type = problem.type
    this.detail = problem.detail
    this.errors = problem.errors ?? {}
  }

  /** First validation message of a field, for display under an input. */
  fieldError(field: string): string | undefined {
    return this.errors[field]?.[0]
  }
}

type Method = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'

interface RequestOptions {
  body?: unknown
  query?: Record<string, string | number | boolean | undefined>
  headers?: Record<string, string>
}

function readCookie(name: string): string | undefined {
  const match = document.cookie.split('; ').find((row) => row.startsWith(`${name}=`))
  return match ? decodeURIComponent(match.split('=').slice(1).join('=')) : undefined
}

/** Ensures the XSRF-TOKEN cookie exists before a state-changing request. */
export async function ensureCsrfCookie(force = false): Promise<void> {
  if (!force && readCookie('XSRF-TOKEN')) return
  await fetch(`${BASE_URL}/sanctum/csrf-cookie`, { credentials: 'include' })
}

function buildUrl(path: string, query?: RequestOptions['query']): string {
  const url = `${BASE_URL}${path}`
  if (!query) return url
  const params = new URLSearchParams()
  for (const [key, value] of Object.entries(query)) {
    if (value !== undefined) params.set(key, String(value))
  }
  const qs = params.toString()
  return qs ? `${url}?${qs}` : url
}

async function toApiError(response: Response): Promise<ApiError> {
  try {
    const body = await response.json()
    if (body && typeof body === 'object' && 'status' in body && 'type' in body) {
      return new ApiError(body as ProblemDetails)
    }
    // Some framework responses (e.g. Fortify 423 "password confirmation required") are plain JSON.
    return new ApiError({
      type: response.status === 423 ? 'password-confirmation-required' : 'http-error',
      title: body?.message ?? response.statusText,
      status: response.status,
      detail: body?.message,
      errors: body?.errors,
    })
  } catch {
    if ([502, 503, 504].includes(response.status)) {
      return new ApiError({
        type: 'service-unavailable',
        title: 'Service indisponible',
        status: response.status,
        detail:
          'Le serveur ne répond pas pour le moment. Merci de réessayer dans quelques instants.',
      })
    }
    return new ApiError({ type: 'http-error', title: response.statusText, status: response.status })
  }
}

export async function request<T = unknown>(
  method: Method,
  path: string,
  options: RequestOptions = {},
): Promise<T> {
  if (method !== 'GET') await ensureCsrfCookie()

  const headers: Record<string, string> = {
    Accept: 'application/json',
    'X-Requested-With': 'XMLHttpRequest',
    ...options.headers,
  }
  const xsrf = readCookie('XSRF-TOKEN')
  if (xsrf) headers['X-XSRF-TOKEN'] = xsrf
  const isFormData = options.body instanceof FormData
  // FormData (file uploads): the browser sets the multipart boundary itself.
  if (options.body !== undefined && !isFormData) headers['Content-Type'] = 'application/json'

  let response: Response
  try {
    response = await fetch(buildUrl(path, options.query), {
      method,
      headers,
      credentials: 'include',
      body: isFormData
        ? (options.body as FormData)
        : options.body !== undefined
          ? JSON.stringify(options.body)
          : undefined,
    })
  } catch {
    throw new ApiError({
      type: 'network-error',
      title: 'Connexion impossible',
      status: 0,
      detail: 'Connexion internet indisponible. Merci de réessayer une fois en ligne.',
    })
  }

  if (!response.ok) throw await toApiError(response)
  if (response.status === 204) return undefined as T

  const text = await response.text()
  return (text ? JSON.parse(text) : undefined) as T
}

/**
 * File upload with progress (videos of tens of MB on a mobile network): XMLHttpRequest, since
 * fetch cannot report upload progress. Same headers and errors as request().
 */
export async function upload<T = unknown>(
  path: string,
  form: FormData,
  onProgress?: (percent: number) => void,
): Promise<T> {
  await ensureCsrfCookie()
  return new Promise<T>((resolve, reject) => {
    const xhr = new XMLHttpRequest()
    xhr.open('POST', buildUrl(path))
    xhr.withCredentials = true
    xhr.setRequestHeader('Accept', 'application/json')
    xhr.setRequestHeader('X-Requested-With', 'XMLHttpRequest')
    const xsrf = readCookie('XSRF-TOKEN')
    if (xsrf) xhr.setRequestHeader('X-XSRF-TOKEN', xsrf)
    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable && onProgress)
        onProgress(Math.round((event.loaded / event.total) * 100))
    }
    xhr.onload = async () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        resolve((xhr.responseText ? JSON.parse(xhr.responseText) : undefined) as T)
        return
      }
      if (xhr.status === 413) {
        reject(
          new ApiError({
            type: 'payload-too-large',
            title: 'Fichier trop lourd',
            status: 413,
            detail: 'Fichier trop lourd pour le serveur. Raccourcissez ou compressez la vidéo.',
          }),
        )
        return
      }
      reject(await toApiError(new Response(xhr.responseText || null, { status: xhr.status })))
    }
    xhr.onerror = () =>
      reject(
        new ApiError({
          type: 'network-error',
          title: 'Connexion impossible',
          status: 0,
          detail:
            'Envoi interrompu. Vérifiez votre connexion puis réessayez, de préférence en Wi-Fi.',
        }),
      )
    xhr.send(form)
  })
}

/** Absolute URL of an API path (attachments shown in <img> / links: the API may be on another host). */
export const apiUrl = (path: string): string => `${BASE_URL}${path}`

export const api = {
  get: <T>(path: string, query?: RequestOptions['query']) => request<T>('GET', path, { query }),
  post: <T>(path: string, body?: unknown, headers?: Record<string, string>) =>
    request<T>('POST', path, { body, headers }),
  put: <T>(path: string, body?: unknown) => request<T>('PUT', path, { body }),
  patch: <T>(path: string, body?: unknown) => request<T>('PATCH', path, { body }),
  delete: <T>(path: string) => request<T>('DELETE', path),
}
