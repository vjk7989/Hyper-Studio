/** Error shape retained for unreachable upstream account error branches. */
export class FirebaseError extends Error {
  constructor(
    public readonly code: string,
    message: string
  ) {
    super(message)
    this.name = 'FirebaseError'
  }
}
