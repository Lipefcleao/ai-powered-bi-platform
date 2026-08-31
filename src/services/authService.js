import crypto from 'crypto';
import { env } from '../config/env.js';

const JWT_SECRET = env.auth?.jwtSecret || 'flowup_default_secret_key_change_in_production_123';

/**
 * Utilitário nativo para emissão e validação de tokens JWT (HS256) sem dependências externas.
 */
export class AuthService {
  /**
   * Gera um token JWT compact com expiração padrão de 24 horas.
   */
  static generateToken(payload) {
    const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
    const payloadB64 = Buffer.from(JSON.stringify({
      ...payload,
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + (24 * 60 * 60) // Expira em 24 horas
    })).toString('base64url');
    
    const signature = crypto.createHmac('sha256', JWT_SECRET)
      .update(`${header}.${payloadB64}`)
      .digest('base64url');
      
    return `${header}.${payloadB64}.${signature}`;
  }

  /**
   * Valida a assinatura do token e verifica se ele não está expirado.
   * Retorna o payload decodificado ou null se inválido/expirado.
   */
  static verifyToken(token) {
    if (!token || typeof token !== 'string') return null;
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    
    const [header, payload, signature] = parts;
    const expectedSignature = crypto.createHmac('sha256', JWT_SECRET)
      .update(`${header}.${payload}`)
      .digest('base64url');
      
    if (signature !== expectedSignature) return null;
    
    try {
      const decodedPayload = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'));
      // Verifica expiração
      if (decodedPayload.exp && decodedPayload.exp < Math.floor(Date.now() / 1000)) {
        return null; // Token expirado
      }
      return decodedPayload;
    } catch (e) {
      return null;
    }
  }
}
