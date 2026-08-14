// Infrastructure failures (missing credentials, unavailable database or
// object storage) are not client mistakes; they must surface as 5xx so
// monitors and operators can distinguish them from bad requests.
export class InfrastructureError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "InfrastructureError";
  }
}

// A database uniqueness conflict (e.g. duplicate slug) is the client's
// responsibility to resolve, so it must surface as 409, not 500.
export class ConflictError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ConflictError";
  }
}
