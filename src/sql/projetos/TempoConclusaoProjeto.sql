WITH ProjetoClassificado AS (
    SELECT
        p.Nome AS Projeto,
        p.DataInicial AS ProjetoInicio,
        p.DataFinal AS ProjetoPrazo,
        p.RealEndDate AS ProjetoFim,
        p.Id AS ProjetoId,
        c.Name AS Cliente
    FROM projeto p
    JOIN costcenters cc ON p.Id = cc.Id
    LEFT JOIN clients c ON cc.Client_Id = c.Id
)

SELECT
    -- CONTEXTO
    pc.Cliente,
    pc.Projeto,

    -- RESPONSÁVEL
    COALESCE(m.Nome, 'Sem responsável') AS ResponsavelProjeto,

    -- DATAS
    pc.ProjetoInicio,
    pc.ProjetoPrazo,
    pc.ProjetoFim,

    -- STATUS (CORRIGIDO)
    CASE 
        -- SEM PRAZO
        WHEN pc.ProjetoPrazo IS NULL THEN 'Sem prazo'

        -- FINALIZADO
        WHEN pc.ProjetoFim IS NOT NULL THEN
            CASE 
                WHEN pc.ProjetoFim > pc.ProjetoPrazo THEN 'Concluído com atraso'
                ELSE 'Concluído no prazo'
            END

        -- EM ANDAMENTO
        WHEN pc.ProjetoPrazo < CURDATE() THEN 'Atrasado'
        WHEN DATEDIFF(pc.ProjetoPrazo, CURDATE()) <= 15 THEN 'Prazo próximo'
        ELSE 'No prazo'
    END AS StatusProjeto,

    -- MÉTRICA
    CASE 
        WHEN pc.ProjetoFim IS NULL THEN NULL
        ELSE TIMESTAMPDIFF(
            MONTH,
            pc.ProjetoInicio,
            pc.ProjetoFim
        )
    END AS TempoProjetoMeses

FROM ProjetoClassificado pc
LEFT JOIN projectowners po ON po.ProjectId = pc.ProjetoId
LEFT JOIN membro m ON m.Id = po.UserId

ORDER BY
    pc.ProjetoInicio DESC;