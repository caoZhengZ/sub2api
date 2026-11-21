export function readDesktopHandoffParams(query: Record<string, unknown>): {
  state: string
  challenge: string
} | null {
  const state = typeof query.desktop_state === 'string' ? query.desktop_state.trim() : ''
  const challenge = typeof query.desktop_challenge === 'string' ? query.desktop_challenge.trim() : ''
  if (!/^[A-Za-z0-9_-]{32,256}$/.test(state)) return null
  if (!/^[A-Za-z0-9_-]{43,128}$/.test(challenge)) return null
  return { state, challenge }
}
