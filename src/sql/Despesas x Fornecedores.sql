WITH Expenses AS (
    SELECT 
        COALESCE(CFI.Date, CFI.DueDate) AS Date,
        ABS(CFI.Value) AS Value,
        CASE 
            WHEN CFI.Executed = 1 THEN 'Compensado'
            WHEN CFI.Executed = 0 THEN 'Não Compensado'
        END AS Compensado,
        CFI.Supplier_Id,
        CFI.BankAccount_Id
    FROM CashFlowItems CFI
    WHERE 
        CFI.Value < 0
        AND CFI.Transfer_Id IS NULL
        AND CFI.Id NOT IN (
            SELECT DISTINCT Parent_Id 
            FROM CashFlowItems CF 
            WHERE CF.Parent_Id IS NOT NULL 
            AND (CF.Type <> 1 OR CF.Type IS NULL)
        )
),

SuppliersLimited AS (
    SELECT 
        DISTINCT Supplier_Id AS Id,
        Suppliers.Name
    FROM Expenses
    INNER JOIN Suppliers 
        ON Supplier_Id = Suppliers.Id 
        AND Suppliers.Active = 1
)

SELECT 
    STR_TO_DATE(CONCAT(DATE_FORMAT(Date, '%Y-%m'), '-01'), '%Y-%m-%d') AS Data,
    S.Name AS Fornecedor,
    bankaccounts.Name AS Conta,
    CashFlowItems.Compensado,
    SUM(Value) AS Valor
FROM Expenses AS CashFlowItems
INNER JOIN SuppliersLimited S 
    ON CashFlowItems.Supplier_Id = S.Id
INNER JOIN bankaccounts
    ON CashFlowItems.BankAccount_Id = bankaccounts.Id
GROUP BY 
    Data,
    Fornecedor,
    Conta,
    CashFlowItems.Compensado
ORDER BY 
    Data,
    Valor DESC;