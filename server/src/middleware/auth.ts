import { createMiddleware } from 'hono/factory';
import { OAuth2Client } from 'google-auth-library';
import { ALLOWED_EMAILS } from '../config/allowed-emails';
import type { AuthUser } from '../../../shared/types';

const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

export const authMiddleware = createMiddleware<{
    Variables: { user: AuthUser };
}>(async (c, next) => {
    const authHeader = c.req.header('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
        return c.json({ error: 'Missing or invalid Authorization header' }, 401);
    }

    const token = authHeader.slice(7);

    try {
        const ticket = await client.verifyIdToken({
            idToken: token,
            audience: process.env.GOOGLE_CLIENT_ID,
        });

        const payload = ticket.getPayload();
        if (!payload?.email) {
            return c.json({ error: 'Invalid token: no email claim' }, 401);
        }

        const emailLower = payload.email.toLowerCase();
        const isAllowed = ALLOWED_EMAILS.length === 0 ||
            ALLOWED_EMAILS.some(e => e.toLowerCase() === emailLower);

        if (!isAllowed) {
            return c.json({ error: 'Email not authorized' }, 403);
        }

        c.set('user', {
            email: payload.email,
            name: payload.name || '',
            picture: payload.picture || '',
            sub: payload.sub!,
        });

        await next();
    } catch (err: any) {
        console.error('Auth error:', err.message);
        return c.json({ error: 'Invalid or expired token' }, 401);
    }
});
