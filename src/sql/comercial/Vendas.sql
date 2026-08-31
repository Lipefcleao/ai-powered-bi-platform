SELECT 
    Date,
    Total AS Receitas,
    
    CASE 
        WHEN IsActual = 1 THEN 'Venda'
        WHEN IsActual = 0 THEN 'Orçamento'
    END AS Tipo

FROM 
    servicesales

WHERE
    Total > 0 
    AND ParentVersion_Id IS NULL;
