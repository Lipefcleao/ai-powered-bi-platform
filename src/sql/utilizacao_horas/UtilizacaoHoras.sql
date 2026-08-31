WITH RECURSIVE
  Calendario AS (
    SELECT
      DATE_ADD('2019-01-01', INTERVAL num DAY) AS Dia
    FROM
      (
        SELECT
          ROW_NUMBER() OVER () - 1 AS num
        FROM
          information_schema.tables
        LIMIT
          2922 -- quantidade de dias (2023 até 2026)
      ) seq
  ),
  VigenciaPromocao AS (
    SELECT
      Membro_Id,
      Cargo_Id,
      DesdeDia AS Inicio,
      (
        SELECT
          DATE_ADD(DesdeDia, INTERVAL -1 DAY)
        FROM
          promocao NP
        WHERE
          NP.Membro_Id = CP.Membro_Id
          AND NP.DesdeDia > CP.DesdeDia
        ORDER BY
          NP.DesdeDia ASC
        LIMIT
          1
      ) AS Fim
    FROM
      promocao CP
  ),
  DiasUteisPorCargo AS (
    SELECT
      C.Dia,
      VP.Membro_Id,
      VP.Cargo_Id,
      IF(
        F.Id IS NULL
        AND VC.Id IS NULL,
        CH.Carga,
        0
      ) AS CargaDiaria
    FROM
      Calendario C
      LEFT JOIN feriado F ON C.Dia = F.Dia
      LEFT JOIN VigenciaPromocao VP ON C.Dia BETWEEN VP.Inicio AND IFNULL(VP.Fim, C.Dia)
      LEFT JOIN carga_horaria CH ON CH.Cargo_Id = VP.Cargo_Id
      AND MOD(WEEKDAY(C.Dia) + 1, 7) = CH.DiaSemana
      LEFT JOIN vacation VC ON C.Dia BETWEEN VC.InitialDate AND VC.FinalDate
      AND VP.Membro_Id = VC.User_Id
  ),
  HorasTrabalhadas AS (
    SELECT
      VP.Membro_Id,
      M.Nome AS Responsavel,
      DATE_FORMAT(C.Dia, '%Y-%m') AS Mes_Ano,
      SUM(IFNULL(R.HorasTrabalhadas, 0)) AS Total_Horas_Trabalhadas,
      VP.Cargo_Id
    FROM
      Calendario C
      LEFT JOIN reportagem R ON R.Dia = C.Dia
      INNER JOIN membro M ON R.Membro_Id = M.Id
      INNER JOIN VigenciaPromocao VP ON VP.Membro_Id = M.Id
      AND C.Dia >= VP.Inicio
      AND (
        C.Dia <= VP.Fim
        OR VP.Fim IS NULL
      )
    GROUP BY
      VP.Membro_Id,
      M.Nome,
      Mes_Ano,
      VP.Cargo_Id
  ),
  HorasUteisPorMes AS (
    SELECT
      Membro_Id,
      DATE_FORMAT(Dia, '%Y-%m') AS Mes_Ano,
      SUM(CargaDiaria) AS TotalHorasUteis
    FROM
      DiasUteisPorCargo
    GROUP BY
      Membro_Id,
      Mes_Ano
  ),
  ResultadoFinal AS (
    SELECT
      HT.Responsavel,
      STR_TO_DATE(CONCAT(HT.Mes_Ano, '-01'), '%Y-%m-%d') AS Mes_Ano,
      HT.Total_Horas_Trabalhadas,
      ROUND(
        CASE
          WHEN HT.Cargo_Id = 10009 THEN HT.Total_Horas_Trabalhadas
          ELSE HUPM.TotalHorasUteis
        END,
        2
      ) AS Horas_Uteis
    FROM
      HorasTrabalhadas HT
      LEFT JOIN HorasUteisPorMes HUPM ON HT.Membro_Id = HUPM.Membro_Id
      AND HT.Mes_Ano = HUPM.Mes_Ano
  )
SELECT
  Responsavel AS Responsável,
  Mes_Ano AS Mês,
  Horas_Uteis AS `Horas Úteis no Mês`,
  Total_Horas_Trabalhadas AS 'Horas Trabalhadas',
  ROUND(Total_Horas_Trabalhadas - Horas_Uteis, 2) AS 'Saldo de Horas no Mês',
  ROUND((Total_Horas_Trabalhadas / Horas_Uteis) * 100, 2) AS 'Taxa do Mês (%)'
FROM
  ResultadoFinal
ORDER BY
  Mes_Ano,
  Responsavel;