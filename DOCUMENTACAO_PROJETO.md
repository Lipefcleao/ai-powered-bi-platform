# Documentação Explicativa e Registro de Arquitetura do Projeto

> **Objetivo deste documento:** Servir como um resumo explicativo vivo de tudo o que está sendo produzido neste sistema, o motivo das escolhas tecnológicas e o controle de consumo e acessos de APIs (como Azure / OpenAI).

---

## 📌 1. Visão Geral da Arquitetura

O projeto **BI Dashboard** é uma aplicação web voltada para visualização de métricas, inteligência de negócios e relatórios dinâmicos. A arquitetura foi estruturada para ser ágil, moderna e escalável:

```
[ Frontend: React + Vite + Recharts ]  <--->  [ Backend: Node.js + Express ]  <--->  [ Banco de Dados: MySQL ]
                                                        |
                                                        v
                                        [ Integração de IA / APIs Externa ]
```

### Tecnologias Utilizadas e Justificativa

| Tecnologia / Lib | Função no Projeto | Por que escolhemos? |
| :--- | :--- | :--- |
| **React 18** | Framework de Interface (UI) | Permite criar componentes modulares, reativos e de alta performance. |
| **Vite** | Bundler / Server Dev de Frontend | Inicialização instantânea e construção rápida de módulos ES para o navegador. |
| **Express (Node.js)** | Servidor HTTP Backend | Framework minimalista e eficiente para criação de endpoints da API interna. |
| **MySQL2** | Conector de Banco de Dados | Conexão otimizada e performática com a base MySQL relacional. |
| **Recharts** | Biblioteca de Gráficos | Integração nativa com React para renderização limpa e interativa de gráficos estatísticos. |
| **Lucide React** | Conjunto de Ícones | Ícones vetoriais modernos e leves para enriquecer o visual sem pesar no carregamento. |
| **Concurrently** | Ferramenta de Scripts | Permite rodar o frontend (Vite) e backend (Express) juntos com um único comando (`npm run dev`). |

---

## 💰 2. Controle de Custos, Cotas e APIs (Azure)

### 📊 Estado de Custos Globais
- **Desenvolvimento Local:** **R$ 0,00** (Todas as ferramentas, servidores de desenvolvimento e bibliotecas são open-source e gratuitas).
- **Execução de Código/Scripts:** **R$ 0,00** (Roda 100% no seu hardware local).

### 🔑 Ponto de Atenção: Chave de API da Azure
Se o projeto utilizar modelos de linguagem ou serviços cognitivos via Azure OpenAI ou Azure AI:

> [!WARNING]
> **Checklist de Permissão e Revisão da Azure:**
> 1. **Chave Única:** O desenvolvedor/assistente **não tem acesso direto** às suas credenciais da Azure. Elas devem ficar no seu arquivo `.env` local (`AZURE_OPENAI_KEY`, etc.).
> 2. **Alerta de Alterações:** Antes de realizar chamadas de alta relevância (como processamento em lote ou envio de arquivos pesados), este documento e a conversa indicarão a necessidade de verificar:
>    - Cotas de TPM/RPM (Tokens por minuto / Requisições por minuto) no portal Azure.
>    - Limite de consumo monetário configurado na sua assinatura da Azure.
> 3. **Monitoramento:** Caso veja instabilidade ou erro 429 (*Rate Limit Exceeded*), a verificação deve ser feita no painel de gerenciamento do recurso na Azure.

---

## 📝 4. Walkthrough Unificado de Implementação (Passo a Passo)

Nesta seção mantemos um histórico sequencial detalhado de todos os passos executados no projeto, servindo como diário de bordo técnico e guia de auditoria da evolução.

---

### 🔹 Passo 1: Inicialização da Documentação e Governança do Projeto
- **Objetivo:** Estabelecer controle claro de arquitetura, transparência sobre custo R$ 0,00 local e regras de verificação das chaves de API da Azure.
- **Ações Executadas:**
  - Criado o documento [DOCUMENTACAO_PROJETO.md](file:///c:/Users/User/Documents/Est%C3%A1gio/FAST/BI%204/DOCUMENTACAO_PROJETO.md).
  - Mapeadas todas as escolhas de tecnologia (React, Vite, Express, MySQL2, Recharts, Lucide).
  - Estabelecida a rotina de alertas antes de disparar requisições pesadas em APIs da Azure.

---

### 🔹 Passo 2: FASE 0 — Contenção Imediata de Segurança e Hardening
- **Objetivo:** Eliminar vulnerabilidades urgentes de exposição de credenciais e infraestrutura sem impactar regras de negócio ou dashboards.
- **Ações Executadas:**
  1. **Proteção de Segredos e Versionamento:**
     - Criado o arquivo [.gitignore](file:///c:/Users/User/Documents/Est%C3%A1gio/FAST/BI%204/.gitignore) bloqueando `.env`, `node_modules`, `dist`, `metrics.json`, logs e temporários.
     - Criado o [.env.example](file:///c:/Users/User/Documents/Est%C3%A1gio/FAST/BI%204/.env.example) com o template limpo das variáveis sem dados sensíveis.
     - Atualizados os arquivos [.dockerignore](file:///c:/Users/User/Documents/Est%C3%A1gio/FAST/BI%204/.dockerignore) e [.gcloudignore](file:///c:/Users/User/Documents/Est%C3%A1gio/FAST/BI%204/.gcloudignore) para impedir o empacotamento acidental de arquivos locais e credenciais nos deploys do Cloud Run e Docker.
  2. **Hardening da Imagem do Container:**
     - Reescrito o [Dockerfile](file:///c:/Users/User/Documents/Est%C3%A1gio/FAST/BI%204/Dockerfile) utilizando **Node 20 LTS Alpine**.
     - Implementado **multi-stage build** para isolar o processo de compilação do React/Vite e produzir uma imagem final enxuta contendo apenas o backend e os estáticos gerados em `dist/`.
     - Alterado o usuário de execução do container para `USER node` (remoção de privilégios `root`).
  3. **Validação de Ambiente e Fail-Closed:**
     - Criado o módulo [src/config/env.js](file:///c:/Users/User/Documents/Est%C3%A1gio/FAST/BI%204/src/config/env.js) que centraliza e valida a leitura das variáveis de ambiente.
     - Aplicado o princípio *fail-closed*: se faltarem credenciais essenciais de banco de dados (`DB_HOST`, `DB_USER`, `DB_PASSWORD`, `DB_NAME`), a aplicação encerra a inicialização imediatamente com uma mensagem clara no log.
  4. **Sanitização no Tratamento de Erros:**
     - Criado o middleware [src/middleware/errorHandler.js](file:///c:/Users/User/Documents/Est%C3%A1gio/FAST/BI%204/src/middleware/errorHandler.js).
     - Garante que respostas de erro 500 para o navegador omitam stack traces, comandos SQL internos ou detalhes de infraestrutura, mantendo os detalhes técnicos exclusivamente nos logs internos do servidor.

### 🔹 Passo 3: FASE 1 — Fundação do Backend e Pool MySQL
- **Objetivo:** Eliminar conexões isoladas por requisição, separar responsabilidades no backend Node.js, adicionar suporte a probes do Cloud Run e estruturar execução controlada de consultas ao MySQL.
- **Ações Executadas:**
  1. **Separação de Instância e Processo (Express vs Server):**
     - Criado o arquivo [src/app.js](file:///c:/Users/User/Documents/Est%C3%A1gio/FAST/BI%204/src/app.js) contendo a inicialização do Express, middlewares globais e servir dos arquivos estáticos compilados de `dist/`.
     - Atualizado o [src/server.js](file:///c:/Users/User/Documents/Est%C3%A1gio/FAST/BI%204/src/server.js) para atuar como inicializador HTTP enxuto, aplicando o **Graceful Shutdown** (escutando `SIGTERM` e `SIGINT` para fechar conexões HTTP e encerrar o pool do MySQL com segurança).
  2. **Pool de Conexões Reutilizável:**
     - Criado o módulo [src/db/pool.js](file:///c:/Users/User/Documents/Est%C3%A1gio/FAST/BI%204/src/db/pool.js) configurado com `connectionLimit`, `queueLimit` e `keepAlive` para reutilizar conexões ativas na réplica do MySQL.
  3. **Executor Controlado de Queries:**
     - Criado o módulo [src/db/queryExecutor.js](file:///c:/Users/User/Documents/Est%C3%A1gio/FAST/BI%204/src/db/queryExecutor.js) com suporte a *query timeouts* (15s por padrão), parametrização via placeholders e proteção contra estouro de memória (`maxRows` com limitação automática).
  4. **Probes de Monitoramento de Infraestrutura:**
     - Criado o arquivo [src/routes/healthRoutes.js](file:///c:/Users/User/Documents/Est%C3%A1gio/FAST/BI%204/src/routes/healthRoutes.js) disponibilizando os endpoints `/healthz` (liveness do servidor Node) e `/readyz` (readiness da réplica MySQL via `SELECT 1`).

---

### 🔹 Passo 4: FASE 2 — Autenticação Real, Autorização RBAC e Contexto de Tenant
- **Objetivo:** Substituir validações genéricas de senha por um modelo estruturado de identidade (`requestContext.user`), controle de acesso por papéis (`viewer`, `analyst`, `admin`) e garantia de isolamento por tenant.
- **Ações Executadas:**
  1. **Middleware de Rastreio e Contexto:**
     - Criado o módulo [src/middleware/requestContext.js](file:///c:/Users/User/Documents/Est%C3%A1gio/FAST/BI%204/src/middleware/requestContext.js) injetando um `requestId` único por requisição (retornado no cabeçalho `X-Request-ID`).
  2. **Middlewares de Autenticação e Autorização (RBAC):**
     - Criado o arquivo [src/middleware/auth.js](file:///c:/Users/User/Documents/Est%C3%A1gio/FAST/BI%204/src/middleware/auth.js) com as funções:
       - `requireAuthenticatedUser()`: Popula o objeto `user` em `req.requestContext` (com id, email, papéis e tenantId) e falha de forma segura em ambiente de produção se a autenticação for omitida.
       - `requireRole(...allowedRoles)`: Bloqueia acesso com HTTP `403 Forbidden` caso o usuário não possua os papéis exigidos.
       - `requireTenantContext()`: Garante que o escopo de `tenantId` esteja resolvido antes de prosseguir.
  3. **Proteção de Endpoints Administrativos:**
     - Criado o módulo [src/routes/adminRoutes.js](file:///c:/Users/User/Documents/Est%C3%A1gio/FAST/BI%204/src/routes/adminRoutes.js) aplicando obrigatoriamente a regra `requireRole('admin')`.
     - Registrados os middlewares e rotas protegidas no [src/app.js](file:///c:/Users/User/Documents/Est%C3%A1gio/FAST/BI%204/src/app.js).

---

### 🔹 Passo 5: FASE 3 — API de Dashboards v2 com Filtros no Servidor (Piloto FAQ 9)
- **Objetivo:** Encerrar o download de datasets completos para filtragem e agregação no navegador, migrando os cálculos para o MySQL e introduzindo a API de Dashboards v2.
- **Ações Executadas:**
  1. **Validação de Schema de Filtros:**
     - Criado o arquivo [src/schemas/dashboardSchemas.js](file:///c:/Users/User/Documents/Est%C3%A1gio/FAST/BI%204/src/schemas/dashboardSchemas.js) validando intervalo de datas (`startDate <= endDate`), sanitização de IDs e aplicação de paginação (`page`, `pageSize`, `offset`).
  2. **Repositório SQL Parametrizado (Piloto FAQ 9 - Resultado Financeiro):**
     - Criado o módulo [src/repositories/dashboardRepository.js](file:///c:/Users/User/Documents/Est%C3%A1gio/FAST/BI%204/src/repositories/dashboardRepository.js) contendo consultas parametrizadas (*sargables*) divididas em:
       - Resumo de KPIs (Receitas, Despesas e Margem Líquida diretamente no MySQL).
       - Evolução temporal mensal.
       - Tabela paginada com limite de linhas por página.
  3. **Camada de Serviço, Controlador e Rotas da API v2:**
     - Criados os arquivos [src/services/dashboardService.js](file:///c:/Users/User/Documents/Est%C3%A1gio/FAST/BI%204/src/services/dashboardService.js), [src/controllers/dashboardController.js](file:///c:/Users/User/Documents/Est%C3%A1gio/FAST/BI%204/src/controllers/dashboardController.js) e [src/routes/dashboardRoutes.js](file:///c:/Users/User/Documents/Est%C3%A1gio/FAST/BI%204/src/routes/dashboardRoutes.js).
     - Exposta a rota `POST /api/v2/dashboards/:dashboardId/query` com proteção RBAC e validação do backend.
     - Registrado o endpoint no [src/app.js](file:///c:/Users/User/Documents/Est%C3%A1gio/FAST/BI%204/src/app.js).

---

### 🔹 Passo 6: FASE 4 — Limpeza de Arquivos Temporários e Segurança do Chat de IA (QueryPolicyService)
- **Objetivo:** Remover arquivos e scripts temporários (`scratch/`, `tmp/`, `metrics.json`) mantendo o repositório enxuto e seguro, além de implementar o `QueryPolicyService` para validação de comandos SQL gerados por IA.
- **Ações Executadas:**
  1. **Limpeza e Despoluição do Repositório:**
     - Removidos todos os 68 arquivos temporários da pasta `scratch/`.
     - Removidos todos os 19 arquivos de dump e testes da pasta `tmp/`.
     - Removido o arquivo legado `metrics.json`.
  2. **Validador de Segurança de Consultas de IA (QueryPolicyService):**
     - Criado o módulo [src/services/queryPolicyService.js](file:///c:/Users/User/Documents/Est%C3%A1gio/FAST/BI%204/src/services/queryPolicyService.js) bloqueando DDL (`CREATE`, `DROP`, `ALTER`), DML (`INSERT`, `UPDATE`, `DELETE`), tabelas de sistema (`information_schema`), acessos a colunas sensíveis (senhas, salários, tokens), múltiplas instruções por ponto e vírgula e impondo obrigatoriedade de `LIMIT 500`.
  3. **Camada de Serviço e Rotas de Chat de IA (API v2):**
     - Criados os módulos [src/services/semanticQueryService.js](file:///c:/Users/User/Documents/Est%C3%A1gio/FAST/BI%204/src/services/semanticQueryService.js) e [src/routes/chatRoutes.js](file:///c:/Users/User/Documents/Est%C3%A1gio/FAST/BI%204/src/routes/chatRoutes.js).
     - Exposta a rota `POST /api/v2/chat/query` sob as permissões `analyst` e `admin` no [src/app.js](file:///c:/Users/User/Documents/Est%C3%A1gio/FAST/BI%204/src/app.js).

### 🔹 Passo 7: FASE 5 — Cache e Proteção contra Picos de Tráfego (CacheService)
- **Objetivo:** Reduzir a carga de consultas repetidas no MySQL (réplica Azure), acelerar o tempo de resposta do dashboard e proteger a aplicação contra picos de tráfego.
- **Ações Executadas:**
  1. **Serviço de Cache em Memória com TTL:**
     - Criado o arquivo [src/services/cacheService.js](file:///c:/Users/User/Documents/Est%C3%A1gio/FAST/BI%204/src/services/cacheService.js) fornecendo métodos `get`, `set`, `delete` e `getOrSet`.
     - Implementado algoritmo de hash de chave prefixado por `tenantId` (`cache:tenantId:dashboardId:hash`), garantindo isolamento total de cache entre diferentes clientes.
  2. **Integração na API de Dashboards v2:**
     - Atualizado o [src/services/dashboardService.js](file:///c:/Users/User/Documents/Est%C3%A1gio/FAST/BI%204/src/services/dashboardService.js) com um TTL padrão de 5 minutos (300s) para reutilizar resumos e séries de dashboards já processadas.
     - Retornada a flag `meta.cacheHit: true/false` para monitoramento de eficiência da camada de cache no backend.

### 🔹 Passo 8: FASE 6 — Refatoração do Frontend e Arquitetura de Módulos HTTP
- **Objetivo:** Desacoplar o frontend do monólito `FaqTab.jsx`, criar o cliente HTTP centralizado com tratamento de erros, suporte a `AbortSignal` para cancelamento de requisições e eliminar o salvamento de datasets no `localStorage`.
- **Ações Executadas:**
  1. **Cliente HTTP Centralizado e Módulos de API:**
     - Criado o arquivo [src/api/httpClient.js](file:///c:/Users/User/Documents/Est%C3%A1gio/FAST/BI%204/src/api/httpClient.js) fornecendo controle de timeout, captura de `X-Request-ID` do servidor e suporte nativo a `AbortSignal`.
     - Criados os módulos [src/api/dashboardApi.js](file:///c:/Users/User/Documents/Est%C3%A1gio/FAST/BI%204/src/api/dashboardApi.js) e [src/api/chatApi.js](file:///c:/Users/User/Documents/Est%C3%A1gio/FAST/BI%204/src/api/chatApi.js) estruturando o consumo dos endpoints `/api/v2/*`.
  2. **Custom Hook React com Cancelamento de Requisições:**
     - Criado o hook [src/features/dashboards/hooks/useDashboardQuery.js](file:///c:/Users/User/Documents/Est%C3%A1gio/FAST/BI%204/src/features/dashboards/hooks/useDashboardQuery.js) utilizando `AbortController`. Alterações rápidas de filtro cancelam automaticamente requisições anteriores em andamento no navegador.
  3. **Componente Modular de Dashboard Piloto:**
     - Criado o componente [src/features/dashboards/financialResult/FinancialResultDashboard.jsx](file:///c:/Users/User/Documents/Est%C3%A1gio/FAST/BI%204/src/features/dashboards/financialResult/FinancialResultDashboard.jsx) para o **FAQ 9 (Resultado Financeiro)**, consumindo a API v2 paginada com tratamento de estados de UX (`loading`, `error` com `requestId`, `cacheHit` e paginação no backend).

### 🔹 Passo 9: FASE 7 — SQL, Índices e Modelo Analítico (Dimensão Calendário e Baselines)
- **Objetivo:** Projetar a estrutura física da Dimensão Calendário permanente para substituir subqueries dinâmicas lentas e documentar baselines de índices para otimização da réplica MySQL.
- **Ações Executadas:**
  1. **Modelagem Física da Dimensão Calendário:**
     - Criado o arquivo [src/sql/create_dim_calendar.sql](file:///c:/Users/User/Documents/Est%C3%A1gio/FAST/BI%204/src/sql/create_dim_calendar.sql) definindo a tabela permanente `dim_calendar` com chaves temporais e índices de busca.
     - Criado o arquivo [src/sql/seed_dim_calendar.sql](file:///c:/Users/User/Documents/Est%C3%A1gio/FAST/BI%204/src/sql/seed_dim_calendar.sql) contendo a Procedure MySQL segura para popular a tabela de calendário entre os anos 2019 e 2030 de forma automatizada.
  2. **Análise de Performance de Banco de Dados:**
     - Criado o documento [src/sql/explain_baseline.md](file:///c:/Users/User/Documents/Est%C3%A1gio/FAST/BI%204/src/sql/explain_baseline.md) contendo o mapeamento de gargalos e recomendações de índices físicos composta para as tabelas `cashflowitems` e `reportagem` para prevenir escaneamentos totais.

---

### 🔹 Passo 10: FASE 8 — Migração e Consolidação Completa do Resultado Financeiro (FAQ 9 v2)
- **Objetivo:** Concluir a migração completa do dashboard de Resultado Financeiro (FAQ 9), habilitando suporte backend para as visões Compensado, Não Compensado e Competência, com agregação de KPIs, séries temporais para Recharts e tabela paginada no servidor.
- **Ações Executadas:**
  1. **Validação de Schema e Suporte a Visões (`view`):**
     - Atualizado o [src/schemas/dashboardSchemas.js](file:///c:/Users/User/Documents/Est%C3%A1gio/FAST/BI%204/src/schemas/dashboardSchemas.js) para validar e aceitar as views `compensated`, `uncompensated` e `competence`.
     - Atualizado o [src/services/dashboardService.js](file:///c:/Users/User/Documents/Est%C3%A1gio/FAST/BI%204/src/services/dashboardService.js) repassando o parâmetro `view` e gerando chaves de cache isoladas por view.
  2. **Repositório SQL Parametrizado com CTEs Unificadas:**
     - Reescrito o [src/repositories/dashboardRepository.js](file:///c:/Users/User/Documents/Est%C3%A1gio/FAST/BI%204/src/repositories/dashboardRepository.js) integrando as queries completas com CTEs de faturamento, despesas, impostos rateados de vendas e filtros sargáveis.
     - Implementados os métodos `getCompetenceResult` e `getCashResult`, retornando simultaneamente resumo de KPIs (`summary`), dados temporais para gráficos (`series`) e listagem paginada (`rows`).
  3. **Refatoração do Frontend e UX do Dashboard:**
     - Atualizado o hook [src/features/dashboards/hooks/useDashboardQuery.js](file:///c:/Users/User/Documents/Est%C3%A1gio/FAST/BI%204/src/features/dashboards/hooks/useDashboardQuery.js) com suporte ao parâmetro de view e cancelamento automático de requisições pendentes via `AbortController`.
     - Redesenhado o componente [src/features/dashboards/financialResult/FinancialResultDashboard.jsx](file:///c:/Users/User/Documents/Est%C3%A1gio/FAST/BI%204/src/features/dashboards/financialResult/FinancialResultDashboard.jsx) com abas de seleção de visão, gráficos de área Recharts, cards de KPI dinâmicos e tabela paginada no servidor.
     - Integrado o novo componente na aba de ID 9 em [src/components/FaqTab.jsx](file:///c:/Users/User/Documents/Est%C3%A1gio/FAST/BI%204/src/components/FaqTab.jsx).
  4. **Validação e Build:**
     - Testadas as três visões via script [scripts/debugFinancialResult.js](file:///c:/Users/User/Documents/Est%C3%A1gio/FAST/BI%204/scripts/debugFinancialResult.js) com sucesso direto no MySQL réplica da Azure.
     - Executado o `npm run build` confirmando compilação do bundle sem erros.

---

### 🔹 Passo 11: FASE 9 — Migração e Consolidação da Utilização de Horas (FAQ 10 v2)
- **Objetivo:** Concluir a migração do painel de Utilização de Horas (FAQ 10) para a API v2, adicionando suporte backend para filtros sargables por intervalo dinâmico de datas, colaborador e paginação no MySQL.
- **Ações Executadas:**
  1. **Esquema de Filtros e Validação:**
     - Atualizado o [src/schemas/dashboardSchemas.js](file:///c:/Users/User/Documents/Est%C3%A1gio/FAST/BI%204/src/schemas/dashboardSchemas.js) para validar a view `utilization` e filtros de `year`, `month` e `collaborator`.
     - Atualizado o [src/services/dashboardService.js](file:///c:/Users/User/Documents/Est%C3%A1gio/FAST/BI%204/src/services/dashboardService.js) mapeando e roteando as requisições de FAQ 10 para o repositório.
  2. **Queries Otimizadas de Utilização e Projetos:**
     - Implementado o método `getHoursUtilization` em [src/repositories/dashboardRepository.js](file:///c:/Users/User/Documents/Est%C3%A1gio/FAST/BI%204/src/repositories/dashboardRepository.js).
     - Parametrizada a CTE de calendário com o `startDate` e limite de dias calculados dinamicamente no backend, reduzindo o escaneamento de linhas desnecessárias.
     - Aplicadas as condições de membros ativos (`DataDesativacao IS NULL`) nas queries.
  3. **Interface React Premium:**
     - Criado o componente modular [HoursUtilizationDashboard.jsx](file:///c:/Users/User/Documents/Est%C3%A1gio/FAST/BI%204/src/features/dashboards/hoursUtilization/HoursUtilizationDashboard.jsx) com seletores de período, gráficos de barras de utilização e rosca de projetos, e tabelas com paginação controlada pelo servidor.
     - Integrado o novo componente na FAQ de ID 10 em [src/components/FaqTab.jsx](file:///c:/Users/User/Documents/Est%C3%A1gio/FAST/BI%204/src/components/FaqTab.jsx).
  4. **Validação:**
     - Testado localmente via script [scripts/debugHoursUtilization.js](file:///c:/Users/User/Documents/Est%C3%A1gio/FAST/BI%204/scripts/debugHoursUtilization.js) contra o banco da Azure com sucesso.
     - Build de produção do Vite completado sem erros.

---

### 🔹 Passo 12: FASE 10 — Migração e Consolidação de Projetos (FAQ 7 v2)
- **Objetivo:** Concluir a migração completa do dashboard de Projetos (FAQ 7) para a API v2, adicionando suporte backend para filtros qualitativos complexos de dimensões, isolamento de sub-abas por views e paginação no MySQL.
- **Ações Executadas:**
  1. **Esquema de Validação e Roteamento:**
     - Atualizado o [src/schemas/dashboardSchemas.js](file:///c:/Users/User/Documents/Est%C3%A1gio/FAST/BI%204/src/schemas/dashboardSchemas.js) suportando as views `status`, `tempo_projeto`, `tempo_etapa`, `tempo_tarefa` e filtros de busca quali (`clientName`, `projectName`, `projectStatus`, `responsibleName`).
     - Roteadas as chamadas de FAQ 7 no [src/services/dashboardService.js](file:///c:/Users/User/Documents/Est%C3%A1gio/FAST/BI%204/src/services/dashboardService.js).
  2. **Repositorio com Views Isoladas e Paginadas:**
     - Implementado o método `getProjectsDashboard` em [src/repositories/dashboardRepository.js](file:///c:/Users/User/Documents/Est%C3%A1gio/FAST/BI%204/src/repositories/dashboardRepository.js).
     - Dividida a lógica de busca física no banco de dados de acordo com a view ativa selecionada pelo usuário para máxima performance.
     - Populadas as listas de opções dinâmicas dos filtros em paralelo com `Promise.all` assíncrono.
     - Adicionado o cálculo do rowspan para agrupamento de cliente diretamente no backend.
  3. **Interface React Premium:**
     - Criado o componente modular [ProjectsDashboard.jsx](file:///c:/Users/User/Documents/Est%C3%A1gio/FAST/BI%204/src/features/dashboards/projects/ProjectsDashboard.jsx) contendo barra de sub-abas, filtros sargables dinâmicos reativos, gráficos de barras de status, e tabelas individuais paginadas pelo servidor.
     - Integrado o novo componente na FAQ de ID 7 em [src/components/FaqTab.jsx](file:///c:/Users/User/Documents/Est%C3%A1gio/FAST/BI%204/src/components/FaqTab.jsx).
  4. **Validação:**
     - Executado o script de depuração [scripts/debugProjects.js](file:///c:/Users/User/Documents/Est%C3%A1gio/FAST/BI%204/scripts/debugProjects.js) testando com sucesso absoluto todas as 4 views no banco da Azure.
     - Build do Vite (`npm run build`) validado sem erros de bundle.

---

### 🔹 Passo 13: FASE 11 — Migração e Consolidação de Rateio (FAQ 8 v2)
- **Objetivo:** Concluir a migração completa do dashboard de Rateio (FAQ 8) para a API v2, adicionando suporte backend para filtros sargables por período e filtros qualitativos de dimensão (Origem, Destino e Método) na memória, além de paginação e cálculo de rowspans de subtotal no servidor.
- **Ações Executadas:**
  1. **Esquema de Validação e Roteamento:**
     - Atualizado o [src/schemas/dashboardSchemas.js](file:///c:/Users/User/Documents/Estágio/FAST/BI%204/src/schemas/dashboardSchemas.js) suportando a view `apportionment` e os filtros de string `ratedProjectName`, `recipientProjectName` e `rateioMethod`.
     - Roteadas as chamadas de FAQ 8 no [src/services/dashboardService.js](file:///c:/Users/User/Documents/Estágio/FAST/BI%204/src/services/dashboardService.js).
  2. **Repositório SQL Parametrizado:**
     - Implementado o método `getApportionmentDashboard` em [src/repositories/dashboardRepository.js](file:///c:/Users/User/Documents/Estágio/FAST/BI%204/src/repositories/dashboardRepository.js).
     - Aplicado o filtro de datas por inteiros de `Ano` e `Mes` sargáveis, garantindo performance e isolando os filtros qualitativos na memória para preservar a integridade matemática das CTEs de rateio.
     - Processadas as listas de opções de filtros dinâmicos de forma a otimizar a requisição.
  3. **Interface React Premium:**
     - Criado o componente modular [ApportionmentDashboard.jsx](file:///c:/Users/User/Documents/Estágio/FAST/BI%204/src/features/dashboards/apportionment/ApportionmentDashboard.jsx) contendo seletores de período e filtros dinâmicos, gráficos de barras Recharts de rateio acumulado por projeto de origem e tabela com rowspan vertical e destaque para linhas de subtotal.
     - Integrado o novo componente na FAQ de ID 8 em [src/components/FaqTab.jsx](file:///c:/Users/User/Documents/Estágio/FAST/BI%204/src/components/FaqTab.jsx).
  4. **Validação:**
     - Criado o script de depuração [scripts/debugApportionment.js](file:///c:/Users/User/Documents/Estágio/FAST/BI%204/scripts/debugApportionment.js) testando com sucesso a paridade e integridade dos dados diretamente contra o MySQL da Azure.
     - Build do Vite (`npm run build`) validado sem erros de bundle.

---

### 🔹 Passo 14: FASE 12 — Migração e Consolidação de Lucratividade (FAQ 5 v2)
- **Objetivo:** Concluir a migração do dashboard de Lucratividade (FAQ 5) para a API v2, adicionando suporte para as views `profitability` (Resultado do projeto) e `overdue` (Contas em atraso) com paginação e filtros dinâmicos server-side.
- **Ações Executadas:**
  1. **Esquema de Validação e Roteamento:**
     - Adicionadas as views `profitability` e `overdue` em [src/schemas/dashboardSchemas.js](file:///c:/Users/User/Documents/Estágio/FAST/BI%204/src/schemas/dashboardSchemas.js).
     - Roteadas as chamadas de lucratividade no [src/services/dashboardService.js](file:///c:/Users/User/Documents/Estágio/FAST/BI%204/src/services/dashboardService.js).
  2. **Repositório SQL Parametrizado:**
     - Criado o método `getProfitabilityDashboard` em [src/repositories/dashboardRepository.js](file:///c:/Users/User/Documents/Estágio/FAST/BI%204/src/repositories/dashboardRepository.js).
     - Implementado filtro temporal sargable com conversão de datas para as CTEs de receitas, despesas e rateios da view `profitability`.
     - Implementado o subselect dinâmico para filtragem por cliente/projeto e paginação em ambas as views.
     - Extraídas as opções distintas de filtros para dropdowns.
  3. **Interface React Premium:**
     - Criado o componente modular [ProfitabilityDashboard.jsx](file:///c:/Users/User/Documents/Estágio/FAST/BI%204/src/features/dashboards/profitability/ProfitabilityDashboard.jsx) com abas internas, cards de KPI dinâmicos por aba, tabelas detalhadas e paginação de dados integrada com o servidor.
     - Integrado em [FaqTab.jsx](file:///c:/Users/User/Documents/Estágio/FAST/BI%204/src/components/FaqTab.jsx).
  4. **Validação:**
     - Desenvolvido o script de depuração [scripts/debugProfitability.js](file:///c:/Users/User/Documents/Estágio/FAST/BI%204/scripts/debugProfitability.js) e validada a paridade de dados diretamente contra o MySQL.
     - Executado o build do Vite (`npm run build`) com sucesso sem erros.

---

### 🔹 Passo 15: FASE 13 — Migração e Consolidação Comercial (FAQ 2 v2)
- **Objetivo:** Concluir a migração do dashboard Comercial (FAQ 2) para a API v2, fornecendo dados analíticos para os gráficos de funil (vendas e orçamentos), vendas anuais, vencimentos e recebimentos compensados com performance aprimorada e consultas sargables.
- **Ações Executadas:**
  1. **Esquema de Validação e Roteamento:**
     - Adicionadas as views `commercial` e `financial_flow` em [src/schemas/dashboardSchemas.js](file:///c:/Users/User/Documents/Estágio/FAST/BI%204/src/schemas/dashboardSchemas.js).
     - Roteadas as chamadas comerciais no [src/services/dashboardService.js](file:///c:/Users/User/Documents/Estágio/FAST/BI%204/src/services/dashboardService.js).
  2. **Repositório SQL Parametrizado:**
     - Criado o método `getCommercialDashboard` em [src/repositories/dashboardRepository.js](file:///c:/Users/User/Documents/Estágio/FAST/BI%204/src/repositories/dashboardRepository.js).
     - Implementados filtros temporais sargables para as tabelas `servicesales` e `cashflowitems` no MySQL.
     - Processados os KPIs e a formatação das séries temporais no backend para os 5 gráficos interativos do painel.
  3. **Interface React Premium:**
     - Desenvolvido o componente modular [CommercialDashboard.jsx](file:///c:/Users/User/Documents/Estágio/FAST/BI%204/src/features/dashboards/commercial/CommercialDashboard.jsx) contendo 4 cards de KPIs premium e 5 gráficos Recharts interativos, com estilos Tailwind e formatação monetária refinada.
     - Integrado em [FaqTab.jsx](file:///c:/Users/User/Documents/Estágio/FAST/BI%204/src/components/FaqTab.jsx).
  4. **Validação:**
     - Desenvolvido o script de depuração [scripts/debugCommercial.js](file:///c:/Users/User/Documents/Estágio/FAST/BI%204/scripts/debugCommercial.js) e atestada a integridade e paridade dos dados (ex: `102` vendas no ano de 2024 totalizando `R$ 956.786,61`).
     - Build de produção do Vite (`npm run build`) validado sem erros de compilação.

---

### 🔹 Passo 16: FASE 14 — Migração e Consolidação de Despesas x Fornecedores (FAQ 3 v2)
- **Objetivo:** Concluir a migração do dashboard de Despesas x Fornecedores (FAQ 3) para a API v2, fornecendo dados analíticos para os gráficos de evolução mensal por fornecedor (barras empilhadas), ranking de maiores despesas (barras simples) e tabela de lançamentos detalhada e paginada.
- **Ações Executadas:**
  1. **Esquema de Validação e Roteamento:**
     - Adicionada a view `expenses` em [src/schemas/dashboardSchemas.js](file:///c:/Users/User/Documents/Estágio/FAST/BI%204/src/schemas/dashboardSchemas.js).
     - Suportados os novos filtros qualitativos `supplierName` (fornecedor), `bankAccountName` (conta bancária) e `status` (compensado ou não).
     - Roteadas as chamadas de despesas no [src/services/dashboardService.js](file:///c:/Users/User/Documents/Estágio/FAST/BI%204/src/services/dashboardService.js).
  2. **Repositório SQL Parametrizado:**
     - Criado o método `getExpensesDashboard` em [src/repositories/dashboardRepository.js](file:///c:/Users/User/Documents/Estágio/FAST/BI%204/src/repositories/dashboardRepository.js).
     - Implementados filtros temporais sargables para a tabela `cashflowitems` no MySQL com `Date` e `DueDate`.
     - Envolvida a query em subselect para filtros dinâmicos qualitativos.
     - Processados os KPIs e as séries de dados no Node.js.
  3. **Interface React Premium:**
     - Desenvolvido o componente modular [ExpensesDashboard.jsx](file:///c:/Users/User/Documents/Estágio/FAST/BI%204/src/features/dashboards/expenses/ExpensesDashboard.jsx) contendo 2 cards de KPIs premium, 2 gráficos Recharts interativos e uma tabela detalhada com paginação integrada server-side.
     - Integrado em [FaqTab.jsx](file:///c:/Users/User/Documents/Estágio/FAST/BI%204/src/components/FaqTab.jsx).
  4. **Validação:**
     - Desenvolvido o script de depuração [scripts/debugExpenses.js](file:///c:/Users/User/Documents/Estágio/FAST/BI%204/scripts/debugExpenses.js) e atestada a integridade e paridade dos dados (ex: `R$ 175.247,58` de despesas totais).
     - Build de produção do Vite (`npm run build`) validado com sucesso.

---

### 🔹 Passo 17: FASE 15 — Correção de Bootstrap, Arquitetura Enxuta de Inicialização e Segurança RBAC
- **Objetivo:** Resolver erros de sintaxe e declarações duplicadas no servidor, desacoplar rotas legadas, unificar a Basic Auth e reforçar a segurança (RBAC) do dashboard de Gasto com Pessoal (FAQ 4) contra acessos indevidos a salários.
- **Ações Executadas:**
  1. **Separação de Rotas Legadas para Retrocompatibilidade:**
     - Criado o roteador [src/routes/legacyRoutes.js](file:///c:/Users/User/Documents/Estágio/FAST/BI%204/src/routes/legacyRoutes.js) movendo os endpoints antigos de chat de IA (`/api/chat`) e FAQs antigas (`/api/faq/:id`).
     - Aplicado o middleware unificado `requireAuthenticatedUser`, removendo a lógica duplicada de Basic Auth do servidor legado.
  2. **Consolidação das Métricas Administrativas:**
     - Atualizado o roteador [src/routes/adminRoutes.js](file:///c:/Users/User/Documents/Estágio/FAST/BI%204/src/routes/adminRoutes.js) para integrar o carregamento, exibição e reset do arquivo `metrics.json` contendo o consumo de tokens de IA, permitindo a perfeita exibição do painel administrativo.
  3. **Correção de Bootstrap e Hardening do Servidor:**
     - Reescrito o [src/server.js](file:///c:/Users/User/Documents/Estágio/FAST/BI%204/src/server.js) contendo apenas o `app.listen` e Graceful Shutdown, resolvendo o erro fatal de duplicidade de declaração de variável (`SyntaxError: Identifier 'app' has already been declared`).
     - Corrigido o middleware [src/middleware/requestContext.js](file:///c:/Users/User/Documents/Estágio/FAST/BI%204/src/middleware/requestContext.js) removendo importações nomeadas inexistentes do módulo nativo `'crypto'` e simplificando o código com `randomUUID`.
  4. **Controle de Acesso RBAC Granular no Dashboard de Pessoal (FAQ 4):**
     - Refatorado o roteador [src/routes/dashboardRoutes.js](file:///c:/Users/User/Documents/Estágio/FAST/BI%204/src/routes/dashboardRoutes.js) implementando verificação de rota dinâmica que identifica se o `dashboardId` corresponde a dados salariais (FAQ 4 - Gasto com Pessoal).
     - Restringido o acesso à FAQ 4 estritamente aos papéis `analyst` e `admin`, mantendo as demais rotas acessíveis por usuários básicos com papel `viewer`.
  5. **Validação:**
     - Criado o script de teste automatizado [scratch/test_api.js](file:///C:/Users/User/.gemini/antigravity-ide/brain/02398703-f513-4a73-be7f-8a1d1726ead6/scratch/test_api.js) validando todas as 7 rotas de segurança (acessos permitidos de admin, bloqueios 403 de viewer, 401 não autenticados e rotas administrativas).

---

*Este walkthrough continuará acumulando os passos das próximas fases à medida que executarmos.*











