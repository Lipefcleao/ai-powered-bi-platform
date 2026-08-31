SELECT 
    clients.Name AS Client,
    ABS(cfi.Value) AS Value,
    cfi.DueDate AS DueDate,
    costcenters.Name AS Project,
    cfi.Description
FROM cashflowitems cfi
LEFT JOIN costcenters ON cfi.CostCenter_Id = costcenters.Id
LEFT JOIN clients ON cfi.Client_Id = clients.Id
WHERE 
    cfi.Value > 0
    AND cfi.Date IS NULL                     -- ainda não foi pago
    AND cfi.DueDate < CURRENT_DATE()        -- vencido
    AND cfi.Transfer_Id IS NULL
    AND cfi.Id NOT IN (
        SELECT DISTINCT Parent_Id 
        FROM cashflowitems cf 
        WHERE cf.Parent_Id IS NOT NULL AND (cf.Type <> 1 OR cf.Type IS NULL)
    )
ORDER BY cfi.DueDate ASC;
