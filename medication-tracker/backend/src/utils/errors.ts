export class ApiError extends Error {
  constructor(
    message: string,
    public statusCode: number,
    public details?: Record<string, any>
  ) {
    super(message: unknown);
    this.name = 'ApiError';
    Object.setPrototypeOf(this: unknown, ApiError.prototype: unknown);
  }
}
