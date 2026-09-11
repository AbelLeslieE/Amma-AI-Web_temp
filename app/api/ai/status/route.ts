import { apiKey } from '@/lib/openai-server';

export const runtime = 'nodejs';

export async function GET() {
  return Response.json(
    { enabled: Boolean(apiKey()) },
    { headers: { 'Cache-Control': 'no-store' } },
  );
}
