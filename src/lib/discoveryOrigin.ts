import { DISCOVERY_ORIGIN_DAYS, DISCOVERY_ORIGIN_KEY } from '@/types/discovery'

/**
 * Remembers the "Découvrir" video a visitor opened an offer from (RG43): a booking made within
 * 7 days on this device is credited to it. The server keeps it only if the video shows the
 * partner of the booked listing.
 */
interface Origin {
  video_id: number
  at: number
}

export function rememberDiscoveryOrigin(videoId: number): void {
  try {
    localStorage.setItem(
      DISCOVERY_ORIGIN_KEY,
      JSON.stringify({ video_id: videoId, at: Date.now() }),
    )
  } catch {
    // Private browsing / storage disabled: the booking is simply not credited.
  }
}

export function discoveryOrigin(): number | null {
  try {
    const origin = JSON.parse(localStorage.getItem(DISCOVERY_ORIGIN_KEY) ?? 'null') as Origin | null
    if (!origin || Date.now() - origin.at > DISCOVERY_ORIGIN_DAYS * 86_400_000) return null
    return origin.video_id
  } catch {
    return null
  }
}

export function forgetDiscoveryOrigin(): void {
  try {
    localStorage.removeItem(DISCOVERY_ORIGIN_KEY)
  } catch {
    // ignore
  }
}
