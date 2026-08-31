import { Router } from 'express';
import { env } from '../config/env.js';
import { AuthService } from '../services/authService.js';

const router = Router();

/**
 * POST /api/login
 * Realiza autenticação via senha e retorna o token JWT assinado.
 */
router.post('/login', async (req, res) => {
  const { username, password } = req.body;
  const ACCESS_PASSWORD = env.auth?.accessPassword;

  if (!password) {
    return res.status(400).json({
      error: {
        code: 'BAD_REQUEST',
        message: 'A senha é obrigatória.'
      }
    });
  }

  // Valida a senha contra a senha de acesso global
  const isDemoPassword = env.demoMode && password === 'demo';
  if (password === ACCESS_PASSWORD || isDemoPassword) {
    const login = username || 'user';
    const isAdmin = login === 'admin';
    
    // Injeta papéis de acordo com o username
    const roles = isAdmin ? ['viewer', 'analyst', 'admin'] : ['viewer'];

    const userPayload = {
      id: login,
      email: `${login}@bi.internal`,
      roles,
      tenantId: 'default_tenant',
      grantedCompanyIds: []
    };

    const token = AuthService.generateToken(userPayload);

    return res.json({
      token,
      user: userPayload
    });
  }

  return res.status(401).json({
    error: {
      code: 'UNAUTHORIZED',
      message: 'Senha incorreta. Acesso negado.'
    }
  });
});

export default router;
