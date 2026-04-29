export const dynamic = 'force-dynamic';

const healthHeaders = {
  'Cache-Control': 'no-store, max-age=0',
};

export function GET() {
  return Response.json(
    { status: 'ok' },
    {
      headers: healthHeaders,
    }
  );
}

export function HEAD() {
  return new Response(null, {
    status: 200,
    headers: healthHeaders,
  });
}
