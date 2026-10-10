import { session } from 'electron'
import { isDev } from './config'
import { getWorkflowEngineStatus } from './workflow-engine'

// Enforce Content Security Policy via response headers (tamper-proof from renderer)
export function setupCSP(): void {
  // Model catalog assets may be hosted on Google storage.
  session.defaultSession.webRequest.onHeadersReceived((details, callback) => {
    const engineUrl = getWorkflowEngineStatus().url
    const isWorkflowResponse = engineUrl && new URL(details.url).origin === new URL(engineUrl).origin
    const csp = isDev
      ? [
          "default-src 'self'",
          "script-src 'self' 'unsafe-inline'",
          "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
          "font-src 'self' https://fonts.gstatic.com",
          "connect-src 'self' blob: https://api.comfy.org http://localhost:* http://127.0.0.1:* ws://localhost:* ws://127.0.0.1:*",
          "img-src 'self' data: blob: file: https://storage.googleapis.com",
          "media-src 'self' blob: file: https://storage.googleapis.com",
          "object-src 'none'",
          "base-uri 'self'",
          "form-action 'self'",
          "frame-src http://127.0.0.1:*",
          isWorkflowResponse ? "frame-ancestors file: http://localhost:* http://127.0.0.1:*" : "frame-ancestors 'none'",
        ].join('; ')
      : [
          "default-src 'self'",
          "script-src 'self'",
          "style-src 'self' https://fonts.googleapis.com",
          "font-src 'self' https://fonts.gstatic.com",
          // blob: covers app-created object URLs the renderer fetches back (audio
          // waveform decoding reads local asset bytes through one).
          "connect-src 'self' blob: https://api.comfy.org http://localhost:* http://127.0.0.1:* ws://localhost:* ws://127.0.0.1:*",
          "img-src 'self' data: blob: file: https://storage.googleapis.com",
          "media-src 'self' blob: file: https://storage.googleapis.com",
          "object-src 'none'",
          "base-uri 'self'",
          "form-action 'self'",
          "frame-src http://127.0.0.1:*",
          isWorkflowResponse ? "frame-ancestors file: http://localhost:* http://127.0.0.1:*" : "frame-ancestors 'none'",
        ].join('; ')

    const responseHeaders = { ...details.responseHeaders }
    if (isWorkflowResponse) {
      for (const key of Object.keys(responseHeaders)) {
        if (key.toLowerCase() === 'x-frame-options') delete responseHeaders[key]
      }
    }
    callback({ responseHeaders: { ...responseHeaders, 'Content-Security-Policy': [csp] } })
  })
}
