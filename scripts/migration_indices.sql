-- =========================================================================
-- Script de Migração: Otimização de Performance de BI (Índices Físicos)
-- Data: 12/08/2026
-- Objetivo: Criar índices compostos analíticos para acelerar agregações do dashboard
--           e evitar escaneamento total (Full Table Scan) sob concorrência.
-- =========================================================================

-- 1. Índice para otimização da FAQ 9 (Resultado Financeiro) na tabela cashflowitems
--    Melhora consultas que filtram por itens ativos, intervalo de data de competência e centros de custo.
CREATE INDEX idx_cashflow_active_competence 
ON cashflowitems (Active, CompetenceDate, CostCenter_Id);

-- 2. Índice para otimização da FAQ 10 (Utilização de Horas) na tabela reportagem
--    Acelera agregações de esforço operacional filtradas por dia e identificadores de membros.
CREATE INDEX idx_reportagem_dia_membro 
ON reportagem (Dia, Membro_Id);

-- 3. Índice complementar opcional para a tabela de histórico de tarefas (taskhistories)
--    Otimiza a busca por status de transições de tarefas analíticas
CREATE INDEX idx_taskhistories_task_property 
ON taskhistories (TaskId, PropertyName(50));
