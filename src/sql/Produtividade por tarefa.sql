WITH TaskTags AS (
    -- Consolida as tags por tarefa para evitar duplicidade
    SELECT
        tagtasks.Task_Id AS TaskId,
        GROUP_CONCAT(DISTINCT tags.Name ORDER BY tags.Name SEPARATOR ', ') AS Tags
    FROM tagtasks
    JOIN tags 
        ON tagtasks.Tag_Id = tags.Id
    GROUP BY tagtasks.Task_Id
),

TaskWorkedHours AS (
    -- Soma as horas trabalhadas por tarefa (todos os membros)
    SELECT
        reportagem.Task_Id AS TaskId,
        SUM(reportagem.HorasTrabalhadas) AS WorkedHours
    FROM reportagem
    WHERE reportagem.Task_Id IS NOT NULL
    GROUP BY
        reportagem.Task_Id
),

FinalizedTasksRaw AS (
    SELECT 
        tasks.UserId,
        membro.Nome AS Collaborator,
        tasks.Id AS TaskId,
        tasks.Title AS TaskName,
        tasks.EstimatedEffort,
        COALESCE(TaskWorkedHours.WorkedHours, 0) AS WorkedHours,
        taskhistories.Timestamp AS `Timestamp`,
        costcenters.Name AS Project,
        status.Name AS Status,
        TaskTags.Tags,
        ROW_NUMBER() OVER (
            PARTITION BY tasks.Id 
            ORDER BY taskhistories.Timestamp DESC
        ) AS rn
    FROM tasks
    JOIN status 
        ON tasks.StatusId = status.Id
    JOIN statustemplates AS current_template
        ON status.TemplateId = current_template.Id
    JOIN boards 
        ON tasks.BoardId = boards.Id
    JOIN costcenters 
        ON boards.CostCenterId = costcenters.Id
    JOIN membro 
        ON tasks.UserId = membro.Id
    JOIN taskhistories 
        ON taskhistories.TaskId = tasks.Id
    JOIN status AS old_status 
        ON taskhistories.OldValue = old_status.Id
    JOIN status AS new_status 
        ON taskhistories.NewValue = new_status.Id
    JOIN statustemplates AS new_template
        ON new_status.TemplateId = new_template.Id
    LEFT JOIN TaskTags
        ON TaskTags.TaskId = tasks.Id
    LEFT JOIN TaskWorkedHours
        ON TaskWorkedHours.TaskId = tasks.Id
    WHERE taskhistories.PropertyName = 'StatusId'
      AND old_status.Name NOT LIKE '%Finalizad%'
      AND new_status.Name LIKE '%Finalizad%'
      AND new_template.IsFinal = 1
      AND current_template.IsFinal = 1
      AND tasks.Active = 1
),

FinalizedTasks AS (
    -- Apenas a última finalização de cada tarefa
    SELECT *
    FROM FinalizedTasksRaw
    WHERE rn = 1
)

SELECT 
    Project,
    Collaborator,
    TaskName,
    EstimatedEffort,
    WorkedHours,
    `Timestamp`,
    Tags,
    1 AS TotalFinalizedTasks
FROM FinalizedTasks
ORDER BY `Timestamp` DESC;