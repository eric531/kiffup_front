/**
 * Access tokens of the customer's orders, kept in this browser so the tracking page
 * still opens without the link. Optional convenience: storage may be unavailable.
 */
const key = (code: string) => `eventstay:booking:${code.toUpperCase()}`

export function saveBookingToken(code: string, token: string): void {
  try {
    localStorage.setItem(key(code), token)
  } catch {
    // private browsing / storage disabled: the link in the confirmation still works
  }
}

export function readBookingToken(code: string): string | null {
  try {
    return localStorage.getItem(key(code))
  } catch {
    return null
  }
}
