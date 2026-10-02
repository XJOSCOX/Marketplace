export class AppError extends Error {
  status: number;
  code: string;
  constructor(status: number, code: string, message: string) {
    super(message);
    this.status = status;
    this.code = code;
  }
}
export function errorResponse(error: unknown) {
  const known = error instanceof AppError;
  return Response.json(
    {
      error: {
        code: known ? error.code : "INTERNAL_ERROR",
        message: known ? error.message : "The request could not be completed.",
      },
    },
    {
      status: known ? error.status : 500,
      headers: { "Cache-Control": "private, no-store" },
    },
  );
}
