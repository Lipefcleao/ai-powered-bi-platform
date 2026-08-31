WITH ReceitaProjeto AS (
    SELECT 
        cfi.CostCenter_Id AS ProjetoId,
        cfi.Client_Id,
        YEAR(cfi.CompetenceDate) AS Ano,
        MONTH(cfi.CompetenceDate) AS Mes,
        STR_TO_DATE(CONCAT(YEAR(cfi.CompetenceDate), '-', LPAD(MONTH(cfi.CompetenceDate), 2, '0'), '-01'), '%Y-%m-%d') AS DataReferencia,
        SUM(ABS(cfi.Value)) AS Receita
    FROM cashflowitems cfi
    WHERE cfi.Value > 0
        AND cfi.Transfer_Id IS NULL
        AND cfi.CompetenceDate IS NOT NULL
        AND cfi.Id NOT IN (
            SELECT DISTINCT Parent_Id 
            FROM cashflowitems cf 
            WHERE cf.Parent_Id IS NOT NULL AND (cf.Type <> 1 OR cf.Type IS NULL)
        )
    GROUP BY ProjetoId, Client_Id, Ano, Mes, DataReferencia
),
DespesaProjeto AS (
    SELECT 
        cfi.CostCenter_Id AS ProjetoId,
        YEAR(cfi.CompetenceDate) AS Ano,
        MONTH(cfi.CompetenceDate) AS Mes,
        STR_TO_DATE(CONCAT(YEAR(cfi.CompetenceDate), '-', LPAD(MONTH(cfi.CompetenceDate), 2, '0'), '-01'), '%Y-%m-%d') AS DataReferencia,
        SUM(ABS(cfi.Value)) AS Despesa
    FROM cashflowitems cfi
    WHERE cfi.Value < 0
        AND cfi.Transfer_Id IS NULL
        AND cfi.CompetenceDate IS NOT NULL
        AND cfi.Id NOT IN (
            SELECT DISTINCT Parent_Id 
            FROM cashflowitems cf 
            WHERE cf.Parent_Id IS NOT NULL AND (cf.Type <> 1 OR cf.Type IS NULL)
        )
    GROUP BY ProjetoId, Ano, Mes, DataReferencia
),
Rateio AS (
    SELECT 
        fsc.PayingProject AS ProjetoId,
        fsc.ReferenceYear AS Ano,
        fsc.ReferenceMonth AS Mes,
        STR_TO_DATE(CONCAT(fsc.ReferenceYear, '-', LPAD(fsc.ReferenceMonth, 2, '0'), '-01'), '%Y-%m-%d') AS DataReferencia,
        SUM(fsc.SharingRevenue - fsc.SharingExpense) AS RateioFinal
    FROM financesharingcaches fsc
    GROUP BY ProjetoId, Ano, Mes, DataReferencia
)
SELECT 
    cc.Name AS Projeto,
    IFNULL(clients.Name, 'Sem Cliente') AS Cliente,
    rp.DataReferencia,
    ROUND(COALESCE(rp.Receita, 0), 2) AS Receita,
    ROUND(COALESCE(dp.Despesa, 0), 2) AS Despesa,
    ROUND(COALESCE(rp.Receita, 0) - COALESCE(dp.Despesa, 0), 2) AS MargemDireta,  -- ← NOVA COLUNA
    ROUND(COALESCE(r.RateioFinal, 0), 2) AS Rateio,
    ROUND(
        COALESCE(rp.Receita, 0) 
        + COALESCE(r.RateioFinal, 0) 
        - COALESCE(dp.Despesa, 0),
        2
    ) AS Resultado
FROM ReceitaProjeto rp
LEFT JOIN DespesaProjeto dp 
    ON rp.ProjetoId = dp.ProjetoId AND rp.DataReferencia = dp.DataReferencia
LEFT JOIN Rateio r 
    ON rp.ProjetoId = r.ProjetoId AND rp.DataReferencia = r.DataReferencia
LEFT JOIN costcenters cc ON rp.ProjetoId = cc.Id
LEFT JOIN clients ON rp.Client_Id = clients.Id
ORDER BY rp.DataReferencia DESC;