import { withAuth, withRateLimit } from '@/lib/api-utils';

export const POST = withRateLimit(withAuth(async (req: Request) => {
  try {
    // Your protected route logic here
    const data = await req.json();
    return new Response(JSON.stringify({ success: true, data }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : 'Internal server error' 
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}));