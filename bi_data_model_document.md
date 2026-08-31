# 1. Leitura correta do modelo: como esse banco "pensa" o negócio

A melhor forma de entender esse banco é enxergar a seguinte hierarquia lógica:

Projeto → Etapa (Board) → Tarefa → Apontamento / Histórico / Tags / Comentários / Anexos

Ao mesmo tempo, existe uma segunda hierarquia paralela para o financeiro:

Projeto/CostCenter → Venda / Receita / Despesa / CashFlow → Pagamentos / Impostos / NF / Banco

Na prática, esse banco mistura duas perspectivas do mesmo negócio:

* a visão operacional do trabalho executado 
* a visão financeira do que foi vendido, faturado, pago, recebido e apropriado por projeto

Esse é justamente o motivo de ele ser tão rico para BI: você consegue cruzar produção, prazo, esforço, custo, receita e margem dentro de um mesmo ecossistema. Isso aparece tanto no mini-DDL quanto no dicionário.

---

# 2. Núcleo principal do projeto: tabelas mais importantes 

## 2.1 projeto

A tabela projeto representa o nível mais alto do trabalho. Ela guarda a identidade do projeto, status global, datas, configurações de apontamento e regras de operação. No dicionário completo, ela possui colunas como Nome, Description, Cor, Ativo, PodeReportar, ComentarioObrigatorio, HoursWithBeginningEnd, BlockFutureReport, ReportOnDate, IsPrivate, Rateio, DataInicial, DataFinal, CustoPlanejado, ParentId, Categoria_Id, StatusTemplateId e RealEndDate.

**O que cada grupo de colunas faz**
* **Identificação:** Id, Nome, Description, Cor 
* **Estado do projeto:** Ativo, StatusTemplateId, RealEndDate 
* **Planejamento:** DataInicial, DataFinal, CustoPlanejado 
* **Regras de apontamento:** PodeReportar, ComentarioObrigatorio, HoursWithBeginningEnd, BlockFutureReport, ReportOnDate 
* **Estrutura:** ParentId para hierarquia entre projetos 
* **Classificação:** Categoria_Id 
* **Privacidade e rateio:** IsPrivate, Rateio 

**Regras de negócio importantes**

Foi com essa tabela que já trabalhamos regras como:
* status do projeto 
* situação do projeto 
* comparação entre data atual e prazo 
* uso de Ativo para classificar Em andamento / Inativo 
* uso de StatusTemplateId para trazer a situação do projeto 
* uso de RealEndDate para análises de prazo real versus planejado

Essa tabela é a base das consultas de Status do Projeto, Status da Etapa e várias análises por projeto que você já criou.

## 2.2 costcenters

costcenters é uma das tabelas mais importantes do banco porque funciona como a ponte entre o mundo operacional e o mundo financeiro. No dicionário completo, ela representa o centro de custo, com Id, ApportionRule, Color, Active, Name, Timestamp e Client_Id.

**O ponto mais importante aqui**

Em vários trechos do projeto, `costcenters.Id` e `projeto.Id` são tratados como se fossem o mesmo projeto lógico. Isso já apareceu explicitamente no seu contexto de trabalho e também se encaixa no uso que o banco faz das duas tabelas.

**Como interpretar corretamente**
* projeto = visão operacional e de gestão do projeto 
* costcenters = visão financeira/contábil do projeto 

**Implicação para BI**

Essa duplicidade é uma das regras mais importantes do modelo. Em muitos dashboards, a ligação correta é:

`boards.CostCenterId = costcenters.Id` 
`costcenters.Id = projeto.Id`

Ou seja, a etapa pertence a um centro de custo, e esse centro de custo representa o projeto lógico. Essa é uma regra estrutural crítica para qualquer consulta que combine tarefas com receitas, despesas ou fluxo de caixa.

## 2.3 boards

boards representa a etapa do projeto. No seu uso prático, ela é a camada intermediária entre projeto e tarefa. No dicionário completo, ela possui Id, Name, Description, Active, IsPrivate, Archived, CostCenterId, OwnerId, ServiceSaleId, IsGantt, IsTemplate, StatusTemplateId, StartDate, EndDate e RealEndDate.

**O papel de cada coluna**
* **Identidade:** Id, Name, Description 
* **Controle operacional:** Active, Archived, IsPrivate 
* **Ligação ao projeto:** CostCenterId 
* **Responsável pela etapa:** OwnerId 
* **Ligação comercial/opcional:** ServiceSaleId 
* **Planejamento:** StartDate, EndDate, RealEndDate 
* **Comportamento:** IsGantt, IsTemplate 
* **Status padrão da etapa:** StatusTemplateId 

**Regras de negócio que já usamos**

Com boards, você já montou:
* tela de Status de Etapa 
* análises por etapa 
* gráficos comparando tempo estimado vs reportado 
* somas por board 
* indicadores de quantidade de tarefas por etapa 
* cálculo de tempo médio de entrega da etapa 
* análises de horas por projeto e por etapa

Na prática, boards representa "a fase do projeto onde as tarefas vivem". É muito comum a consulta ser agregada nesse nível.

## 2.4 tasks

Essa é a tabela operacional central do sistema. No DDL resumido ela já aparece simplificada, mas no dicionário completo vemos que ela é bem mais rica: Id, Order, EndDate, Active, CreationDate, CreatorId, BoardId, StatusId, ServiceSaleItemId, Timestamp, BusinessValue, StoryPoints, ScheduleId, Priority, IsLocked, WorkFlowCardId, IsGantt, IgnoreHours, StartDate, Duration, SortOrder, Progress, ParentId, Type, Title, Description, DaysToDeadline, EstimatedEffort, ServiceId, UserId.

**O que cada coluna faz**
* **Identidade:** Id, Title, Description, Type 
* **Organização:** Order, SortOrder, BoardId, ParentId 
* **Status:** StatusId, Progress, IsLocked, Active 
* **Planejamento:** CreationDate, StartDate, EndDate, Duration, DaysToDeadline, EstimatedEffort 
* **Responsáveis:** CreatorId, UserId 
* **Valor de negócio / agilidade:** BusinessValue, StoryPoints, Priority 
* **Integração comercial:** ServiceSaleItemId, ServiceId 
* **Workflow:** WorkFlowCardId, ScheduleId, IsGantt, IgnoreHours 

**Regras de negócio fortes nessa tabela**

Foi com tasks que já construímos:
* tarefas finalizadas 
* tarefas atrasadas 
* tarefas não finalizadas 
* tarefas por colaborador 
* tarefas por projeto 
* tarefas por tag como "Revisão" ou "Bug" 
* esforço estimado vs realizado 
* completude de projeto 
* status derivado com base em prazo, fim real e status atual

Essa tabela é a base dos painéis mais ricos de produtividade. Ela também conecta tudo:
* com boards 
* com membro 
* com status 
* com taskhistories 
* com reportagem 
* com tagtasks 
* com comentários, anexos, subtarefas e agenda

## 2.5 membro

membro representa os colaboradores do sistema. No dicionário completo, ela é bem mais completa do que o DDL resumido, com colunas como Email, Nome, Perfil, Motivo, DataDesativacao, permissões diversas, IsMaster, IsVisible, ShortName etc.

**Função de negócio**

É a entidade que representa a pessoa no contexto operacional:
* dona da etapa (boards.OwnerId) 
* responsável da tarefa (tasks.UserId) 
* pessoa que apontou horas (reportagem.Membro_Id) 
* pessoa promovida (promocao.Membro_Id) 
* pessoa com carga e custo associados por cargo/reajuste 

**Por que ela é crítica para BI**

Muitas análises que você já construiu dependem dela:
* horas por colaborador 
* tarefas por colaborador 
* custo por colaborador 
* utilização por colaborador 
* promoções e custo histórico 
* férias, carga horária e cálculo de horas úteis

Ela é a chave do seu BI de pessoas/produtividade.

## 2.6 status e statustemplates

Essas duas tabelas são fundamentais e, ao mesmo tempo, uma das partes mais fáceis de interpretar errado.

**statustemplates**
Representa o modelo/semântica do status. No dicionário, ela tem Id, Name, Active, IsFinal, IsEditable.

**status**
Representa o status concreto usado numa board. Ela tem Id, Name, Order, Active, BoardId, Type, TemplateId.

**Relação correta**
`status.TemplateId -> statustemplates.Id` 
`tasks.StatusId -> status.Id` 

**Regra de negócio essencial**

Para descobrir se uma tarefa está realmente finalizada, o caminho conceitualmente mais seguro é:

`tasks.StatusId -> status.Id` 
`status.TemplateId -> statustemplates.Id` 
`statustemplates.IsFinal = 1`

Ao mesmo tempo, em várias consultas nós também usamos `status.Name LIKE '%Finalizad%'` para localizar o timestamp exato da transição no taskhistories. Isso é uma regra importante do modelo prático:

* `IsFinal = 1` é a verdade semântica 
* `Name LIKE '%Finalizad%'` foi útil para localizar a mudança histórica exata

Esse é um dos melhores exemplos de combinação entre regra formal e regra operacional no seu banco.

## 2.7 taskhistories

Essa tabela registra o histórico de alterações de cada tarefa. No dicionário, ela possui Id, UserId, TaskId, Timestamp, Action, PropertyName, OldValue, NewValue.

**Papel de negócio**

Ela permite reconstruir o passado da tarefa:
* quando mudou de status 
* quem mudou 
* qual era o valor antigo 
* qual foi o novo valor 

**O que já fizemos com ela**

Foi graças a essa tabela que você já conseguiu:
* descobrir quando a tarefa foi finalizada 
* calcular tempo até conclusão 
* validar se houve transição real para um status final 
* evitar preencher CompletionDate quando não há transição válida 
* identificar mudanças históricas para métricas de SLA 

**Regra importante**

Uma tarefa não deve ser considerada "finalizada em tal data" apenas porque o status atual é final. O correto, em várias análises, foi buscar em taskhistories a linha em que:
* PropertyName indica mudança de status 
* OldValue não era final 
* NewValue passou a ser final

Isso é BI de processo bem feito.

## 2.8 reportagem

reportagem é uma das tabelas mais valiosas do banco. Ela registra os apontamentos de horas. No dicionário completo, possui Id, CreditoHoras, HorasTrabalhadas, Detalhes, Dia, Membro_Id, Projeto_Id, Task_Id, HorarioInicio, HorarioFim, Sabado, DomingoFeriado, AdicionalNoturno, PercentualNoturno, ReportStatus.

**Papel de negócio**

Ela é o elo entre:
* quem trabalhou 
* em qual projeto 
* em qual tarefa 
* em que dia 
* quantas horas 
* com quais adicionais 

**Tudo que já foi possível fazer com essa tabela**

Você já usou reportagem para:
* total de horas apontadas 
* horas por colaborador 
* horas por tarefa 
* horas por projeto 
* taxa de utilização 
* custo por colaborador 
* horas úteis vs horas reportadas 
* cálculo de produtividade 
* somar esforço real de tasks 
* montar telas como Horas/Pessoas por projeto 
* alimentar análises de receita, margem e custo 

**Regras de negócio importantes**
* Dia virou a melhor coluna de filtro temporal no Metabase 
* Task_Id permite trazer esforço real por tarefa 
* Projeto_Id permite rateio/projeto mesmo quando a tarefa não é usada 
* HorarioInicio e HorarioFim são relevantes quando o projeto exige horas com começo/fim 
* Sabado, DomingoFeriado, AdicionalNoturno podem alimentar custo diferenciado

Essa é a tabela central da parte de people analytics e custo operacional.

## 2.9 tags e tagtasks

Essas tabelas servem para classificação transversal das tarefas. tags define as etiquetas; tagtasks faz a relação N:N entre tarefa e tag.

**Casos que já fizemos**
* tarefas com tag Revisão 
* tarefas com tag Bug 
* agrupamento de tags via GROUP_CONCAT 
* classificação auxiliar de tarefas sem depender do status

As tags são ótimas porque capturam dimensão de negócio que o status não captura. Exemplo:
* status = andamento 
* tag = revisão 
* logo, é uma tarefa em revisão ainda não finalizada 

---

# 3. Tabelas auxiliares que enriquecem muito o BI 

## 3.1 customfields, customfieldentities, customfieldvalues, customfieldanswers

Essas tabelas dão flexibilidade ao sistema. Elas permitem que projeto ou etapa tenha campos personalizados configuráveis.

**Como elas funcionam**
* customfields = definição do campo 
* customfieldvalues = opções possíveis do campo 
* customfieldentities = em que tipo de entidade o campo existe 
* customfieldanswers = resposta preenchida para aquela entidade 

**O que já fizemos com isso**

O melhor exemplo é o campo Núcleo:
* localizar `customfields.Name = 'Núcleo'` 
* usar customfieldvalues e/ou customfieldanswers 
* consolidar múltiplos valores com GROUP_CONCAT

Isso permitiu enriquecer telas como:
* Status de Tarefa 
* Status de Etapa 
* Horas/Pessoas por projeto 
* Tempo médio de entrega da etapa

Essas tabelas transformam o modelo rígido em modelo configurável.

## 3.2 comments, attachments, subtasks

Essas tabelas não são sempre centrais para KPI, mas são importantíssimas para análises mais ricas de processo:
* comments registra interações na tarefa 
* attachments registra evidências e arquivos 
* subtasks detalha execução dentro da tarefa

Elas podem gerar métricas como:
* tarefas com muita troca de comentário 
* tarefas sem documentação 
* tarefas grandes com muitas subtarefas 
* indicadores indiretos de complexidade e retrabalho

## 3.3 ganttlinks, taskschedules, workflowcards, workflowinstances, workflows

Essas tabelas acrescentam uma camada de planejamento e automação:
* dependências entre tarefas 
* agendamentos recorrentes 
* cartões de workflow 
* instâncias de fluxo

Isso mostra que o sistema não é apenas um "kanban simples"; ele tem componentes de BPM e Gantt. Para BI, isso abre espaço para:
* lead time por fluxo 
* gargalos por tipo de etapa 
* dependências críticas 
* atraso em tarefas predecessoras

---

# 4. Bloco financeiro: o outro coração do banco

O dicionário completo mostra que existe um módulo financeiro extremamente robusto, muito além do operacional.

## 4.1 cashflowcategories

É a taxonomia financeira do sistema. A coluna CategoryType classifica receitas, despesas, impostos, gasto com pessoal, custo de serviço, receita com produtos etc.

**Por que ela é vital**

É ela que permite transformar transações soltas em:
* DRE 
* margem 
* custo operacional 
* impostos 
* resultado por projeto 
* análises por categoria 

## 4.2 cashflowitems

É a tabela-base do fluxo de caixa. Tem Date, DueDate, CompetenceDate, InvoiceNumber, InvoiceDate, Description, Value, BilledValue, RefundedValue, Generated, Executed, CostCenter_Id, Person_Id, BankAccount_Id, Category_Id, Company_Id, Timestamp.

**Papel de negócio**

Ela representa o lançamento financeiro elementar. Contém mais dados da venda do que a `servicesale`.

**O que já fizemos ou já ficou viável fazer**
* receita por projeto 
* despesa por projeto 
* análises mensais por competência 
* DRE 
* impostos retidos 
* cruzamento com vendas de serviço 
* composição de receita, custo e margem 

**Regra crucial**

Você já validou que, em alguns cenários:
* Date = data de compensação 
* DueDate = vencimento 
* CompetenceDate = competência contábil

Essa distinção é essencial para não misturar fluxo de caixa com regime de competência.

## 4.3 servicesales, servicesaleitems, servicesalepayments, servicesaleinvoices, servicesaletaxes

Esse conjunto representa o ciclo de venda de serviços.

**Cadeia lógica**
* servicesales = cabeçalho da venda (dados básicos, sem parcelas) 
* servicesaleitems = itens vendidos 
* servicesalepayments = parcelas/pagamentos (aqui ficam os dados das parcelas) 
* servicesaleinvoices = notas fiscais 
* servicesaletaxes = impostos calculados 

**O que isso permite**
* receita por venda 
* receita por projeto 
* receita por cliente 
* venda atual vs orçamento (IsActual) 
* recorrência de vendas 
* retenções 
* notas emitidas 
* impostos por venda 
* faturamento e cobrança 

**Regras que você já usou**
* considerar `ParentVersion_Id IS NULL` para evitar duplicidade entre versões 
* diferenciar `IsActual = 1` de orçamento 
* tratar retenções e impostos separadamente 
* usar essas tabelas para análises de receitas mensais

## 4.4 clients, suppliers, companies, bankaccounts, paymenttypes

Essas são tabelas mestras do financeiro:
* clients = quem compra 
* suppliers = quem fornece 
* companies = empresas emissoras/tomadoras 
* bankaccounts = contas usadas no financeiro 
* paymenttypes = forma de pagamento

Com elas, o BI pode segmentar:
* receita por cliente 
* despesa por fornecedor 
* resultados por empresa do grupo 
* conciliação por conta bancária 
* taxas por forma de pagamento

---

# 5. Bloco de RH/custo: essencial para os dashboards que você já fez 

## 5.1 cargo, promocao, reajuste, encargo, encargo_item, carga_horaria, feriado, vacation

Essas tabelas suportam o cálculo de custo com pessoal e horas úteis.

**Papel de cada uma**
* cargo = função/cargo 
* promocao = histórico de cargo por membro 
* reajuste = histórico salarial/custo 
* encargo = regra por regime/tributação 
* encargo_item = componentes do encargo 
* carga_horaria = horas por dia da semana 
* feriado = dias não úteis 
* vacation = férias 

**O que você já construiu com isso**
* taxa de utilização 
* horas úteis 
* horas apontadas 
* custo por colaborador 
* gasto com pessoal 
* indicadores mensais por colaborador 
* cálculo correto considerando férias, feriados e carga vigente do cargo

Esse é um dos blocos mais sofisticados do seu projeto de BI.

---

# 6. Regras de negócio mais importantes que esse banco permite

Aqui estão as principais regras que já extraímos ou que o modelo suporta muito bem:

## 6.1 Projeto, cost center e board 
* Um projeto lógico pode aparecer como projeto e também como costcenters 
* Uma board pertence a um costcenter 
* Frequentemente `costcenters.Id = projeto.Id` 

## 6.2 Tarefa finalizada (Regra Oficial do BI)

Para considerar uma tarefa como FINALIZADA e contabilizada em produtividade, TODAS as seguintes condições estritas devem ser atendidas simultaneamente:
1. A tarefa não pode estar deletada (`tasks.Active = 1`).
2. O status ATUAL da tarefa deve pertencer a um template classificado como final (`current_template.IsFinal = 1`).
3. Deve existir um registro em `taskhistories` (`PropertyName = 'StatusId'`) onde a tarefa mudou para um status cujo template seja final (`new_template.IsFinal = 1`). Não faça joins restritivos com 'old_status' que possam excluir casos onde o valor antigo é vazio (ex: tarefa já criada finalizada) ou transições entre dois status finais distintos.

## 6.3 Data de conclusão real

Uma mesma tarefa pode ter sido fechada, reaberta e fechada novamente.
Para contagem de tarefas por período (ex: "quantas finalizadas em 2026"):
* A "data de conclusão" oficial sempre será o Timestamp da **ÚLTIMA** transição de finalização que ocorreu (`ORDER BY taskhistories.Timestamp DESC LIMIT 1` por tarefa).
* Portanto, se uma tarefa foi finalizada em 2025, reaberta, e finalizada novamente em 2026, ela conta em 2026.

## 6.4 Horas trabalhadas

As horas reais vêm de `reportagem.HorasTrabalhadas`, não de `tasks.EstimatedEffort`

**Regra de atribuição de projeto nas horas:**
Ao calcular horas por projeto, a fonte da verdade segue a seguinte hierarquia:
1. Se o apontamento possui uma Tarefa (`Task_Id`), o projeto real é o Centro de Custo da Etapa (`boards.CostCenterId`).
2. Se o apontamento NÃO possui Tarefa, o projeto real é o identificado no apontamento (`reportagem.Projeto_Id`).
Essa regra é crucial porque tarefas podem ser movidas entre boards de centros de custo diferentes sem que o apontamento histórico seja alterado manualmente.

## 6.5 Esforço estimado vs realizado 
* estimado = `tasks.EstimatedEffort`
* realizado = soma de `reportagem.HorasTrabalhadas` por Task_Id 

## 6.6 Situação temporal

Atraso, prazo e adiantamento podem ser inferidos comparando:
* `CURRENT_DATE()` 
* `tasks.EndDate` ou `boards.EndDate` ou `projeto.DataFinal` 
* além do status final ou não 

## 6.7 Núcleo e outros atributos personalizados

Informações como "Núcleo" não estão fixas no schema principal; elas vêm da estrutura de custom fields

## 6.8 Regras Oficiais Financeiras: Evolução (Extrato) vs. Lucratividade (Receita/Despesa Pura)

Existem duas formas distintas de extrair dados financeiros, dependendo da pergunta do usuário. A IA deve identificar qual regra aplicar:

### CENÁRIO A: Evolução Financeira ou Extrato (Faturamento Mensal, Extrato de Contas)
Se a pergunta for sobre "evolução financeira", "faturamento mensal", "extrato" ou fluxo de caixa realizado:
*   **Data de Referência:** Sempre usar `COALESCE(Date, DueDate)`. NÃO utilizar `CompetenceDate`.
*   **Filtro de Execução:** Considerar EXCLUSIVAMENTE lançamentos executados (`Executed = 1`).
*   **Rateio de Impostos (servicesaletaxes):** É obrigatório ratear os impostos incidentes sobre vendas. Identificar a venda (`servicesalepayments`), calcular o peso da parcela (`GrossValue` / Total Pago da Venda) e distribuir o imposto. A data de referência é a `EffectiveDate` da parcela.
*   **Valores Agrupados:** Os impostos rateados de vendas somam-se às Receitas (lançamentos positivos). Impostos rateados de despesas somam-se às Despesas (lançamentos negativos convertidos para positivo).

### CENÁRIO B: Lucratividade, Margem Direta ou Receita/Despesa Pura (Visão Gerencial/Contábil)
Se a pergunta for estritamente sobre "Lucratividade", "Margem", "Receitas puras" ou "Despesas puras":
*   **Data de Referência:** Sempre usar `CompetenceDate` (competência). Ignorar registros onde a competência é nula.
*   **Sem Impostos Embutidos:** Não aplicar a lógica de rateio de `servicesaletaxes` nos valores base. Receita é Receita e Despesa é Despesa.
*   **Rateio (Sharing):** O rateio (tabela `financesharingcaches`) SÓ deve ser considerado se o cliente pedir expressamente ou ao calcular o 'Resultado Final' (Lucro Líquido). O cálculo é `SharingRevenue - SharingExpense`. O Rateio NÃO deve ser somado à Receita ou Despesa diretamente, mas apresentado numa coluna isolada.
*   **Indicadores Separados:**
    *   **Receita:** `SUM(ABS(Value))` onde `Value > 0`.
    *   **Despesa:** `SUM(ABS(Value))` onde `Value < 0`.
    *   **Margem Direta:** `Receita - Despesa`
    *   **Resultado (Lucro/Prejuízo):** `Receita + Rateio - Despesa`
*   **Filtros Comuns:** Ignorar lançamentos de transferência (`Transfer_Id IS NOT NULL`). Aplicar exclusão de duplicidades de `Parent_Id` para filhos diferentes de `Type = 1`.

---


## 6.9 Integridade de Centro de Custo

Para evitar discrepâncias em projetos como "Flowup - P&D", o BI deve sempre cruzar o apontamento com a board da tarefa para validar se o Centro de Custo daquela boards coincide com o projeto informado. Se divergirem, o Centro de Custo da board prevalece para fins de análise financeira e de esforço oficial.

## 6.10 Detalhamento de Tabelas Financeiras (Parcelas e Vendas)

Para consultas que envolvem detalhes de vendas e recebimentos:
*   **`servicesales`**: Contém apenas os dados básicos da venda. **Não contém dados de parcelas**.
*   **`servicesalepayments`**: É a tabela onde se encontram as **parcelas** (pagamentos) de cada venda.
*   **`cashflowitems`**: Contém dados mais detalhados da venda que não estão presentes na `servicesales`, sendo a base para o fluxo de caixa real.

---

# 7. O que já fizemos com essas tabelas

Com base no histórico do projeto e na estrutura dessas tabelas, já foi possível construir ou derivar:
* Status de Projeto 
* Status de Etapa 
* Status de Tarefa 
* Tempo médio de entrega da etapa 
* Horas/Pessoas por projeto 
* Taxa de utilização 
* Horas úteis vs horas apontadas 
* Gasto com pessoal 
* Receita total 
* Despesas e impostos retidos 
* Receitas mensais 
* Score mensal por empresa 
* Quantidade de tarefas finalizadas por colaborador 
* Quantidade de tarefas atrasadas 
* Quantidade de tarefas com tag Revisão 
* Tempo estimado vs tempo reportado por etapa 
* Completude de projeto 
* Projetos atrasados / em andamento / concluídos 
* Análises com núcleo e responsável do projeto 
* Cálculo de custo por colaborador considerando cargo, férias, encargos e reajuste

Ou seja: esse modelo já suporta um BI operacional-financeiro bastante robusto. Não é só um banco de tarefas; é um banco que junta execução, esforço, custo, receita e governança.

---

# 8. O que está ruim no DDL atual e como melhorar de verdade

O DDL que você colou está bom como visão simplificada, mas ainda está fraco como documentação técnica. Os principais problemas são:

## 8.1 Inconsistência de nomes

Há mistura de:
* singular e plural: task/tasks, board/boards 
* português e inglês: projeto, membro, reportagem com boards, tasks, status 
* maiúsculas/minúsculas: Boards, Tasks, TagTasks, status 

**Melhor prática**

Escolher um padrão único, por exemplo:
* tabelas em snake_case 
* nomes em inglês 
* FKs como `<entity>_id`

Exemplo:
* projects 
* members 
* boards 
* tasks 
* task_histories 
* time_entries 

## 8.2 Falta de FKs explícitas

O DDL simplificado descreve relações, mas não traz FOREIGN KEY formais. Isso enfraquece:
* integridade 
* legibilidade 
* engenharia reversa 
* documentação automática 

## 8.3 Falta de índices de BI

Para Metabase e consultas analíticas, algumas colunas deveriam estar obviamente indexadas:
* tasks.BoardId 
* tasks.StatusId 
* tasks.UserId 
* boards.CostCenterId 
* reportagem.Task_Id 
* reportagem.Membro_Id 
* reportagem.Projeto_Id 
* reportagem.Dia 
* taskhistories.TaskId 
* taskhistories.PropertyName 
* taskhistories.Timestamp 
* cashflowitems.CostCenter_Id 
* cashflowitems.Date 
* cashflowitems.CompetenceDate 

## 8.4 Duplicidade conceitual de projeto

projeto e costcenters parecem representar o mesmo objeto em duas visões diferentes. Isso é funcional, mas confuso.

**Melhor forma de documentar**

Deixar explícito no DDL enriquecido que:
* costcenters é o identificador financeiro do projeto 
* projeto é a entidade operacional do projeto 
* em muitas regras, eles compartilham o mesmo Id 

## 8.5 Falta de colunas de auditoria padrão

Algumas tabelas têm Timestamp; outras têm CreationDate; outras têm ambos.

**Melhor prática**

Padronizar:
* created_at 
* updated_at 
* deleted_at quando aplicável 
* created_by 
* updated_by 

---

# 9. Versão melhorada do DDL lógico principal

Abaixo está uma versão muito melhorada do DDL principal, não para recriar o banco inteiro agora, mas para documentar corretamente o modelo central do projeto.

```sql
-- ========================================================= 
-- CORE DOMAIN: PROJECT / BOARD / TASK / TIME ENTRY 
-- Logical documentation-oriented DDL 
-- Comentários em português 
-- =========================================================

CREATE TABLE projeto ( 
    Id INT NOT NULL AUTO_INCREMENT, 
    Nome VARCHAR(100) NOT NULL, 
    Description VARCHAR(2000) NULL, 
    Cor LONGTEXT NULL, 
    Ativo BIT(1) NOT NULL, 
    PodeReportar BIT(1) NOT NULL, 
    ComentarioObrigatorio BIT(1) NOT NULL, 
    HoursWithBeginningEnd BIT(1) NOT NULL, 
    BlockFutureReport BIT(1) NOT NULL, 
    ReportOnDate BIT(1) NOT NULL, 
    IsPrivate BIT(1) NOT NULL, 
    Rateio INT NOT NULL, 
    DataInicial DATETIME NULL, 
    DataFinal DATETIME NULL, 
    CustoPlanejado DOUBLE NOT NULL, 
    ParentId INT NULL, 
    Categoria_Id INT NULL, 
    StatusTemplateId INT NULL, 
    RealEndDate DATETIME NULL, 
    PRIMARY KEY (Id) 
    -- FK ParentId -> projeto.Id 
    -- FK Categoria_Id -> categoria_projeto.Id 
    -- FK StatusTemplateId -> statustemplates.Id 
);

CREATE TABLE costcenters ( 
    Id INT NOT NULL AUTO_INCREMENT, 
    ApportionRule INT NOT NULL, 
    Color VARCHAR(50) NOT NULL, 
    Active BIT(1) NOT NULL, 
    Name VARCHAR(100) NOT NULL, 
    Timestamp DATETIME NOT NULL, 
    Client_Id INT NULL, 
    PRIMARY KEY (Id), 
    UNIQUE KEY uq_costcenters_name (Name) 
    -- FK Client_Id -> clients.Id 
    -- Regra de negócio: frequentemente representa o mesmo projeto lógico de projeto.Id 
);

CREATE TABLE membro ( 
    Id INT NOT NULL AUTO_INCREMENT, 
    Email LONGTEXT NULL, 
    Nome LONGTEXT NULL, 
    Perfil INT NULL, 
    Motivo INT NULL, 
    DataDesativacao DATETIME NULL, 
    CanReport BIT(1) NULL, 
    CanSeeRevenueItems BIT(1) NULL, 
    CanSeeOnlyRefundedValues BIT(1) NULL, 
    CanSeeBalance BIT(1) NULL, 
    CanSeeProjectResult BIT(1) NULL, 
    CanSeeUsersAndJobs BIT(1) NULL, 
    IsMaster BIT(1) NULL, 
    IsVisible BIT(1) NULL, 
    ReportingPermission INT NULL, 
    ShortName VARCHAR(100) NULL, 
    PRIMARY KEY (Id) 
);

CREATE TABLE boards ( 
    Id INT NOT NULL AUTO_INCREMENT, 
    Name VARCHAR(100) NOT NULL, 
    Description VARCHAR(1000) NULL, 
    Active BIT(1) NOT NULL, 
    IsPrivate BIT(1) NOT NULL, 
    Archived BIT(1) NOT NULL, 
    CostCenterId INT NOT NULL, 
    OwnerId INT NULL, 
    ServiceSaleId INT NULL, 
    IsGantt BIT(1) NOT NULL, 
    IsTemplate BIT(1) NOT NULL, 
    StatusTemplateId INT NULL, 
    StartDate DATETIME NULL, 
    EndDate DATETIME NULL, 
    RealEndDate DATETIME NULL, 
    PRIMARY KEY (Id), 
    KEY idx_boards_costcenter (CostCenterId), 
    KEY idx_boards_owner (OwnerId), 
    KEY idx_boards_dates (StartDate, EndDate) 
    -- FK CostCenterId -> costcenters.Id 
    -- FK OwnerId -> membro.Id 
    -- FK StatusTemplateId -> statustemplates.Id 
);

CREATE TABLE statustemplates ( 
    Id INT NOT NULL AUTO_INCREMENT, 
    Name VARCHAR(100) NOT NULL, 
    Active BIT(1) NOT NULL, 
    IsFinal BIT(1) NOT NULL, 
    IsEditable BIT(1) NOT NULL, 
    PRIMARY KEY (Id) 
);

CREATE TABLE status ( 
    Id INT NOT NULL AUTO_INCREMENT, 
    Name VARCHAR(100) NOT NULL, 
    `Order` INT NOT NULL, 
    Active BIT(1) NOT NULL, 
    BoardId INT NOT NULL, 
    Type INT NOT NULL, 
    TemplateId INT NULL, 
    PRIMARY KEY (Id), 
    KEY idx_status_board (BoardId), 
    KEY idx_status_template (TemplateId) 
    -- FK BoardId -> boards.Id 
    -- FK TemplateId -> statustemplates.Id 
);

CREATE TABLE financesharingcaches (
    Id INT NOT NULL AUTO_INCREMENT,
    SourceProject INT NOT NULL,
    PayingProject INT NOT NULL,
    ReferenceMonth INT NOT NULL,
    ReferenceYear INT NOT NULL,
    SharingExpense DOUBLE NOT NULL,
    SharingRevenue DOUBLE NOT NULL,
    PRIMARY KEY (Id)
    -- FK SourceProject -> costcenters.Id
    -- FK PayingProject -> costcenters.Id
);

CREATE TABLE tasks ( 
    Id INT NOT NULL AUTO_INCREMENT, 
    `Order` INT NOT NULL, 
    EndDate DATETIME NULL, 
    Active BIT(1) NOT NULL, 
    CreationDate DATETIME NOT NULL, 
    CreatorId INT NOT NULL, 
    BoardId INT NOT NULL, 
    StatusId INT NOT NULL, 
    ServiceSaleItemId INT NULL, 
    Timestamp DATETIME NULL, 
    BusinessValue INT NOT NULL, 
    StoryPoints INT NOT NULL, 
    ScheduleId INT NULL, 
    Priority INT NULL, 
    IsLocked BIT(1) NOT NULL, 
    WorkFlowCardId INT NULL, 
    IsGantt BIT(1) NOT NULL, 
    IgnoreHours BIT(1) NOT NULL, 
    StartDate DATETIME NULL, 
    Duration INT NOT NULL, 
    SortOrder INT NOT NULL, 
    Progress DECIMAL(10,2) NOT NULL, 
    ParentId INT NULL, 
    Type VARCHAR(100) NULL, 
    Title VARCHAR(500) NOT NULL, 
    Description VARCHAR(2000) NULL, 
    DaysToDeadline INT NULL, 
    EstimatedEffort DOUBLE NOT NULL, 
    ServiceId INT NULL, 
    UserId INT NULL, 
    PRIMARY KEY (Id), 
    KEY idx_tasks_board (BoardId), 
    KEY idx_tasks_status (StatusId), 
    KEY idx_tasks_user (UserId), 
    KEY idx_tasks_dates (CreationDate, StartDate, EndDate), 
    KEY idx_tasks_parent (ParentId) 
    -- FK CreatorId -> membro.Id 
    -- FK BoardId -> boards.Id 
    -- FK StatusId -> status.Id 
    -- FK UserId -> membro.Id 
    -- FK ParentId -> tasks.Id 
);

CREATE TABLE taskhistories ( 
    Id INT NOT NULL AUTO_INCREMENT, 
    UserId INT NOT NULL, 
    TaskId INT NOT NULL, 
    Timestamp DATETIME NOT NULL, 
    Action INT NOT NULL, 
    PropertyName VARCHAR(100) NOT NULL, 
    OldValue LONGTEXT NULL, 
    NewValue LONGTEXT NULL, 
    PRIMARY KEY (Id), 
    KEY idx_taskhistories_task (TaskId), 
    KEY idx_taskhistories_property (PropertyName), 
    KEY idx_taskhistories_timestamp (Timestamp) 
    -- FK UserId -> membro.Id 
    -- FK TaskId -> tasks.Id 
);

CREATE TABLE tags ( 
    Id INT NOT NULL AUTO_INCREMENT, 
    Name VARCHAR(100) NOT NULL, 
    Color VARCHAR(50) NULL, 
    Active BIT(1) NOT NULL, 
    PRIMARY KEY (Id) 
);

CREATE TABLE tagtasks ( 
    Task_Id INT NOT NULL, 
    Tag_Id INT NOT NULL, 
    PRIMARY KEY (Task_Id, Tag_Id), 
    KEY idx_tagtasks_tag (Tag_Id) 
    -- FK Task_Id -> tasks.Id 
    -- FK Tag_Id -> tags.Id 
);

CREATE TABLE reportagem ( 
    Id INT NOT NULL AUTO_INCREMENT, 
    CreditoHoras DOUBLE NOT NULL, 
    HorasTrabalhadas DOUBLE NOT NULL, 
    Detalhes VARCHAR(1000) NULL, 
    Dia DATETIME NOT NULL, 
    Membro_Id INT NOT NULL, 
    Projeto_Id INT NOT NULL, 
    Task_Id INT NULL, 
    HorarioInicio DATETIME NULL, 
    HorarioFim DATETIME NULL, 
    Sabado DOUBLE NULL, 
    DomingoFeriado DOUBLE NULL, 
    AdicionalNoturno DOUBLE NULL, 
    PercentualNoturno DOUBLE NULL, 
    ReportStatus INT NOT NULL, 
    PRIMARY KEY (Id), 
    KEY idx_reportagem_member (Membro_Id), 
    KEY idx_reportagem_project (Projeto_Id), 
    KEY idx_reportagem_task (Task_Id), 
    KEY idx_reportagem_day (Dia) 
    -- FK Membro_Id -> membro.Id 
    -- FK Projeto_Id -> projeto.Id 
    -- FK Task_Id -> tasks.Id 
)

CREATE TABLE cashflowitems ( 
    Id INT NOT NULL AUTO_INCREMENT, 
    Date DATETIME NULL, 
    DueDate DATETIME NULL, 
    CompetenceDate DATETIME NULL, 
    InvoiceNumber VARCHAR(200) NULL, 
    InvoiceDate DATETIME NULL, 
    Description VARCHAR(500) NOT NULL, 
    Value DECIMAL(18,2) NOT NULL, 
    BilledValue DECIMAL(18,2) NOT NULL, 
    RefundedValue DECIMAL(18,2) NOT NULL, 
    Generated BIT(1) NOT NULL, 
    Executed BIT(1) NOT NULL, 
    CostCenter_Id INT NULL, 
    Person_Id INT NULL, 
    BankAccount_Id INT NOT NULL, 
    Category_Id INT NOT NULL, 
    Company_Id INT NOT NULL, 
    TransactionId VARCHAR(2048) NULL, 
    Parent_Id INT NULL, 
    Client_Id INT NULL, 
    Supplier_Id INT NULL, 
    ApprovedPayment BIT(1) NULL, 
    ApprovedPaymentDate DATETIME NULL, 
    Type INT NULL, 
    Timestamp DATETIME NOT NULL, 
    ServiceSaleInvoice_Id INT NULL, 
    Transfer_Id INT NULL, 
    
    PRIMARY KEY (Id), 

    -- FK CostCenter_Id -> costcenters.Id
    -- FK Client_Id -> clients.Id
    -- FK Supplier_Id -> suppliers.Id
    -- FK Company_Id -> companies.Id
    -- FK Category_Id -> cashflowcategories.Id
    -- FK BankAccount_Id -> bankaccounts.Id
    -- FK ServiceSaleInvoice_Id -> servicesaleinvoices.Id

    -- Regra de negócio:                                                                                                                                                                                                                                                                                                                  
    -- Representa TODAS as movimentações financeiras (receitas e despesas)
    -- Value > 0 = Receita
    -- Value < 0 = Despesa
    -- CostCenter_Id conecta diretamente ao projeto
    -- Executed = 1 indica que a transação foi realizada
    -- Generated = 1 indica que foi gerada automaticamente
    -- Parent_Id evita duplicidade (parcelas / agrupamentos)
    -- Transfer_Id indica transferências internas (devem ser tratadas com cuidado)
)

CREATE TABLE servicesales ( 
    Id INT NOT NULL AUTO_INCREMENT,
    WithholdingTaxes DECIMAL(18,2) NOT NULL,
    IsWithHoldingISS BIT(1) NOT NULL,
    IsActual BIT(1) NOT NULL,
    IsApproved BIT(1) NOT NULL,
    Date DATETIME NOT NULL,
    Client_Id INT NULL,
    Serie VARCHAR(5) NULL,
    Total DECIMAL(18,2) NOT NULL,
    Canceled BIT(1) NOT NULL,
    Delivered BIT(1) NOT NULL,
    Closed BIT(1) NOT NULL,
    CostCenterId INT NULL,
    BankAccountId INT NULL,
    Company_Id INT NULL,
    Timestamp DATETIME NOT NULL,
    BankAgreement_Id INT NULL,
    ParentVersion_Id INT NULL,
    ParentRecurringSale_Id INT NULL,
    User_Id INT NOT NULL,

    PRIMARY KEY (Id),

    -- FK CostCenterId -> costcenters.Id
    -- FK Client_Id -> clients.Id
    -- FK Company_Id -> companies.Id
    -- FK BankAgreement_Id -> bankagreement.Id
    -- FK ParentVersion_Id -> servicesales.Id
    -- FK ParentRecurringSale_Id -> recurringsales.Id
    -- FK RecurringSale_Id -> recurringsales.Id
    -- FK User_Id -> users.Id

    -- Regra de negócio:
    -- Representa as vendas de serviços (origem da receita)
    -- Total = valor total da venda (antes de impostos/fluxo de caixa)
    -- CostCenterId conecta diretamente ao projeto
    -- IsActual = 1 indica venda real (vs previsão/orçamento)
    -- IsApproved = 1 indica venda validada
    -- Canceled = 1 indica venda cancelada (deve ser ignorada)
    -- Closed = 1 indica venda finalizada
    -- ParentVersion_Id controla versionamento (evitar duplicidade)
);