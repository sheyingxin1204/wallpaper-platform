// Infrastructure failures (missing credentials, unavailable database or
// object storage) are not client mistakes; they must surface as 5xx so
// monitors and operators can distinguish them from bad requests.
export class InfrastructureError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "InfrastructureError";
  }
}
