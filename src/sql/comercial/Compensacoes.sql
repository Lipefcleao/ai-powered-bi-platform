SELECT 
    ss.Id AS SaleId,
    ss.Date AS DataVenda,
    
    cf.Id AS CashFlowId,
    cf.Value AS ValorParcela,
    
    cf.DueDate AS DataVencimento,
    cf.Date AS DataPagamento,
    
    cf.Executed,
    
    CASE 
        WHEN cf.Executed = 1 THEN 'Compensado'
        ELSE 'Em aberto'
    END AS Status

FROM servicesales ss

JOIN ServiceSalePayments ssp 
    ON ssp.Sale_Id = ss.Id

JOIN cashflowitems cf 
    ON cf.Id = ssp.CashFlowItem_Id

WHERE 
    ss.IsActual = 1
    AND ss.ParentVersion_Id IS NULL
    AND cf.Value > 0