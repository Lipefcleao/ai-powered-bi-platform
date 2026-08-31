SELECT 
    M.Nome AS Responsavel,

    DATE(DATE_FORMAT(R.Dia, '%Y-%m-01')) AS Mes,

    COALESCE(P.Nome, 'Sem Projeto') AS Projeto,

    SUM(R.HorasTrabalhadas) AS Horas_Trabalhadas

FROM reportagem R

INNER JOIN membro M 
    ON R.Membro_Id = M.Id

LEFT JOIN projeto P 
    ON R.Projeto_Id = P.Id

WHERE R.HorasTrabalhadas IS NOT NULL

GROUP BY 
    M.Nome,
    Mes,
    Projeto

ORDER BY 
    Mes,
    Responsavel,
    Horas_Trabalhadas DESC;