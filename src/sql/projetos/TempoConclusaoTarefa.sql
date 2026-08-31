WITH TaskCompletion AS (
    SELECT 
        th.TaskId,
        MAX(th.Timestamp) AS Fim
    FROM taskhistories th
    JOIN status os ON th.OldValue = os.Id
    JOIN status ns ON th.NewValue = ns.Id
    JOIN statustemplates ost ON os.TemplateId = ost.Id
    JOIN statustemplates nst ON ns.TemplateId = nst.Id
    WHERE 
        th.PropertyName LIKE '%StatusId%' 
        AND ost.IsFinal = 0
        AND nst.IsFinal = 1
        AND th.OldValue IS NOT NULL
    GROUP BY th.TaskId
),

ProjetoResponsavel AS (
    SELECT 
        po.ProjectId,
        m.Nome AS ResponsavelProjeto
    FROM projectowners po
    JOIN membro m ON m.Id = po.UserId
),

ProjetoClassificado AS (
    SELECT
        p.Id AS ProjetoId,
        p.DataInicial AS ProjetoInicio,
        p.DataFinal AS ProjetoPrazo,
        p.RealEndDate AS ProjetoFim
    FROM projeto p
),

TarefaClassificada AS (
    SELECT 
        c.Name AS Cliente,
        cc.Name AS Projeto,
        b.Name AS Etapa,
        t.Id AS TaskId,
        t.Title AS TituloTarefa,

        pr.ResponsavelProjeto,
        mt.Nome AS ResponsavelTarefa,

        GROUP_CONCAT(DISTINCT tg.Name ORDER BY tg.Name SEPARATOR ', ') AS Tag,

        pc.ProjetoInicio,
        pc.ProjetoPrazo,
        pc.ProjetoFim,

        b.StartDate AS EtapaInicio,
        b.EndDate AS EtapaPrazo,
        b.RealEndDate AS EtapaFim,

        t.CreationDate AS TarefaCriacao,
        t.StartDate AS TarefaInicio,
        t.EndDate AS TarefaPrazo,
        tc.Fim AS TarefaFim

    FROM tasks t
    LEFT JOIN membro mt ON t.UserId = mt.Id
    JOIN boards b ON t.BoardId = b.Id
    JOIN costcenters cc ON b.CostCenterId = cc.Id
    JOIN projeto p ON cc.Id = p.Id

    LEFT JOIN ProjetoClassificado pc ON pc.ProjetoId = p.Id
    LEFT JOIN ProjetoResponsavel pr ON pr.ProjectId = p.Id
    LEFT JOIN clients c ON cc.Client_Id = c.Id

    LEFT JOIN tagtasks tt ON t.Id = tt.Task_Id
    LEFT JOIN tags tg ON tt.Tag_Id = tg.Id

    LEFT JOIN TaskCompletion tc ON t.Id = tc.TaskId

    WHERE p.Ativo = 1 AND t.Active = 1

    GROUP BY 
        t.Id,
        c.Name,
        cc.Name,
        b.Name,
        t.Title,
        pr.ResponsavelProjeto,
        mt.Nome,
        pc.ProjetoInicio,
        pc.ProjetoPrazo,
        pc.ProjetoFim,
        b.StartDate,
        b.EndDate,
        b.RealEndDate,
        t.CreationDate,
        t.StartDate,
        t.EndDate,
        tc.Fim
)

SELECT 
    -- PROJETO
    Cliente,
    Projeto,
    COALESCE(ResponsavelProjeto, 'Sem responsável') AS ResponsavelProjeto,
    ProjetoInicio,
    ProjetoPrazo,
    ProjetoFim,

    -- STATUS PROJETO
    CASE 
        WHEN ProjetoPrazo IS NULL THEN 'Sem prazo'

        WHEN ProjetoFim IS NOT NULL THEN
            CASE 
                WHEN ProjetoFim > ProjetoPrazo THEN 'Concluído com atraso'
                ELSE 'Concluído no prazo'
            END

        WHEN ProjetoPrazo < CURDATE() THEN 'Atrasado'
        WHEN DATEDIFF(ProjetoPrazo, CURDATE()) <= 15 THEN 'Prazo próximo'
        ELSE 'No prazo'
    END AS StatusProjeto,

    -- ETAPA
    Etapa,
    EtapaInicio,
    EtapaPrazo,
    EtapaFim,

    -- STATUS ETAPA
    CASE 
        WHEN EtapaPrazo IS NULL THEN 'Sem prazo'

        WHEN EtapaFim IS NOT NULL THEN
            CASE 
                WHEN EtapaFim > EtapaPrazo THEN 'Concluído com atraso'
                ELSE 'Concluído no prazo'
            END

        WHEN EtapaPrazo < CURDATE() THEN 'Atrasado'
        WHEN DATEDIFF(EtapaPrazo, CURDATE()) <= 7 THEN 'Prazo próximo'
        ELSE 'No prazo'
    END AS StatusEtapa,

    -- TAREFA
    TituloTarefa,
    COALESCE(ResponsavelTarefa, 'Sem responsável') AS ResponsavelTarefa,
    Tag,
    TarefaCriacao,
    TarefaInicio,
    TarefaPrazo,
    TarefaFim,

    -- STATUS TAREFA
    CASE 
        WHEN TarefaPrazo IS NULL THEN 'Sem prazo'

        WHEN TarefaFim IS NOT NULL THEN
            CASE 
                WHEN TarefaFim > TarefaPrazo THEN 'Concluído com atraso'
                ELSE 'Concluído no prazo'
            END

        WHEN TarefaPrazo < CURDATE() THEN 'Atrasado'
        WHEN DATEDIFF(TarefaPrazo, CURDATE()) <= 3 THEN 'Prazo próximo'
        ELSE 'No prazo'
    END AS StatusTarefa,

    -- TEMPO
    CASE 
        WHEN TarefaInicio IS NULL OR TarefaFim IS NULL THEN NULL
        ELSE DATEDIFF(TarefaFim, TarefaInicio) + 1
    END AS TempoTarefaDias

FROM TarefaClassificada

ORDER BY 
    Projeto,
    Etapa,
    TituloTarefa;