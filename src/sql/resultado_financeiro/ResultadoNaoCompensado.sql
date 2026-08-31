-- Bloco unificado de Receitas e Despesas com impostos, agora com Cliente e Conta (sem Categoria)

-- RECEITAS
WITH Revenues AS (
    SELECT 
        CF.Id,
        COALESCE(CF.Date, CF.DueDate) AS RevenueDate,
        CASE WHEN CF.Value > 0 THEN CF.Value ELSE NULL END AS Receitas,
        CC.Name AS Projeto,
        C.Name AS Cliente,
        BA.Name AS Conta,
        CAT.Name AS Categoria,
        CASE WHEN CF.Executed = 1 THEN 'Executado' ELSE 'Não Executado' END AS Status
    FROM cashflowitems CF 
    LEFT JOIN costcenters CC ON CF.CostCenter_Id = CC.Id
    LEFT JOIN clients C ON CF.Client_Id = C.Id
    LEFT JOIN bankaccounts BA ON CF.BankAccount_Id = BA.Id
    LEFT JOIN cashflowcategories CAT ON CF.Category_Id = CAT.Id
    WHERE CF.Transfer_Id IS NULL
      AND CF.Id NOT IN (
          SELECT DISTINCT Parent_Id 
          FROM CashFlowItems CFI 
          WHERE CFI.Parent_Id IS NOT NULL AND (Type <> 1 OR Type IS NULL)
      )
),

ServiceSalesFromCF_Revenue AS (
    SELECT DISTINCT
        SP.Sale_Id AS Id,
        CC.Name AS Projeto
    FROM Revenues R
    INNER JOIN servicesalepayments SP ON R.Id = SP.CashFlowItem_Id
    LEFT JOIN cashflowitems CF ON CF.Id = SP.CashFlowItem_Id
    LEFT JOIN costcenters CC ON CF.CostCenter_Id = CC.Id
),

ServiceSalesPayments_Revenue AS (
    SELECT
        SP.Sale_Id,
        SP.EffectiveDate,
        SC.Projeto,
        (COALESCE(SP.Value, SP.EffectiveValue) / SubQuery.TotalSum) * SS.Total AS GrossValue
    FROM ServiceSalesFromCF_Revenue SC
    INNER JOIN servicesalepayments SP ON SC.Id = SP.Sale_Id
    INNER JOIN servicesales SS ON SS.Id = SP.Sale_Id
    CROSS JOIN LATERAL (
        SELECT SUM(Value) AS TotalSum 
        FROM servicesalepayments S 
        WHERE S.Sale_Id = SP.Sale_Id
    ) AS SubQuery
),

ServiceSalesTaxes_Revenue AS (
    SELECT 
        S.Id,
        S.Projeto,
        (ST.Value / C1.TotalGrossValue) AS TaxValue
    FROM ServiceSalesFromCF_Revenue S
    INNER JOIN servicesaletaxes ST ON S.Id = ST.Sale_Id
    CROSS JOIN LATERAL (
        SELECT SUM(GrossValue) AS TotalGrossValue
        FROM ServiceSalesPayments_Revenue SP 
        WHERE SP.Sale_Id = S.Id
    ) AS C1
),

TaxesPerRevenue AS (
    SELECT 
        SUB.EffectiveDate,
        SUB.Projeto,
        ROUND(SUM(SUB.TotalGrossValue * ST.TaxValue), 2) AS Total
    FROM ServiceSalesTaxes_Revenue ST
    CROSS JOIN LATERAL (
        SELECT 
            SP.EffectiveDate,
            SP.Projeto,
            SUM(GrossValue) AS TotalGrossValue
        FROM ServiceSalesPayments_Revenue SP
        WHERE SP.Sale_Id = ST.Id
        GROUP BY SP.EffectiveDate, SP.Projeto
    ) AS SUB
    GROUP BY SUB.EffectiveDate, SUB.Projeto
    HAVING Total IS NOT NULL
),

RevenuesWithTaxes AS (
    SELECT 
        RevenueDate AS Date,
        Projeto,
        Cliente,
        Conta,
        Categoria,
        SUM(Receitas) AS Total
    FROM Revenues
    WHERE Status = 'Não Executado'
    GROUP BY RevenueDate, Projeto, Cliente, Conta, Categoria
    HAVING Total IS NOT NULL

    UNION ALL

    SELECT
        TPT.EffectiveDate AS Date,
        TPT.Projeto,
        NULL AS Cliente,
        NULL AS Conta,
        NULL AS Categoria,
        SUM(Total) AS Total
    FROM TaxesPerRevenue TPT
    GROUP BY TPT.EffectiveDate, TPT.Projeto
    HAVING TPT.EffectiveDate IS NOT NULL
),

-- DESPESAS
Expenses AS (
    SELECT 
        CF.Id,
        COALESCE(CF.Date, CF.DueDate) AS ExpenseDate,
        CASE WHEN CF.Value < 0 THEN CF.Value ELSE NULL END AS Despesas,
        CC.Name AS Projeto,
        NULL AS Cliente,
        NULL AS Conta,
        CAT.Name AS Categoria,
        CASE WHEN CF.Executed = 1 THEN 'Executado' ELSE 'Não Executado' END AS Status
    FROM cashflowitems CF 
    LEFT JOIN costcenters CC ON CF.CostCenter_Id = CC.Id
    LEFT JOIN cashflowcategories CAT ON CF.Category_Id = CAT.Id
    WHERE CF.Transfer_Id IS NULL
      AND CF.Id NOT IN (
          SELECT DISTINCT Parent_Id 
          FROM CashFlowItems CFI 
          WHERE CFI.Parent_Id IS NOT NULL AND (Type <> 1 OR Type IS NULL)
      )
),

ServiceSalesFromCF_Expense AS (
    SELECT DISTINCT
        SP.Sale_Id AS Id,
        CC.Name AS Projeto
    FROM Expenses E
    INNER JOIN servicesalepayments SP ON E.Id = SP.CashFlowItem_Id
    LEFT JOIN cashflowitems CF ON CF.Id = SP.CashFlowItem_Id
    LEFT JOIN costcenters CC ON CF.CostCenter_Id = CC.Id
),

ServiceSalesPayments_Expense AS (
    SELECT
        SP.Sale_Id,
        SP.EffectiveDate,
        SC.Projeto,
        (COALESCE(SP.Value, SP.EffectiveValue) / SubQuery.TotalSum) * SS.Total AS GrossValue
    FROM ServiceSalesFromCF_Expense SC
    INNER JOIN servicesalepayments SP ON SC.Id = SP.Sale_Id
    INNER JOIN servicesales SS ON SS.Id = SP.Sale_Id
    CROSS JOIN LATERAL (
        SELECT SUM(Value) AS TotalSum 
        FROM servicesalepayments S 
        WHERE S.Sale_Id = SP.Sale_Id
    ) AS SubQuery
),

ServiceSalesTaxes_Expense AS (
    SELECT 
        S.Id,
        S.Projeto,
        (ST.Value / C1.TotalGrossValue) AS TaxValue
    FROM ServiceSalesFromCF_Expense S
    INNER JOIN servicesaletaxes ST ON S.Id = ST.Sale_Id
    CROSS JOIN LATERAL (
        SELECT SUM(GrossValue) AS TotalGrossValue
        FROM ServiceSalesPayments_Expense SP 
        WHERE SP.Sale_Id = S.Id
    ) AS C1
),

TaxesPerExpense AS (
    SELECT 
        SUB.EffectiveDate,
        SUB.Projeto,
        ROUND(SUM(SUB.TotalGrossValue * ST.TaxValue), 2) * -1 AS Total
    FROM ServiceSalesTaxes_Expense ST
    CROSS JOIN LATERAL (
        SELECT 
            SP.EffectiveDate,
            SP.Projeto,
            SUM(GrossValue) AS TotalGrossValue
        FROM ServiceSalesPayments_Expense SP
        WHERE SP.Sale_Id = ST.Id
        GROUP BY SP.EffectiveDate, SP.Projeto
    ) AS SUB
    GROUP BY SUB.EffectiveDate, SUB.Projeto
    HAVING Total IS NOT NULL
),

ExpensesWithTaxes AS (
    SELECT 
        ExpenseDate AS Date,
        Projeto,
        Cliente,
        Conta,
        Categoria,
        SUM(Despesas) AS Total
    FROM Expenses
    WHERE Status = 'Não Executado'
    GROUP BY ExpenseDate, Projeto, Cliente, Conta, Categoria
    HAVING Total IS NOT NULL

    UNION ALL

    SELECT
        TPT.EffectiveDate AS Date,
        TPT.Projeto,
        NULL AS Cliente,
        NULL AS Conta,
        NULL AS Categoria,
        SUM(Total) AS Total
    FROM TaxesPerExpense TPT
    GROUP BY TPT.EffectiveDate, TPT.Projeto
    HAVING TPT.EffectiveDate IS NOT NULL
)

-- Resultado final
SELECT 
    Date,
    COALESCE(Projeto, 'Sem projeto definido') AS Projeto,
    COALESCE(Cliente, 'Sem cliente definido') AS Cliente,
    COALESCE(Conta, 'Sem conta definida') AS Conta,
    COALESCE(Categoria,'Sem categoria definida') AS Categoria,
    SUM(CASE WHEN Tipo = 'Receita' THEN Total ELSE 0 END) AS TotalReceitas,
    SUM(CASE WHEN Tipo = 'Despesa' THEN Total * -1 ELSE 0 END) AS TotalDespesas,
    SUM(Total) AS Resultado
FROM (
    SELECT 'Receita' AS Tipo, Date, Projeto, Cliente, Conta, Categoria, Total FROM RevenuesWithTaxes
    UNION ALL
    SELECT 'Despesa' AS Tipo, Date, Projeto, Cliente, Conta, Categoria, Total FROM ExpensesWithTaxes
) AS Combined
GROUP BY Date, Projeto, Cliente, Conta, Categoria
ORDER BY Date, Projeto;