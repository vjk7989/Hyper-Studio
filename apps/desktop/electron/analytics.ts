import type { AnalyticsEventName } from './analytics-payload'

// Hyper-Studio has no telemetry service. Keep this interface for existing callers
// while removing the upstream endpoint and all collection at the source.
export function getAnalyticsState(): { analyticsEnabled: boolean; installationId: string } {
  return { analyticsEnabled: false, installationId: '' }
}

export function setAnalyticsEnabled(_enabled: boolean): void {
  // Deliberately ignored until an opt-in Hyper-Studio service exists.
}

export async function sendAnalyticsEvent(
  _eventName: AnalyticsEventName,
  _extraDetails?: Record<string, unknown> | null,
): Promise<void> {
  // No network traffic or local event collection.
}
