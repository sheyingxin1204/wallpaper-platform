export function GET() {
  return Response.json({
    status: "ok",
    version: process.env.NEXT_PUBLIC_COMMIT_SHA?.trim() || "dev",
  });
}
