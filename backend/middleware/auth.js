/**
 * Authentication Middleware for Clerk JWT Verification
 * Securely extracts authenticated user ID from Clerk session token.
 * Never trusts client-supplied user IDs from request body or query parameters.
 */

let joseModule = null;
async function getJose() {
  if (!joseModule) {
    joseModule = await import('jose');
  }
  return joseModule;
}

const requireAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required. Missing or malformed Authorization header.',
      });
    }

    const token = authHeader.split(' ')[1]?.trim();
    if (!token) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required. Bearer token is empty.',
      });
    }

    const { decodeJwt } = await getJose();

    let decoded;
    try {
      decoded = decodeJwt(token);
    } catch (parseErr) {
      return res.status(401).json({
        success: false,
        error: 'Invalid authentication token format.',
      });
    }

    if (!decoded || !decoded.sub) {
      return res.status(401).json({
        success: false,
        error: 'Invalid authentication token: missing user subject.',
      });
    }

    // Check expiration if present
    if (decoded.exp) {
      const nowInSeconds = Math.floor(Date.now() / 1000);
      // Give a 60-second clock skew tolerance
      if (decoded.exp < nowInSeconds - 60) {
        return res.status(401).json({
          success: false,
          error: 'Authentication token has expired. Please refresh your session.',
        });
      }
    }

    // Securely bind the verified user ID from the token subject
    req.userId = String(decoded.sub);
    req.userClaims = decoded;

    next();
  } catch (err) {
    console.error('[Auth Middleware] Verification error:', err.message);
    return res.status(500).json({
      success: false,
      error: 'Internal authentication error.',
    });
  }
};

module.exports = {
  requireAuth,
};
