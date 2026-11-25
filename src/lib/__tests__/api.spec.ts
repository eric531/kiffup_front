import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { api, ApiError } from '@/lib/api'

function jsonResponse(body: unknown, status = 200, contentType = 'application/json') {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': contentType } })
}

describe('api', () => {
  const fetchMock = vi.fn<typeof fetch>()

  beforeEach(() => {
    vi.stubGlobal('fetch', fetchMock)
    document.cookie = 'XSRF-TOKEN=token%3D123; path=/'
  })

  afterEach(() => {
    fetchMock.mockReset()
    vi.unstubAllGlobals()
  })

  it('envoie les cookies et le jeton XSRF décodé', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({ data: { id: 1 } }))

    await api.post('/api/v1/things', { name: 'x' })

    const [url, init] = fetchMock.mock.calls[0]!
    const headers = init?.headers as Record<string, string>
    expect(url).toBe('/api/v1/things')
    expect(init?.credentials).toBe('include')
    expect(headers['X-XSRF-TOKEN']).toBe('token=123')
    expect(init?.body).toBe('{"name":"x"}')
  })

  it('transforme une réponse Problem Details en ApiError', async () => {
    fetchMock.mockResolvedValueOnce(
      jsonResponse(
        {
          type: 'validation-error',
          title: 'Données invalides',
          status: 422,
          detail: "L'email est obligatoire.",
          errors: { email: ["L'email est obligatoire."] },
        },
        422,
        'application/problem+json',
      ),
    )

    const error = await api.post('/auth/login', {}).catch((e: unknown) => e)

    expect(error).toBeInstanceOf(ApiError)
    expect((error as ApiError).status).toBe(422)
    expect((error as ApiError).type).toBe('validation-error')
    expect((error as ApiError).fieldError('email')).toBe("L'email est obligatoire.")
  })

  it('reconnaît la demande de confirmation du mot de passe de Fortify (423)', async () => {
    fetchMock.mockResolvedValueOnce(
      jsonResponse({ message: 'Password confirmation required.' }, 423),
    )

    const error = (await api
      .post('/auth/user/two-factor-authentication')
      .catch((e: unknown) => e)) as ApiError

    expect(error.type).toBe('password-confirmation-required')
  })

  it('signale une coupure réseau de façon compréhensible', async () => {
    fetchMock.mockRejectedValueOnce(new TypeError('Failed to fetch'))

    const error = (await api.get('/api/v1/me').catch((e: unknown) => e)) as ApiError

    expect(error.type).toBe('network-error')
    expect(error.status).toBe(0)
  })
})
