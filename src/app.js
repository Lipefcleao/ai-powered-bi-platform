import express from 'express';
import cors from 'cors';
import path from 'path';
import healthRoutes from './routes/healthRoutes.js';
import adminRoutes from './routes/adminRoutes.js';
import dashboardRoutes from './routes/dashboardRoutes.js';
import chatRoutes from './routes/chatRoutes.js';
import legacyRoutes from './routes/legacyRoutes.js';
import authRoutes from './routes/authRoutes.js';
import { requestContextMiddleware } from './middleware/requestContext.js';
import { errorHandler } from './middleware/errorHandler.js';

const app = express();

app.use(cors());
app.use(express.json());

// Injetar contexto de requisição (requestId e user)
app.use(requestContextMiddleware);

// Probes de observabilidade (Cloud Run / Load Balancer)
app.use('/', healthRoutes);

// Rotas de Autenticação (Aberto para login)
app.use('/api', authRoutes);

// API v2 de Dashboards com filtros e paginação no servidor
app.use('/api/v2/dashboards', dashboardRoutes);

// API v2 de Chat de IA seguro e sanitizado
app.use('/api/v2/chat', chatRoutes);

// Rotas Administrativas (Protegidas por RBAC 'admin')
app.use('/api/admin', adminRoutes);

// Rotas Legadas (Para retrocompatibilidade)
app.use('/', legacyRoutes);

// Servir arquivos estáticos do build frontend (React/Vite em producao)
const distPath = path.resolve(process.cwd(), 'dist');
app.use(express.static(distPath));

// Handler centralizado de tratamento de erros
app.use(errorHandler);

export default app;
