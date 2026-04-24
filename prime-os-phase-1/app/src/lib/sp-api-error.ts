export class SpApiError extends Error {
  constructor(
    message: string,
    public readonly statusCode: number,
    public readonly errorCode?: string,
    public readonly details?: unknown,
  ) {
    super(message);
    this.name = 'SpApiError';
  }
}
