import { randomUUID } from 'crypto';

/**
 * Middleware para associar um contexto único por requisição.
 * Injeta requestId para rastreio e inicializa a estrutura do usuário.
 */
export function requestContextMiddleware(req, res, next) {
  const requestId = req.headers['x-request-id'] || randomUUID();

  req.requestContext = {
    requestId,
    timestamp: new Date().toISOString(),
    user: null
  };

  res.setHeader('X-Request-ID', requestId);
  next();
}
