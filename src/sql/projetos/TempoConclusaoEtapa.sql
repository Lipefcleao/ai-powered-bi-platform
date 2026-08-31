WITH EtapaClassificada AS (
    SELECT
        cc.Name AS Projeto,
        b.Name AS Etapa,
        b.StartDate AS EtapaInicio,
        b.EndDate AS EtapaPrazo,
        b.RealEndDate AS EtapaFim,
        c.Name AS Cliente,
        cc.Id AS CostCenterId,
        b.Id AS EtapaId
    FROM boards b
    JOIN costcenters cc ON b.CostCenterId = cc.Id
    JOIN projeto p ON cc.Id = p.Id
    LEFT JOIN clients c ON cc.Client_Id = c.Id
    WHERE
        b.Active = 1
        AND p.Ativo = 1
)

SELECT
    -- CONTEXTO
    Cliente,
    Projeto,
    Etapa,

    -- DATAS
    EtapaInicio,
    EtapaPrazo,
    EtapaFim,

    -- STATUS (CORRIGIDO)
    CASE 
        -- SEM PRAZO
        WHEN EtapaPrazo IS NULL THEN 'Sem prazo'

        -- FINALIZADA
        WHEN EtapaFim IS NOT NULL THEN
            CASE 
                WHEN EtapaFim > EtapaPrazo THEN 'Concluído com atraso'
                ELSE 'Concluído no prazo'
            END

        -- EM ANDAMENTO
        WHEN EtapaPrazo < CURDATE() THEN 'Atrasado'
        WHEN DATEDIFF(EtapaPrazo, CURDATE()) <= 7 THEN 'Prazo próximo'
        ELSE 'No prazo'
    END AS StatusEtapa,

    -- MÉTRICA (SÓ FINALIZADAS)
    CASE 
        WHEN EtapaFim IS NULL THEN NULL
        ELSE DATEDIFF(EtapaFim, EtapaInicio) + 1
    END AS TempoEtapaDias

FROM EtapaClassificada

ORDER BY
    Cliente,
    Projeto,
    Etapa;