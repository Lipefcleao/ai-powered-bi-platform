/**
 * Middleware centralizado para tratamento de erros.
 * Oculta stack traces, erros internos de SQL e dados de infraestrutura do cliente.
 */
export function errorHandler(err, req, res, next) {
  const isProduction = process.env.NODE_ENV === 'production';
  
  // Log interno estruturado (mantém detalhes nos logs do servidor)
  console.error(`[ERROR] ${req.method} ${req.url}:`, {
    message: err.message,
    stack: err.stack,
    timestamp: new Date().toISOString()
  });

  const statusCode = err.statusCode || err.status || 500;
  
  // Resposta sanitizada enviada ao frontend
  res.status(statusCode).json({
    error: {
      message: isProduction && statusCode === 500 
        ? 'An internal server error occurred. Please contact support.' 
        : err.message,
      code: err.code || 'INTERNAL_ERROR',
      timestamp: new Date().toISOString()
    }
  });
}
