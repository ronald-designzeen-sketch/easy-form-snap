import { rateLimit } from '@/middleware/rate-limit';
import { requireAuth } from '@/lib/auth-utils';

type Handler = (req: Request) => Promise<Response>;

export const withAuth = (handler: Handler) => async (req: Request) => {
  try {
    await requireAuth();
    return handler(req);
  } catch (error) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};

export const withRateLimit = (handler: Handler) => async (req: Request) => {
  const ip = req.headers.get('x-forwarded-for') || '127.0.0.1';
  const rateLimitResult = rateLimit(ip);
  
  if (rateLimitResult) {
    return new Response(JSON.stringify({ 
      error: rateLimitResult.error,
      retryAfter: rateLimitResult.retryAfter
    }), {
      status: rateLimitResult.status,
      headers: {
        'Content-Type': 'application/json',
        'Retry-After': rateLimitResult.retryAfter.toString()
      }
    });
  }

  return handler(req);
};