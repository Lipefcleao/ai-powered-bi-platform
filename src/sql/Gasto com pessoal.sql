-- GASTO COM PESSOAL: cálculo mensal com férias consideradas e projeto por mês

WITH Calendario AS (SELECT DATE_ADD('2019-01-01', INTERVAL num DAY) AS Dia
	FROM (
		SELECT ROW_NUMBER() OVER () - 1 AS num
		FROM information_schema.tables
		LIMIT 2922 -- ano: 2026
	) AS seq),

-- Esta CTE calcula o período de vigência de cada promoção de um membro,
-- garantindo que não haja sobreposição entre promoções e mantendo a
-- última promoção com vigência aberta.
-- Define a data de início da vigência da promoção
        -- Regra:
        -- Se NÃO existir uma próxima promoção para o mesmo membro (ou seja, é a última promoção), então mantém a data original (DesdeDia).
        -- Caso contrário (existem promoções futuras), ajusta a data para o primeiro dia do mês da promoção, padronizando o início das vigências antigas.
-- Define a data de fim da vigência da promoção
        -- Regra:
        -- Busca a próxima promoção do mesmo membro (ordenada pela menor data futura) e define o fim como o dia anterior ao início dessa próxima promoção.
        -- Caso não exista próxima promoção (ou seja, é a vigente atual), define uma data futura padrão ('9999-12-31 23:59:59') como vigência aberta.
VigenciaPromocao AS (
    SELECT
        Membro_Id,
        Cargo_Id,
        (CASE WHEN NOT EXISTS (SELECT 1 FROM promocao NP WHERE NP.Membro_Id = CP.Membro_Id AND NP.DesdeDia > CP.DesdeDia) 
			 THEN DATE_FORMAT(DesdeDia, '%Y-%m-%d')
             ELSE DATE_FORMAT(DesdeDia, '%Y-%m-01')
        END) AS Inicio,
        COALESCE(
            (SELECT DATE_FORMAT(DATE_ADD(DesdeDia, INTERVAL -1 DAY), '%Y-%m-%d')
             FROM promocao NP
             WHERE NP.Membro_Id = CP.Membro_Id AND NP.DesdeDia > CP.DesdeDia
             ORDER BY NP.DesdeDia ASC
             LIMIT 1),
            '9999-12-31'
        ) AS Fim
    FROM promocao CP
),

EncargoTotalPorRegime AS (
    SELECT 
        e.TipoTributacao,
        e.Regime,
        e.DesdeDia,
        SUM(CASE WHEN ei.Nome IN ('13º Salário','Férias','DSR - Descanso Semanal Remunerado') THEN ei.Valor ELSE 0 END) AS TotalTrabalhista,
        SUM(CASE WHEN ei.Nome IN ('INSS','SAT/RAT','Salário Educação','INCRA/SEST/SEBRAE/SENAT','FGTS','FGTS/Provisão de Multa para Rescisão') THEN ei.Valor ELSE 0 END) AS TotalSocial,
        (SUM(CASE WHEN ei.Nome IN ('13º Salário','Férias','DSR - Descanso Semanal Remunerado') THEN ei.Valor ELSE 0 END) *
         (SUM(CASE WHEN ei.Nome IN ('INSS','SAT/RAT','Salário Educação','INCRA/SEST/SEBRAE/SENAT','FGTS','FGTS/Provisão de Multa para Rescisão') THEN ei.Valor ELSE 0 END) / 100)
        +
         SUM(CASE WHEN ei.Nome IN ('INSS','SAT/RAT','Salário Educação','INCRA/SEST/SEBRAE/SENAT','FGTS','FGTS/Provisão de Multa para Rescisão') THEN ei.Valor ELSE 0 END)
        +
         SUM(CASE WHEN ei.Nome IN ('13º Salário','Férias','DSR - Descanso Semanal Remunerado') THEN ei.Valor ELSE 0 END)
        ) / 100 AS TotalEncargos
    FROM encargo e
    JOIN encargo_item ei ON ei.Encargo_Id = e.Id
    GROUP BY e.TipoTributacao, e.Regime, e.DesdeDia
),

ReajusteVigente AS (
    SELECT 
        r.Cargo_Id,
        r.Valor AS ValorHora,
        r.CustoMensal,
        r.SalarioBase,
        r.Empresa,
        r.Regime,
        r.DesdeDia
    FROM reajuste r
),

EmpresaTributacao AS (
    SELECT 
        c.Id AS EmpresaId,
        (CASE WHEN c.taxationType = 0 THEN 0 ELSE 1 END) AS TipoTributacao
    FROM companies c
),

CargaHorariaMensal AS (SELECT 
		sub.Membro_Id,
        DATE_FORMAT(sub.Dia, '%Y-%m') AS Mes_Ano,
        SUM(sub.CargaHorariaMes) AS CargaHorariaMes
        FROM (SELECT DISTINCT
				VP.Membro_Id,
				C.Dia,
				IF(F.Id IS NULL AND MOD(WEEKDAY(C.Dia) + 1, 7) BETWEEN 1 AND 5, CH.Carga, 0) AS CargaHorariaMes
			FROM Calendario C
			LEFT JOIN feriado F ON C.Dia = F.Dia
			JOIN VigenciaPromocao VP ON C.Dia BETWEEN DATE(VP.Inicio) AND DATE(VP.Fim)
			JOIN carga_horaria CH ON CH.Cargo_Id = VP.Cargo_Id AND MOD(WEEKDAY(C.Dia) + 1, 7) = CH.DiaSemana) AS sub
		GROUP BY sub.Membro_Id, Mes_Ano),

HorasApontadas AS (
    SELECT 
        r.Membro_Id,
        r.Projeto_Id,
        COALESCE(boards.Id, 0) AS Etapa,
        COALESCE(tasks.Id, 0) AS Tarefa,

        r.Dia,
        SUM(r.HorasTrabalhadas) AS HorasApontadas

    FROM reportagem r
    JOIN CostCenters ON r.Projeto_Id = CostCenters.Id

    LEFT JOIN tasks ON r.Task_Id = tasks.Id
    LEFT JOIN boards ON tasks.BoardId = boards.Id

    GROUP BY 
        r.Membro_Id,
        r.Projeto_Id,
        Dia,
        COALESCE(boards.Id, 0),
        COALESCE(tasks.Id, 0)
),

CargosDetalhados AS (
    SELECT DISTINCT
        membro.Id AS Membro_Id,
        membro.Nome AS Colaborador,
        cargo.Nome AS Cargo,
        rj.Regime,
        et.TipoTributacao,
        DATE_FORMAT(cal.Dia, '%Y-%m') AS Mes_Ano,
        STR_TO_DATE(DATE_FORMAT(cal.Dia, '%Y-%m-01'), '%Y-%m-%d') AS Data,
        rj.ValorHora,
        rj.CustoMensal,
        rj.SalarioBase,
        e.TotalEncargos,
        ha.HorasApontadas,
        chm.CargaHorariaMes,
        p.Nome AS Projeto,
        boards.Name AS etapa,
        g.Name AS Grupo,
        tasks.Title AS tarefa
    FROM Calendario cal
    JOIN VigenciaPromocao vp ON cal.Dia BETWEEN vp.Inicio AND IFNULL(vp.Fim, cal.Dia)
    JOIN membro ON membro.Id = vp.Membro_Id
    JOIN cargo ON cargo.Id = vp.Cargo_Id
    JOIN ReajusteVigente rj ON rj.Cargo_Id = cargo.Id AND rj.DesdeDia <= cal.Dia
    JOIN reportagem r ON r.Membro_Id = membro.Id AND DATE_FORMAT(r.Dia, '%Y-%m') = DATE_FORMAT(cal.Dia, '%Y-%m')
    JOIN projeto p ON p.Id = r.Projeto_Id AND p.Ativo = 1
    JOIN costcenters ON costcenters.id = p.Id
    JOIN (SELECT 
			Id, 
			CostCenterId, 
			Name
		FROM boards
		UNION ALL
		SELECT 
			0 AS Id, 
			cc.Id AS CostCenterId, 
			'Horas apontadas diretamente no projeto' AS Name
		FROM costcenters cc
	) boards ON costcenters.id = boards.CostCenterId
	JOIN (SELECT 
			Id, 
            BoardId, 
            Title
		FROM tasks
		UNION ALL
		SELECT 
			0 AS Id, 
			0 AS BoardId, 
			'Horas apontadas diretamente no projeto' AS Title
	) tasks ON tasks.BoardId = boards.Id
    JOIN EmpresaTributacao et ON et.EmpresaId = rj.Empresa
    JOIN HorasApontadas ha ON ha.Membro_Id = membro.Id AND ha.Dia = cal.Dia AND ha.Projeto_Id = p.Id AND ha.Etapa = boards.Id AND ha.Tarefa = tasks.Id
    LEFT JOIN EncargoTotalPorRegime e ON e.TipoTributacao = et.TipoTributacao AND e.Regime = rj.Regime AND e.DesdeDia <= cal.Dia
    LEFT JOIN CargaHorariaMensal chm ON chm.Membro_Id = membro.Id AND chm.Mes_Ano = DATE_FORMAT(cal.Dia, '%Y-%m')
    LEFT JOIN memberteams mt ON mt.MemberId = membro.Id
    LEFT JOIN grupo g ON g.Id = mt.TeamId AND g.Active = 1
),

GastoCalculado AS (
    SELECT
        Membro_Id,
        Colaborador,
        Cargo,
        Projeto,
        Etapa,
        Tarefa,
        Grupo,
        CASE 
            WHEN Regime = 0 THEN 'Mensalista'
            WHEN Regime = 1 THEN 'Horista'
            WHEN Regime = 2 THEN 'Estagiário'
            ELSE 'Outros'
        END AS TipoVinculo,
        Mes_Ano,
        Data AS MesAnoData,
        IFNULL(HorasApontadas, 0) AS HorasApontadas,
        IFNULL(CargaHorariaMes, 160) AS CargaMensal,
        SalarioBase,
        TotalEncargos,
        CustoMensal,
        (CASE 
            WHEN Regime = 0 THEN (
                (IFNULL(SalarioBase, 0) + IFNULL(SalarioBase, 0) * IFNULL(TotalEncargos, 0) + IFNULL(CustoMensal, 0)) / NULLIF(CargaHorariaMes, 0)
            )
            WHEN Regime = 1 THEN (
                IFNULL(ValorHora, 0) + IFNULL(ValorHora, 0) * IFNULL(TotalEncargos, 0) + (IFNULL(CustoMensal, 0) / NULLIF(HorasApontadas, 0))
            )
            WHEN Regime = 2 THEN (
                (IFNULL(SalarioBase, 0) + IFNULL(CustoMensal, 0)) / NULLIF(CargaHorariaMes, 0)
            )
            ELSE (
                IFNULL(ValorHora, 0) + (IFNULL(CustoMensal, 0) / NULLIF(CargaHorariaMes, 0))
            )
        END) AS CustoHoraAdicional,
        ROUND(
            IFNULL(HorasApontadas, 0) *
            CASE 
                WHEN Regime = 0 THEN (
                    (IFNULL(SalarioBase, 0) + IFNULL(SalarioBase, 0) * IFNULL(TotalEncargos, 0) + IFNULL(CustoMensal, 0)) / NULLIF(CargaHorariaMes, 0)
                )
                WHEN Regime = 1 THEN (
                    IFNULL(ValorHora, 0) + IFNULL(ValorHora, 0) * IFNULL(TotalEncargos, 0) + (IFNULL(CustoMensal, 0) / NULLIF(HorasApontadas, 0))
                )
                WHEN Regime = 2 THEN (
                    (IFNULL(SalarioBase, 0) + IFNULL(CustoMensal, 0)) / NULLIF(CargaHorariaMes, 0)
                )
                ELSE (
                    IFNULL(ValorHora, 0) + (IFNULL(CustoMensal, 0) / NULLIF(CargaHorariaMes, 0))
                )
            END,
            4
        ) AS CustoTotal
    FROM CargosDetalhados
)

SELECT 
    Colaborador,
    Grupo,
    Cargo,
    Projeto,

    -- agrega etapas
    GROUP_CONCAT(DISTINCT Etapa ORDER BY Etapa SEPARATOR ', ') AS Etapas,

    -- agrega tarefas
    GROUP_CONCAT(DISTINCT Tarefa ORDER BY Tarefa SEPARATOR ', ') AS Tarefas,

    DATE_FORMAT(MesAnoData, '%Y-%m') AS Mes_Ano,

    -- mantém uma data representativa (início do mês)
    MIN(MesAnoData) AS MesAnoData,

    SUM(HorasApontadas) AS HorasApontadas,
    MAX(TipoVinculo) AS TipoVinculo,
    MAX(CargaMensal) AS CargaMensal,

    -- custo hora ponderado
    SUM(CustoTotal) / NULLIF(SUM(HorasApontadas), 0) AS CustoHoraAdicional,

    SUM(CustoTotal) AS CustoTotal

FROM GastoCalculado
GROUP BY 
    Colaborador,
    Grupo,
    Cargo,
    Projeto,
    DATE_FORMAT(MesAnoData, '%Y-%m')
ORDER BY 
    Mes_Ano,
    Colaborador,
    Cargo