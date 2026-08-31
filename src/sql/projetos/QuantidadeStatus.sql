SELECT
  projeto.Nome AS NomeProjeto,
  COALESCE(projeto.DataInicial, projeto.DataFinal) AS Data,
  clients.Name AS Cliente,
  statustemplates.Name AS StatusProjeto,
  CAST(projeto.Ativo AS UNSIGNED) AS StatusAtivo,
  membro.Nome AS Responsavel
FROM
  projeto
  LEFT JOIN costcenters ON costcenters.Id = projeto.Id
  LEFT JOIN clients ON costcenters.Client_Id = clients.Id
  LEFT JOIN statustemplates ON projeto.StatusTemplateId = statustemplates.Id
  LEFT JOIN projectowners ON projectowners.ProjectId = projeto.Id
  LEFT JOIN membro ON membro.Id = projectowners.UserId;