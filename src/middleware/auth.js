import { env } from '../config/env.js';
import { AuthService } from '../services/authService.js';

/**
 * Middleware para exigir usuário autenticado.
 * Suporta autenticação baseada em JWT (Bearer) com fallback temporário para Basic Auth.
 */
export function requireAuthenticatedUser(req, res, next) {
  const ACCESS_PASSWORD = env.auth?.accessPassword;
  const isProduction = env.nodeEnv === 'production';

  // Em produção, a ausência de senha impede a liberação desprotegida
  if (isProduction && !ACCESS_PASSWORD) {
    return res.status(500).json({
      error: {
        code: 'CONFIG_ERROR',
        message: 'Authentication configuration missing in production.',
        requestId: req.requestContext?.requestId
      }
    });
  }

  // Se não houver senha configurada em desenvolvimento, injeta usuário dev padrão
  if (!ACCESS_PASSWORD) {
    req.requestContext.user = {
      id: 'dev_user_1',
      email: 'dev@local.internal',
      roles: ['viewer', 'analyst', 'admin'],
      tenantId: 'default_tenant',
      grantedCompanyIds: []
    };
    return next();
  }

  const authHeader = req.headers.authorization || '';

  // 1. Tenta autenticação baseada em token JWT (Bearer Token)
  if (authHeader.toLowerCase().startsWith('bearer ')) {
    const token = authHeader.split(' ')[1] || '';
    const decoded = AuthService.verifyToken(token);
    
    if (decoded) {
      req.requestContext.user = {
        id: decoded.id || 'authenticated_user',
        email: decoded.email || 'user@bi.internal',
        roles: decoded.roles || ['viewer'],
        tenantId: decoded.tenantId || 'default_tenant',
        grantedCompanyIds: decoded.grantedCompanyIds || []
      };
      return next();
    }
  }

  // 2. Fallback temporário para Basic Auth (Para compatibilidade durante transição)
  if (authHeader.toLowerCase().startsWith('basic ')) {
    const b64auth = authHeader.split(' ')[1] || '';
    const [login, password] = Buffer.from(b64auth, 'base64').toString('utf8').split(':');

    if (env.demoMode) {
      if (password === 'demo' && ['admin', 'analyst', 'viewer'].includes(login)) {
        req.requestContext.user = {
          id: login,
          email: `${login}@demo.internal`,
          roles: login === 'admin' 
            ? ['viewer', 'analyst', 'admin'] 
            : (login === 'analyst' ? ['viewer', 'analyst'] : ['viewer']),
          tenantId: 'tenant_demo_alpha',
          grantedCompanyIds: []
        };
        return next();
      }
    } else if (password === ACCESS_PASSWORD) {
      const isAdmin = login === 'admin' || password === env.auth?.adminAccessPassword;
      req.requestContext.user = {
        id: login || 'authenticated_user',
        email: `${login || 'user'}@bi.internal`,
        roles: isAdmin ? ['viewer', 'analyst', 'admin'] : ['viewer'],
        tenantId: 'default_tenant',
        grantedCompanyIds: []
      };
      return next();
    }
  }

  // Retorna erro de não autenticado caso não forneça credenciais válidas
  return res.status(401).json({
    error: {
      code: 'UNAUTHORIZED',
      message: 'Acesso negado. Credenciais inválidas ou ausentes.',
      requestId: req.requestContext?.requestId
    }
  });
}

/**
 * Middleware de autorização RBAC por papéis (roles).
 */
export function requireRole(...allowedRoles) {
  return (req, res, next) => {
    const user = req.requestContext?.user;

    if (!user) {
      return res.status(401).json({
        error: {
          code: 'UNAUTHORIZED',
          message: 'Usuário não autenticado.',
          requestId: req.requestContext?.requestId
        }
      });
    }

    const hasPermission = allowedRoles.some(role => user.roles.includes(role));

    if (!hasPermission) {
      return res.status(403).json({
        error: {
          code: 'FORBIDDEN',
          message: 'Acesso negado. Permissão insuficiente para este recurso.',
          requestId: req.requestContext?.requestId
        }
      });
    }

    next();
  };
}

/**
 * Middleware para garantir contexto de tenant resolvido.
 */
export function requireTenantContext(req, res, next) {
  const user = req.requestContext?.user;

  if (!user || !user.tenantId) {
    return res.status(403).json({
      error: {
        code: 'TENANT_REQUIRED',
        message: 'Contexto de tenant não resolvido.',
        requestId: req.requestContext?.requestId
      }
    });
  }

  next();
}
