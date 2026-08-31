WITH
-- ============================================================
-- 1) Total Real do Projeto (mantido)
-- ============================================================
TotalProjetoBanco AS (
    SELECT 
        COALESCE(b.CostCenterId, r.Projeto_Id) AS ProjectId,
        SUM(r.HorasTrabalhadas) AS HorasTotais
    FROM reportagem r
    LEFT JOIN tasks t ON r.Task_Id = t.Id
    LEFT JOIN boards b ON t.BoardId = b.Id
    GROUP BY 1
),

-- ============================================================
-- 2) Dados de Tarefas ATIVAS (SEM RATEIO)
-- ============================================================
DadosAtivos AS (
    SELECT 
        c.Id AS ProjectId,
        c.Name AS ProjetoNome,
        b.Name AS EtapaNome,
        t.Title AS TarefaNome,

        COALESCE(m.Nome, 'Tarefa sem responsável') AS Responsavel,

        -- Estimativa TOTAL da tarefa (sem rateio)
        t.EstimatedEffort AS EstimativaTarefa,

        -- Total reportado na tarefa
        IFNULL((
            SELECT SUM(r.HorasTrabalhadas)
            FROM reportagem r
            WHERE r.Task_Id = t.Id
        ), 0) AS ReportagemTarefa

    FROM tasks t
    JOIN boards b ON t.BoardId = b.Id
    JOIN costcenters c ON b.CostCenterId = c.Id
    LEFT JOIN membro m ON t.UserId = m.Id
    WHERE t.Active = 1
),

-- ============================================================
-- 3) Tarefas EXCLUÍDAS (mantido)
-- ============================================================
DadosExcluidos AS (
    SELECT 
        COALESCE(b.CostCenterId, r.Projeto_Id) AS ProjectId,
        c.Name AS ProjetoNome,
        '(Histórico de Tarefas Removidas)' AS EtapaNome,
        '(Horas em tarefas excluídas)' AS TarefaNome,

        COALESCE(m.Nome, 'Tarefa sem responsável') AS Responsavel,

        0 AS EstimativaTarefa,
        SUM(r.HorasTrabalhadas) AS ReportagemTarefa
    FROM reportagem r
    INNER JOIN tasks t ON r.Task_Id = t.Id
    LEFT JOIN boards b ON t.BoardId = b.Id
    JOIN costcenters c ON COALESCE(b.CostCenterId, r.Projeto_Id) = c.Id
    LEFT JOIN membro m ON t.UserId = m.Id
    WHERE t.Active = 0
    GROUP BY 1,2,3,4,5
),

-- ============================================================
-- 4) Lançamentos DIRETOS no projeto (mantido)
-- ============================================================
DadosDiretos AS (
    SELECT 
        r.Projeto_Id AS ProjectId,
        c.Name AS ProjetoNome,
        '(Lançamentos Diretos de Horas no Projeto)' AS EtapaNome,
        '(Horas reportadas sem tarefa vinculada)' AS TarefaNome,

        'Sem responsável, horas lançadas diretamente no projeto' AS Responsavel,

        0 AS EstimativaTarefa,
        SUM(r.HorasTrabalhadas) AS ReportagemTarefa
    FROM reportagem r
    JOIN costcenters c ON r.Projeto_Id = c.Id
    WHERE r.Task_Id IS NULL
    GROUP BY 1,2,3
),

-- ============================================================
-- 5) Consolidação
-- ============================================================
Consolidado AS (
    SELECT * FROM DadosAtivos
    UNION ALL
    SELECT * FROM DadosExcluidos
    UNION ALL
    SELECT * FROM DadosDiretos
)

-- ============================================================
-- 6) Resultado Final (SEM PERÍODO)
-- ============================================================
SELECT 
    TRIM(C.ProjetoNome) AS Projeto,

    -- Projeto
    ROUND(SUM(C.EstimativaTarefa) OVER (PARTITION BY C.ProjectId), 2) AS EstimativaProjeto,
    ROUND(IFNULL(TPB.HorasTotais, 0), 2) AS ReportagemProjeto,

    -- Etapa
    C.EtapaNome AS Etapa,
    ROUND(SUM(C.EstimativaTarefa) OVER (PARTITION BY C.ProjectId, C.EtapaNome), 2) AS EstimativaEtapa,
    ROUND(SUM(C.ReportagemTarefa) OVER (PARTITION BY C.ProjectId, C.EtapaNome), 2) AS ReportagemEtapa,

    -- Tarefa
    C.TarefaNome AS Tarefa,
    ROUND(C.EstimativaTarefa, 2) AS EstimativaTarefa,
    ROUND(C.ReportagemTarefa, 2) AS ReportagemTarefa,

    C.Responsavel AS ResponsavelTarefa,


    ROUND(SUM(C.EstimativaTarefa) OVER (
        PARTITION BY C.ProjectId, C.EtapaNome, C.Responsavel
    ), 2) AS EstimativaResponsavel,

    ROUND(SUM(C.ReportagemTarefa) OVER (
        PARTITION BY C.ProjectId, C.EtapaNome, C.Responsavel
    ), 2) AS ReportagemResponsavel

FROM Consolidado C

LEFT JOIN TotalProjetoBanco TPB
    ON C.ProjectId = TPB.ProjectId

ORDER BY Projeto, Etapa, Tarefa;