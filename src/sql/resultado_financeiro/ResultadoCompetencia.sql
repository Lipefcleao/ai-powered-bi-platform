WITH base AS (
    SELECT 
        c.Name AS Projeto,
        COALESCE(cl.Name, 'Sem cliente') AS Cliente,
        COALESCE(ba.Name, 'Sem conta') AS Conta,
        COALESCE(cat.Name, 'Sem categoria') AS Categoria,
        cf.CompetenceDate AS DateReferencia,
        cf.Value,
        cf.Executed,
        CASE 
            WHEN cf.Executed = 1 THEN 'Compensada'
            ELSE 'Não compensada'
        END AS StatusCompensacao
    FROM cashflowitems cf
    LEFT JOIN costcenters c 
        ON cf.CostCenter_Id = c.Id
    LEFT JOIN clients cl 
        ON cf.Client_Id = cl.Id
    LEFT JOIN bankaccounts ba 
        ON cf.BankAccount_Id = ba.Id
    LEFT JOIN cashflowcategories cat 
        ON cf.Category_Id = cat.Id
    WHERE 
        cf.Transfer_Id IS NULL
        AND cf.CompetenceDate IS NOT NULL
        AND cf.Id NOT IN (
            SELECT DISTINCT Parent_Id
            FROM cashflowitems
            WHERE Parent_Id IS NOT NULL 
            AND (Type <> 1 OR Type IS NULL)
        )
)

SELECT 
    b.DateReferencia,
    b.Projeto,
    b.Cliente,
    b.Conta,
    b.Categoria,
    b.StatusCompensacao,

    ROUND(SUM(CASE WHEN b.Value > 0 THEN b.Value ELSE 0 END), 2) AS Receita_Competencia,
    ROUND(SUM(CASE WHEN b.Value < 0 THEN b.Value * -1 ELSE 0 END), 2) AS Despesa_Competencia,
    ROUND(SUM(b.Value), 2) AS Total_Competencia

FROM base b

GROUP BY 
    b.DateReferencia,
    b.Projeto,
    b.Cliente,
    b.Conta,
    b.Categoria,
    b.StatusCompensacao

ORDER BY 
    b.DateReferencia,
    b.Projeto,
    b.Cliente,
    b.Conta,
    b.Categoria,
    b.StatusCompensacao;