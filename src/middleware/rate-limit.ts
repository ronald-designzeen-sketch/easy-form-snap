const RATE_LIMIT = {
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
};

const rateLimits = new Map<string, { count: number; resetTime: number }>();

export const rateLimit = (ip: string) => {
  const now = Date.now();
  
  if (!rateLimits.has(ip)) {
    rateLimits.set(ip, { count: 1, resetTime: now + RATE_LIMIT.windowMs });
    return null;
  }

  const rateLimit = rateLimits.get(ip);
  if (!rateLimit) {
    rateLimits.set(ip, { count: 1, resetTime: now + RATE_LIMIT.windowMs });
    return null;
  }
  
  if (now > rateLimit.resetTime) {
    rateLimit.count = 1;
    rateLimit.resetTime = now + RATE_LIMIT.windowMs;
    return null;
  }

  rateLimit.count++;
  
  if (rateLimit.count > RATE_LIMIT.max) {
    return {
      error: 'Too many requests',
      status: 429,
      retryAfter: Math.ceil((rateLimit.resetTime - now) / 1000)
    };
  }

  return null;
};

// Clean up old rate limits periodically
setInterval(() => {
  const now = Date.now();
  for (const [ip, { resetTime }] of rateLimits.entries()) {
    if (now > resetTime + RATE_LIMIT.windowMs) {
      rateLimits.delete(ip);
    }
  }
}, 60 * 60 * 1000); // Clean up every hour