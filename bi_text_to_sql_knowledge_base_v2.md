# Base de Conhecimento Semântica do BI — Text-to-SQL RAG

**Versão:** 2.0  
**Data de consolidação:** 2026-08-17  
**Banco principal:** MySQL  
**Uso:** grounding semântico para geração de SQL, recuperação de schema, validação de JOINs e aplicação de regras de negócio no BI.

---

# 0. REGRA DE PRIORIDADE DAS FONTES

Quando houver conflito entre documentos, consultas antigas e decisões recentes, seguir esta ordem:

1. **Decisão explícita mais recente do projeto**
2. **SQL recente já validado contra o MySQL**
3. **DDL físico do banco**
4. **Dicionário de dados**
5. **Documentação ou regras antigas**
6. **Inferências**

Nunca substituir silenciosamente uma regra recente por uma interpretação antiga.

Se existir conflito não resolvido entre duas fontes de mesma prioridade, o agente deve:
- não inventar;
- sinalizar a ambiguidade;
- preferir uma consulta de validação simples antes de gerar uma análise definitiva.

---

# 1. ESCOPO AUTORIZADO DO RAG

## 1.1 Restrições absolutas

Este RAG **não deve consultar, recuperar schema, mencionar como fonte de dados nem gerar SQL para**:

- o schema `global`;
- dados de MRR;
- dados de HealthScore;
- tabelas de sistema;
- `information_schema`;
- qualquer fonte que não esteja explicitamente autorizada nesta base.

Uma tabela que também exista em outro schema não se torna automaticamente autorizada.  
O agente deve considerar **schema + nome físico da tabela**.

## 1.2 Regra anti-alucinação de schema

Se uma pergunta exigir uma coluna ou entidade que não existe nas tabelas autorizadas:

1. não inventar coluna;
2. não inventar JOIN;
3. não tentar buscar uma tabela equivalente em schema proibido;
4. informar que a métrica não pode ser reproduzida com o conjunto autorizado;
5. quando possível, sugerir qual informação autorizada adicional seria necessária.

## 1.3 SQL permitido

Por padrão, o agente gera apenas:

```sql
-- Somente leitura.
SELECT ...
```

Bloquear:
- `INSERT`
- `UPDATE`
- `DELETE`
- `DROP`
- `ALTER`
- `TRUNCATE`
- `CREATE`
- `REPLACE`
- procedures;
- triggers;
- múltiplos statements;
- consultas a schemas de sistema.

Consultas de detalhe devem utilizar paginação ou `LIMIT`, normalmente:

```sql
LIMIT 500
```

Consultas puramente agregadas podem dispensar `LIMIT`.

---

# 2. VISÃO CONCEITUAL DO MODELO

O BI possui quatro domínios principais autorizados:

1. **Projetos, etapas, tarefas e horas**
2. **Financeiro**
3. **Pessoas, capacidade e custo de trabalho**
4. **NFSe e Open Finance**

A entidade "projeto" possui duas representações importantes:

- `projeto`: entidade operacional;
- `CostCenters`: entidade financeira.

Essas entidades possuem forte correspondência lógica no BI, porém o agente não deve assumir que todos os relacionamentos físicos são idênticos sem observar o caminho correto.

---

# 3. CATÁLOGO DE TABELAS AUTORIZADAS

> Os nomes abaixo devem ser tratados como **case-sensitive**.

---

## 3.1 PROJETOS, ETAPAS, TAREFAS E HORAS

### `projeto`

**Função:** cadastro operacional de projetos.

**Colunas conhecidas e relevantes:**

| Coluna | Tipo lógico | Significado |
|---|---|---|
| `Id` | INT | Identificador do projeto |
| `Nome` | VARCHAR | Nome do projeto |
| `Description` | VARCHAR | Descrição |
| `Cor` | LONGTEXT | Cor associada |
| `Ativo` | BIT | Projeto ativo |
| `PodeReportar` | BIT | Permite apontamento |
| `ComentarioObrigatorio` | BIT | Comentário obrigatório |
| `HoursWithBeginningEnd` | BIT | Usa início/fim no apontamento |
| `BlockFutureReport` | BIT | Bloqueia apontamento futuro |
| `ReportOnDate` | BIT | Regras de reporte por data |
| `IsPrivate` | BIT | Projeto privado |
| `Rateio` | INT | Configuração de rateio |
| `DataInicial` | DATETIME | Início planejado |
| `DataFinal` | DATETIME | Fim planejado |
| `CustoPlanejado` | DOUBLE | Custo planejado |
| `ParentId` | INT | Relacionamento hierárquico/pasta conforme DDL |
| `Categoria_Id` | INT | Categoria do projeto |
| `StatusTemplateId` | INT | Template de status |
| `RealEndDate` | DATETIME | Data real de término |

**Uso semântico:**
- projeto operacional;
- datas planejadas e reais;
- status macro de projeto;
- apontamentos sem tarefa podem se ligar diretamente a `reportagem.Projeto_Id`.

**Atenção:** o `ParentId` não deve ser tratado automaticamente como auto-relacionamento de projeto. O DDL deve prevalecer para esse vínculo.

---

### `CostCenters`

**Função:** centro de custo / representação financeira do projeto.

**Colunas:**

| Coluna | Tipo lógico | Significado |
|---|---|---|
| `Id` | INT | Identificador |
| `ApportionRule` | INT | Regra de rateio |
| `Color` | VARCHAR | Cor |
| `Active` | BIT | Ativo |
| `Name` | VARCHAR | Nome do centro de custo/projeto |
| `Timestamp` | DATETIME | Última atualização |
| `Client_Id` | INT | Cliente associado |

**Relacionamentos principais:**
- `CostCenters.Client_Id -> Clients.Id`
- frequentemente o identificador lógico do projeto coincide com `projeto.Id`;
- `CashFlowItems.CostCenter_Id -> CostCenters.Id`.

**Regra:** em consultas financeiras, o projeto deve normalmente vir de `CostCenters`.

---

### `Boards`

**Função:** etapas/quadros dentro dos projetos.

**Colunas:**

| Coluna | Tipo lógico | Significado |
|---|---|---|
| `Id` | INT | Identificador |
| `Name` | VARCHAR | Nome da etapa/quadro |
| `Description` | VARCHAR | Descrição |
| `Active` | BIT | Ativo |
| `IsPrivate` | BIT | Privado |
| `Archived` | BIT | Arquivado |
| `CostCenterId` | INT | Identificador do projeto lógico |
| `OwnerId` | INT | Responsável |
| `ServiceSaleId` | INT | Referência histórica a venda |
| `IsGantt` | BIT | Usa Gantt |
| `IsTemplate` | BIT | É template |
| `StatusTemplateId` | INT | Template de status |
| `StartDate` | DATETIME | Início planejado |
| `EndDate` | DATETIME | Fim planejado |
| `RealEndDate` | DATETIME | Fim real |
| `SortOrder` | INT | Ordenação |

**Relacionamentos principais:**
- `Boards.OwnerId -> membro.Id`
- `Boards.StatusTemplateId -> StatusTemplates.Id`
- o DDL físico relaciona `Boards.CostCenterId` ao identificador operacional de projeto.

**Regra semântica crítica:** para análises de horas ligadas a uma tarefa, `Boards.CostCenterId` é o identificador oficial do projeto.

---

### `Tasks`

**Função:** tarefas dos projetos e etapas.

**Colunas:**

| Coluna | Tipo lógico | Significado |
|---|---|---|
| `Id` | INT | Tarefa |
| `Order` | INT | Ordem |
| `EndDate` | DATETIME | Data de conclusão atualmente registrada |
| `Active` | BIT | Ativa |
| `CreationDate` | DATETIME | Criação |
| `CreatorId` | INT | Criador |
| `BoardId` | INT | Etapa/quadro |
| `StatusId` | INT | Status atual |
| `ServiceSaleItemId` | INT | Referência a item de venda |
| `Timestamp` | DATETIME | Atualização |
| `BusinessValue` | INT | Valor de negócio |
| `StoryPoints` | INT | Story points |
| `ScheduleId` | INT | Agenda |
| `Priority` | INT | Prioridade |
| `IsLocked` | BIT | Bloqueada |
| `WorkFlowCardId` | INT | Card de workflow |
| `IsGantt` | BIT | Exibir no Gantt |
| `IgnoreHours` | BIT | Ignorar horas |
| `StartDate` | DATETIME | Início |
| `Duration` | DECIMAL | Duração |
| `SortOrder` | INT | Ordem |
| `Progress` | DECIMAL | Progresso |
| `ParentId` | INT | Tarefa pai |
| `Type` | VARCHAR | Tipo |
| `Title` | VARCHAR | Título |
| `Description` | VARCHAR | Descrição |
| `DaysToDeadline` | INT | Dias até prazo |
| `EstimatedEffort` | DOUBLE | Esforço estimado |
| `ServiceId` | INT | Serviço |
| `UserId` | INT | Responsável principal |

**Relacionamentos:**
- `Tasks.BoardId -> Boards.Id`
- `Tasks.StatusId -> Status.Id`
- `Tasks.CreatorId -> membro.Id`
- `Tasks.UserId -> membro.Id`
- `Tasks.ParentId -> Tasks.Id`

---

### `Status`

**Função:** status atuais possíveis dentro dos quadros.

**Colunas:**
- `Id`
- `Name`
- `Order`
- `Active`
- `BoardId`
- `Type`
- `TemplateId`

**Relacionamentos:**
- `Status.BoardId -> Boards.Id`
- `Status.TemplateId -> StatusTemplates.Id`

---

### `StatusTemplates`

**Função:** definição semântica dos status.

**Colunas:**
- `Id`
- `Name`
- `Active`
- `IsFinal`
- `IsEditable`

**Regra crítica:** `IsFinal = 1` define que o status pertence a um estado final.

---

### `TaskHistories`

**Função:** histórico de alteração de tarefas.

**Colunas:**
- `Id`
- `UserId`
- `TaskId`
- `Timestamp`
- `Action`
- `PropertyName`
- `OldValue`
- `NewValue`

**Uso principal:**
- reconstrução de troca de status;
- data real de finalização;
- reabertura;
- última transição para estado final.

---

### `reportagem`

**Função:** apontamentos de horas.

**Colunas:**

| Coluna | Significado |
|---|---|
| `Id` | Identificador |
| `CreditoHoras` | Crédito de horas |
| `HorasTrabalhadas` | Horas efetivamente trabalhadas |
| `Detalhes` | Comentário |
| `Dia` | Data do apontamento |
| `Membro_Id` | Colaborador |
| `Projeto_Id` | Projeto informado |
| `Task_Id` | Tarefa |
| `HorarioInicio` | Início |
| `HorarioFim` | Fim |
| `Sabado` | Horas de sábado |
| `DomingoFeriado` | Horas em domingo/feriado |
| `AdicionalNoturno` | Adicional noturno |
| `PercentualNoturno` | Percentual noturno |
| `ReportStatus` | Status do apontamento |

**Relacionamentos:**
- `reportagem.Membro_Id -> membro.Id`
- `reportagem.Task_Id -> Tasks.Id`
- `reportagem.Projeto_Id -> projeto.Id`

**Métrica oficial de esforço real:**
```sql
SUM(reportagem.HorasTrabalhadas)
```

---

### `Tags`

**Função:** catálogo de tags de tarefas.

**Colunas:**
- `Id`
- `Name`
- `Color`
- `Active`

---

### `TagTasks`

**Função:** relação N:N entre tarefas e tags.

**Colunas:**
- `Task_Id`
- `Tag_Id`

**Relacionamentos:**
- `TagTasks.Task_Id -> Tasks.Id`
- `TagTasks.Tag_Id -> Tags.Id`

**Classificações atualmente utilizadas no BI:**

| Grupo analítico | IDs |
|---|---|
| Bugs | `227`, `2`, `10` |
| Suporte | `42` |
| Planejadas | `78`, `420` |
| Não planejadas | `79`, `476` |
| Code Review | `652` |
| Pair programming | `653` |
| Cerimônias | `565` |

**Regra:** a tag `10` também deve ser considerada Bug quando essa classificação for usada.

---

### `TaskUsers`

**Função:** membros atribuídos a tarefas.

**Colunas:**
- `UserId`
- `TaskId`

---

### `CurrentTaskUsers`

**Função:** usuários atualmente trabalhando/atribuídos a tarefas.

**Colunas conhecidas:**
- `Id`
- `TaskId`
- `UserId`
- `StartTime`

---

### `ProjectOwners`

**Função:** responsáveis pelos projetos.

**Colunas:**
- `UserId`
- `ProjectId`

---

### `ProjectTeams`

**Função:** equipes vinculadas a projetos.

**Chaves principais conhecidas:**
- `ProjectId`
- referência à equipe conforme schema físico.

---

### `BoardsTeams`

**Função:** equipes vinculadas a boards.

**Colunas:**
- `BoardId`
- `TeamId`

---

### `TaskTeams`

**Função:** equipes vinculadas a tarefas.

**Colunas:**
- `TaskId`
- `TeamId`

---

### `GanttLinks`

**Função:** dependências do Gantt.

**Colunas conhecidas:**
- `Id`
- `Type`
- `SourceTaskId`
- `TargetTaskId`

---

## 3.2 CAMPOS PERSONALIZADOS

### `CustomFields`

**Função:** definição dos campos personalizados.

**Colunas:**
- `Id`
- `Name`
- `FieldsTypes`
- `Label`
- `Placeholder`
- `IsActive`
- `ForeingTable`
- `CustomFieldValueType`

**`FieldsTypes`:**
- `0` Input
- `1` Select
- `2` MultiSelect
- `3` CheckBox
- `4` Toggle
- `5` Number
- `6` Date

**`CustomFieldValueType`:**
- `0` Default
- `1` Money
- `2` Percentage

---

### `CustomFieldEntities`

**Função:** vincula um campo personalizado a tipos de entidades.

**Colunas:**
- `Id`
- `EntityType`
- `IsRequired`
- `IsActive`
- `CustomField_Id`

**`EntityType`:**
- `0` Project
- `1` Board
- `999` Default

---

### `CustomFieldValues`

**Função:** opções/valores cadastrados dos campos personalizados.

**Colunas:**
- `Id`
- `Value`
- `IsActive`
- `CustomField_Id`

---

### `CustomFieldAnswers`

**Função:** respostas dos campos personalizados.

**Colunas:**
- `Id`
- `Value`
- `Entity_Id`
- `CustomFieldEntities_Id`

**Padrão validado em consultas atuais:**

```sql
-- Segmento do projeto.
WHERE CustomFieldValues.CustomField_Id = 1
```

```sql
-- Setor do projeto.
WHERE CustomFieldValues.CustomField_Id = 2
```

Caminho usado:

```sql
CustomFieldAnswers.Value = CustomFieldValues.Id
```

e:

```sql
CustomFieldAnswers.Entity_Id = <project_id>
```

**Regra:** não assumir IDs de outros custom fields sem validação.

---

# 3.3 FINANCEIRO

### `CashFlowItems`

**Função:** fonte principal do fluxo financeiro.

**Colunas físicas conhecidas:**

| Coluna | Significado |
|---|---|
| `Id` | Identificador |
| `Date` | Data de compensação/movimentação |
| `DueDate` | Vencimento |
| `CompetenceDate` | Competência |
| `InvoiceNumber` | Número da NF |
| `InvoiceDate` | Emissão da NF |
| `PrevisionEmit` | Previsão de emissão |
| `Description` | Descrição |
| `Value` | Valor |
| `BilledValue` | Valor faturado |
| `RefundedValue` | Valor reembolsado |
| `Generated` | Gerado automaticamente |
| `Executed` | Compensado/realizado |
| `CostCenter_Id` | Projeto/centro de custo |
| `Person_Id` | Pessoa |
| `BankAccount_Id` | Conta bancária |
| `Category_Id` | Categoria |
| `Company_Id` | Empresa |
| `TransactionId` | Identificador transacional |
| `CheckNum` | Número de cheque/identificador |
| `Parent_Id` | Movimento pai |
| `Client_Id` | Cliente |
| `Supplier_Id` | Fornecedor |
| `ApprovedPayment` | Pagamento aprovado |
| `ApprovedPaymentDate` | Data da aprovação |
| `Rebate` | Abatimento |
| `AlternativeDescription` | Descrição alternativa |
| `Scheduled` | Agendado |
| `ExpectedTaxName` | Imposto previsto |
| `Type` | Tipo interno |
| `Timestamp` | Atualização |
| `ApprovedPaymentUser_Id` | Usuário aprovador |
| `ImportInfo_Id` | Informação de importação |
| `RecurrentAsGenerated_Id` | Origem recorrente |
| `ServiceSaleInvoice_Id` | NFSe relacionada |
| `Transfer_Id` | Transferência |

**Relacionamentos úteis:**
- `CashFlowItems.CostCenter_Id -> CostCenters.Id`
- `CashFlowItems.Category_Id -> CashFlowCategories.Id`
- `CashFlowItems.Client_Id -> Clients.Id`
- `CashFlowItems.Supplier_Id -> Suppliers.Id`
- `CashFlowItems.BankAccount_Id -> BankAccounts.Id`
- `CashFlowItems.Company_Id -> Companies.Id`
- `CashFlowItems.Parent_Id -> CashFlowItems.Id`
- `CashFlowItems.ServiceSaleInvoice_Id -> ServiceSaleInvoices.Id`

---

### `CashFlowCategories`

**Função:** árvore de classificação financeira.

**Colunas:**
- `Id`
- `CategoryType`
- `SystemCategory`
- `Active`
- `Name`
- `Timestamp`
- `CategoryLimits_Id`
- `Position`
- `Level`
- `CategoryKind`
- `CategorySettings`
- `Parent_Id`
- `IsRefundable`
- `Apportion`

**Relacionamento:**
- `CashFlowCategories.Parent_Id -> CashFlowCategories.Id`

**`CategoryType`:**

| Código | Significado |
|---:|---|
| 0 | GrossRevenue |
| 1 | GoodsAndServicesTaxes |
| 2 | VariableExpense |
| 3 | FixedExpense |
| 4 | StaffCost |
| 5 | PayrollTaxes |
| 6 | OtherTaxes |
| 7 | DeductionsFromGrossRevenue |
| 8 | SalesTaxes |
| 9 | CostProductsSold |
| 10 | NonOperatingRevenues |
| 11 | FinancialRevenues |
| 12 | FinancialExpenses |
| 13 | ProfitTaxes |
| 14 | PaymentsAfterProfit |
| 15 | NonOperatingExpenses |
| 100 | RevenueWithProducts |
| 101 | RevenueWithServices |
| 200 | OutTree |

---

### `FinanceSharingCaches`

**Função:** rateio financeiro entre projetos.

**Colunas:**
- `Id`
- `SourceProject`
- `PayingProject`
- `ReferenceMonth`
- `ReferenceYear`
- `SharingExpense`
- `SharingRevenue`

**Métrica de rateio:**

```sql
-- Resultado líquido do rateio.
SharingRevenue - SharingExpense
```

O rateio não deve ser embutido silenciosamente em receita ou despesa.

---

### `ServiceSalePayments`

**Função:** parcelas/pagamentos relacionados a vendas de serviço.

**Colunas:**
- `Id`
- `BilledValue`
- `RefundedValue`
- `EffectiveBilledValue`
- `EffectiveRefundedValue`
- `ShippingQuote`
- `DollarsValue`
- `ReaisValue`
- `Description`
- `Date`
- `Value`
- `BankAccountId`
- `PaymentType_Id`
- `PaymentTypeFee`
- `EffectiveDate`
- `EffectiveValue`
- `InvoiceDate`
- `InvoiceNumber`
- `PrevisionEmit`
- `Timestamp`
- `CashFlowItem_Id`
- `Sale_Id`
- `ServiceSaleInvoice_Id`
- `PrevisionPayment`

**Relacionamentos autorizados:**
- `ServiceSalePayments.CashFlowItem_Id -> CashFlowItems.Id`
- `ServiceSalePayments.ServiceSaleInvoice_Id -> ServiceSaleInvoices.Id`
- `ServiceSalePayments.PaymentType_Id -> PaymentTypes.Id`
- `ServiceSalePayments.BankAccountId -> BankAccounts.Id`

**Regra importante:** `Sale_Id` pode ser usado como chave de agrupamento/correlação com outras tabelas autorizadas que possuam a mesma chave de venda, mas o RAG não deve procurar uma tabela de cabeçalho de venda fora do escopo permitido.

---

### `ServiceSaleItems`

**Função:** itens de uma venda de serviço.

**Colunas:**
- `Id`
- `Service_Id`
- `ExpenseType`
- `SellingPrice`
- `Quantity`
- `Value`
- `Discount`
- `Description`
- `Timestamp`
- `Sale_Id`

**`ExpenseType`:**
- `0` None
- `1` Port
- `2` Owner
- `3` Special

**Relacionamento útil:**
- `ServiceSaleItems.Service_Id -> Services.Id`
- correlacionar `Sale_Id` com `ServiceSalePayments.Sale_Id`.

---

### `ServiceSaleInvoices`

**Função:** NFSe e dados tributários de vendas de serviço.

**Colunas conhecidas:**

`Id`, `NfseRef`, `OptionEmit`, `PrevisionEmit`, `InvoiceDate`, `DueDate`,
`InvoiceNumber`, `NfseStatus`, `VerificationCode`, `OperationNature`,
`SpecialTaxRegime`, `NationalSimpleOptant`, `EmitterCity`, `ParcelValue`,
`WithholdingValue`, `ServicesValue`, `CalcBase`, `IssAliquot`, `IssValue`,
`Deductions`, `UnconditionedDiscounts`, `ConditionedDiscounts`, `TaxType`,
`RpsType`, `RpsNumber`, `RpsSerie`, `RpsEmitDate`, `CulturalBooster`,
`WorkCode`, `ArtCode`, `ServiceCode`, `Cnae`, `TaxCode`,
`ServiceDescription`, `JustificationCancel`, `HasIssWithholding`, `COFINS`,
`CSLL`, `INSS`, `IRPJ`, `ISS`, `PIS`, `Other`, `SourceTotalTaxes`,
`PercentageTotalTaxes`, `NfseUrl`, `AttachmentNfseXml_Id`,
`AttachmentNfsePdf_Id`, `IntermediateFullName`, `IntermediateIdNumber`,
`IntermediateMunicipalRegistration`, `FlowupNfseId`, `Timestamp`,
`Client_Id`, `Company_Id`, `NfseNationalSimple_Id`, `Project_Id`,
`ServiceSale_Id`, `PrevisionPayment`.

**Status NFSe vigente para o BI:**

| `NfseStatus` | Status |
|---:|---|
| 0 | Aguardando |
| 1 | Em processamento |
| 2 | Efetivada |
| 3 | Cancelada |
| 4 | Erro |
| 5 | Excluída |
| 6 | Devolvida / rejeitada |
| 7 | Vinculação externa |

**Regra:** `7` é um status próprio e não deve ser confundido com emissão tradicional.

**`RpsType`:**
- `0` NoType
- `1` Normal
- `2` Mixed
- `3` Coupon

---

### `ServiceSaleTaxes`

**Função:** impostos retidos/associados à venda de serviço.

**Colunas:**
- `Id`
- `TaxType`
- `Value`
- `Timestamp`
- `Sale_Id`

**`TaxType`:**

| Código | Imposto |
|---:|---|
| 0 | CSLL |
| 1 | COFINS |
| 2 | INSS |
| 3 | IRPJ |
| 4 | PIS |
| 5 | ISS |
| 6 | Other |

**Uso:**
- agregação por `Sale_Id`;
- correlacionar com `ServiceSalePayments.Sale_Id`.

---

### `Services`

**Função:** catálogo de serviços.

**Colunas:**
- `Id`
- `Description`
- `SellingPrice`
- `Category_Id`
- `Active`
- `IsRefundable`
- `Hours`
- `RevenueType`
- `Name`
- `Timestamp`
- `CashFlowCategory_Id`

**`RevenueType`:**
- `0` Unidade
- `1` Horas

---

### `ProductSales`

**Função:** vendas de produtos.

**Colunas:**
- `Id`
- `Guid`
- `Date`
- `Client_Id`
- `Serie`
- `SaleNumber`
- `Notes`
- `Total`
- `Canceled`
- `Delivered`
- `Closed`
- `CostCenterId`
- `BankAccountId`
- `Company_Id`
- `Timestamp`
- `BankAgreement_Id`
- `StockLocation_Id`
- `User_Id`

---

### `ProductSaleItems`

**Função:** itens das vendas de produto.

**Colunas:**
- `Id`
- `Guid`
- `Product_Id`
- `AdditionalCosts`
- `Quantity`
- `Value`
- `Discount`
- `Description`
- `Timestamp`
- `Sale_Id`

---

### `ProductSalePayments`

**Função:** parcelas/pagamentos de vendas de produto.

**Colunas:**
- `Id`
- `Description`
- `Date`
- `Value`
- `BankAccountId`
- `PaymentType_Id`
- `PaymentTypeFee`
- `EffectiveDate`
- `EffectiveValue`
- `InvoiceDate`
- `InvoiceNumber`
- `PrevisionEmit`
- `Timestamp`
- `CashFlowItem_Id`
- `Sale_Id`

---

### `Products`

**Função:** catálogo de produtos.

**Colunas conhecidas:**
- `Id`
- `Code`
- `Description`
- `Active`
- `SellingPrice`
- `Sells`
- `NoStock`
- `EAN`
- `NCM`
- `CFOP`
- `Guid`
- `Category_Id`
- `Name`
- `Timestamp`
- `CashFlowCategory_Id`

---

### `Clients`

**Função:** cadastro de clientes.

**Colunas:**
- `Id`
- `ClientType`
- `IdNumber`
- `FullName`
- `Email`
- `Phone`
- `Observations`
- `Balance`
- `BalanceDate`
- `MunicipalRegistration`
- `StateRegistration`
- `PixType`
- `PixValue`
- `Guid`
- `Active`
- `Name`
- `Timestamp`
- `Address_Id`

**`ClientType`:**
- `0` Individual
- `1` Legal

**`PixType`:**
- `1` CPF
- `2` Email
- `3` Phone
- `4` RandomKey
- `5` CNPJ

---

### `Suppliers`

**Função:** fornecedores.

**Colunas conhecidas:**
- `Id`
- `IdNumber`
- `Phone1`
- `Phone2`
- `Email`
- `Contact`
- `CorporateName`
- `SupplierType`
- `Bank_Id`
- `Agency`
- `Account`
- `PixType`
- `PixValue`
- `Observations`
- `BankAccountType`
- `Active`
- `Name`
- `Timestamp`
- `Address_Id`

**Regra de segurança:** dados bancários, documentos, PIX e dados pessoais devem ser retornados apenas quando indispensáveis e autorizados. Para dashboards, preferir nome e agregados.

---

### `Companies`

**Função:** empresas configuradas no tenant.

**Colunas conhecidas:**
- `Id`
- `Guid`
- `IdNumber`
- `StateRegistration`
- `MunicipalRegistration`
- `CorporateName`
- `TaxationType`
- `SpecialTaxRegime`
- `Email`
- `CompanyPhone`
- `CompanyEmail`
- `IsAutomaticEmail`
- `AttachmentLogoId`
- `ApiCompanyId`
- `TokenProduction`
- `TokenHomologation`
- `NfseHookId`
- `PrefectureUsername`
- `PrefectureAedfNumber`
- `Active`
- `Name`
- `Timestamp`
- `Address_Id`

**`TaxationType`:**
- `0` Simples
- `1` Real
- `2` Presumido
- `3` MEI

**Colunas proibidas ao agente:**
- `TokenProduction`
- `TokenHomologation`
- credenciais de prefeitura;
- qualquer segredo de integração.

---

### `BankAccounts`

**Função:** contas bancárias usadas nas movimentações.

**Colunas:**
- `Id`
- `Agency`
- `Account`
- `Balance`
- `BalanceDate`
- `Bank_Id`
- `CodSwift`
- `SwiftCod`
- `RecipientName`
- `Correspondent`
- `ABAcod`
- `IBAN`
- `Notes`
- `Active`
- `Name`
- `Timestamp`

**Uso padrão em BI:** `Id`, `Name`, `Active`.

**Regra:** evitar exposição de número de conta, agência, IBAN e demais dados bancários quando a pergunta puder ser respondida com agregados.

---

### `PaymentTypes`

**Função:** formas e taxas de pagamento.

**Colunas conhecidas:**
- `Id`
- `Kind`
- `Delay`
- `ConstantFee`
- `MaxParcels`
- `PercentageFee1X`
- `PercentageFee2X`
- `PercentageFee3X`
- `PercentageFee4X`
- `PercentageFee5X`
- `PercentageFee6X`
- `PercentageFee7X`
- `PercentageFee8X`
- `PercentageFee9X`
- `PercentageFee10X`
- `PercentageFee11X`
- `PercentageFee12X`
- `Active`
- `Guid`
- `Name`
- `Timestamp`

---

# 3.4 PESSOAS, CAPACIDADE E CUSTO

### `membro`

**Função:** cadastro operacional de colaboradores.

**Colunas conhecidas:**
- `Id`
- `Email`
- `Nome`
- `Perfil`
- `Motivo`
- `DataDesativacao`
- `CanReport`
- `CanSeeRevenueItems`
- `CanSeeOnlyRefundedValues`
- `CanSeeBalance`
- `CanSeeProjectResult`
- `CanSeeUsersAndJobs`
- `IsMaster`
- `IsVisible`
- `ReportingPermission`
- `Password`
- `Salt`
- `Iterations`
- `Token`
- `ShortName`

**Regra de colaborador ativo:**

```sql
membro.DataDesativacao IS NULL
```

**Colunas proibidas:**
- `Password`
- `Salt`
- `Token`

---

### `Users`

**Função:** usuários financeiros/aplicacionais.

**Colunas conhecidas:**
- `Id`
- `Email`
- `HomePhone`
- `CellPhone`
- `Active`
- `Hidden`
- `Password`
- `Salt`
- `Iterations`
- `Token`
- `Name`
- `Timestamp`

**Colunas proibidas:**
- `Password`
- `Salt`
- `Token`

---

### `cargo`

**Função:** cargos dos colaboradores.

**Colunas:**
- `Id`
- `Nome`

---

### `promocao`

**Função:** histórico de cargo do colaborador.

**Colunas:**
- `Id`
- `DesdeDia`
- `Cargo_Id`
- `Membro_Id`

**Relacionamentos:**
- `promocao.Cargo_Id -> cargo.Id`
- `promocao.Membro_Id -> membro.Id`

**Regra:** para uma data analisada, usar a promoção vigente mais recente com `DesdeDia <= data`.

---

### `reajuste`

**Função:** histórico de valores financeiros por cargo.

**Colunas:**
- `Id`
- `DesdeDia`
- `Valor`
- `CustoMensal`
- `SalarioBase`
- `Empresa`
- `Regime`
- `AtualizacaoEncargo`
- `Cargo_Id`

**Segurança:**
- `SalarioBase`, `CustoMensal` e valores individuais são dados sensíveis;
- consultas do usuário final devem preferir custo agregado;
- acesso individual deve depender de autorização específica.

---

### `encargo`

**Função:** tabela de vigência dos encargos.

**Colunas:**
- `Id`
- `Regime`
- `TipoTributacao`
- `DesdeDia`

---

### `encargo_item`

**Função:** composição dos encargos.

**Colunas:**
- `Id`
- `Nome`
- `Valor`
- `Encargo_Id`

---

### `carga_horaria`

**Função:** carga horária por cargo e dia da semana.

**Colunas:**
- `Id`
- `DiaSemana`
- `Carga`
- `Cargo_Id`

**`DiaSemana`:**
- `0` domingo
- `1` segunda
- `2` terça
- `3` quarta
- `4` quinta
- `5` sexta
- `6` sábado

---

### `feriado`

**Função:** feriados para cálculo de capacidade.

**Colunas:**
- `Id`
- `Dia`
- `MeioExpediente`

---

### `Vacation`

**Função:** férias.

**Colunas:**
- `Id`
- `InitialDate`
- `FinalDate`
- `WorkingDays`
- `User_Id`

---

### `pagamento_hora`

**Função:** pagamentos por hora de membros.

**Colunas:**
- `Id`
- `ValorHoras`
- `Descricao`
- `DataPagamento`
- `Membro_Id`

---

### `CostSaleWorkedHoursHistory`

**Função:** histórico de custo e valor de venda por hora de colaborador em projeto.

**Colunas:**
- `Id`
- `MemberId`
- `CreatorId`
- `ProjectId`
- `CostPerHour`
- `SalePerHour`
- `StartDuration`
- `EndDuration`
- `Timestamp`

**Regra:** quando usado, respeitar o intervalo de vigência:
- `StartDuration <= data`;
- `EndDuration IS NULL OR EndDuration >= data`.

---

# 3.5 OPEN FINANCE

### `AkropoliItems`

**Função:** vínculos/sincronizações de Open Finance.

**Colunas conhecidas:**
- `Id`
- `LinkId`
- `Status`
- `Bank`
- `CPF`
- `CNPJ`
- `LastUpdatedAt`
- `Active`
- `Timestamp`

**Status de conta válida para sincronização automática:**

```sql
Status = 'AUTHORISED'
AND Active = 1
```

---

### `AkropoliItemBankAccounts`

**Função:** contas bancárias vinculadas a um item de Open Finance.

**Colunas conhecidas:**
- `AkropoliItemId`
- `BankAccountId`
- `AccountId`
- `AccountType`
- `Number`
- `BranchCode`
- `StartDate`

**Conta habilitada:**

```sql
StartDate IS NOT NULL
```

---

### `AkropoliItemBankAccountDates`

**Função:** controle de sincronização por conta e data.

**Colunas conhecidas:**
- `AkropoliItemId`
- `BankAccountId`
- `Date`
- `TransactionsCount`
- `TransactionsSynced`

---

### `metabase_openfinance_data`

**Função:** snapshot operacional de status de Open Finance utilizado no BI.

**Colunas confirmadas:**
- `id`
- `name`
- `account`
- `bank`
- `syncStatus`
- `syncAttempt`
- `timestamp`

**Semântica atual:**
- representa o estado atual;
- a base é recriada/atualizada periodicamente pelo processo de sincronização;
- usar para visão operacional corrente, não para histórico consolidado.

---

### `metabase_nf_openfinance_status`

**Função:** histórico de status de NF e Open Finance.

**Colunas confirmadas no modelo atual:**
- `reference_date`
- `instance_name`
- `status_invoices`
- `status_openfinance`

**Uso:**
- evolução histórica;
- comparação por datas de referência;
- status consolidado por instância.

---

# 4. MAPA DE RELACIONAMENTOS SEMÂNTICOS

## 4.1 Projeto -> Board -> Task

```text
projeto.Id
   ↑
Boards.CostCenterId
   ↑
Tasks.BoardId
```

Caminho operacional:

```sql
Tasks
JOIN Boards
    ON Boards.Id = Tasks.BoardId
```

O identificador de projeto da tarefa é:

```sql
Boards.CostCenterId
```

---

## 4.2 Task -> apontamento -> colaborador

```text
Tasks.Id
   ↓
reportagem.Task_Id

reportagem.Membro_Id
   ↓
membro.Id
```

---

## 4.3 Financeiro -> projeto

```text
CashFlowItems.CostCenter_Id
   ↓
CostCenters.Id
```

---

## 4.4 Financeiro -> categoria

```text
CashFlowItems.Category_Id
   ↓
CashFlowCategories.Id
```

Hierarquia:

```text
categoria atual
    ↓ Parent_Id
categoria pai
    ↓ Parent_Id
categoria avó
```

---

## 4.5 Financeiro -> fornecedor / cliente / conta

```text
CashFlowItems.Supplier_Id -> Suppliers.Id
CashFlowItems.Client_Id   -> Clients.Id
CashFlowItems.BankAccount_Id -> BankAccounts.Id
CashFlowItems.Company_Id  -> Companies.Id
```

---

## 4.6 Parcela de serviço -> fluxo de caixa

```text
ServiceSalePayments.CashFlowItem_Id
    ↓
CashFlowItems.Id
```

---

## 4.7 Venda de serviço sem fonte de cabeçalho

Com o escopo atual, os dados de serviço devem ser combinados por `Sale_Id` entre fontes autorizadas:

```text
ServiceSalePayments.Sale_Id
ServiceSaleItems.Sale_Id
ServiceSaleTaxes.Sale_Id
ServiceSaleInvoices.ServiceSale_Id
```

Exemplo de correlação:

```sql
-- Agrupa informações autorizadas pela chave da venda.
LEFT JOIN ServiceSaleItems ssi
    ON ssi.Sale_Id = ssp.Sale_Id

LEFT JOIN ServiceSaleInvoices inv
    ON inv.ServiceSale_Id = ssp.Sale_Id
```

**Limitação:** se a pergunta exigir um atributo que exista apenas em uma fonte excluída, a consulta deve ser declarada não suportada no escopo atual.

---

## 4.8 Venda de produto

```text
ProductSales.Id
  ├── ProductSaleItems.Sale_Id
  └── ProductSalePayments.Sale_Id

ProductSalePayments.CashFlowItem_Id
  ↓
CashFlowItems.Id
```

---

## 4.9 Campos customizados de projeto

```text
CostCenters.Id / project logical id
   ↓
CustomFieldAnswers.Entity_Id

CustomFieldAnswers.Value
   ↓
CustomFieldValues.Id
```

---

# 5. REGRAS DE NEGÓCIO OFICIAIS

---

## BR-001 — Projeto oficial de um apontamento

Para um apontamento com tarefa:

```text
reportagem.Task_Id
→ Tasks.Id
→ Tasks.BoardId
→ Boards.Id
→ Boards.CostCenterId
```

O projeto oficial é `Boards.CostCenterId`.

Se `reportagem.Task_Id IS NULL`, usar:

```text
reportagem.Projeto_Id
```

Se existir divergência entre `reportagem.Projeto_Id` e o projeto da board, **o projeto da board prevalece** para análises oficiais de esforço e projeto.

---

## BR-002 — Horas trabalhadas

Horas reais:

```sql
SUM(reportagem.HorasTrabalhadas)
```

Horas estimadas da tarefa:

```sql
Tasks.EstimatedEffort
```

Comparação de estimado x realizado deve agregar apontamentos por `Task_Id`.

---

## BR-003 — Colaborador ativo

```sql
membro.DataDesativacao IS NULL
```

Não usar apenas permissões de acesso como critério de vínculo ativo.

---

## BR-004 — Tarefa finalizada

Uma tarefa finalizada para BI deve:

1. possuir `Tasks.Active = 1`;
2. estar atualmente ligada a status/template final quando a análise exigir estado final atual;
3. possuir histórico de transição de `StatusId` para um status cujo `StatusTemplates.IsFinal = 1`.

Não é suficiente usar apenas:

```sql
Tasks.EndDate IS NOT NULL
```

---

## BR-005 — Data real da finalização da tarefa

Buscar em `TaskHistories` eventos com:

```sql
PropertyName = 'StatusId'
```

e considerar o **último evento** em que `NewValue` corresponde a status ligado a template final.

Se a tarefa:
- foi concluída;
- reaberta;
- concluída novamente;

a finalização oficial é a última entrada em estado final.

Não restringir o `OldValue` a um status específico, pois pode existir:
- transição final -> final;
- valor antigo vazio;
- migração;
- mudança entre estados finais.

---

## BR-006 — Últimas sprints

Em dashboards que usam a regra de recência das sprints, considerar no máximo as **24 boards/sprints mais recentes** quando essa regra estiver prevista pelo painel.

Não aplicar esse limite automaticamente a consultas que não sejam de sprint.

---

## BR-007 — Bugs

Quando a análise pedir Bugs no padrão atual:

```sql
TagTasks.Tag_Id IN (227, 2, 10)
```

A tag `10` deve ser incluída no agrupamento de bugs.

---

## BR-008 — Data no resultado financeiro

Existem dois conceitos diferentes.

### Fluxo realizado / extrato

Data de referência:

```sql
COALESCE(CashFlowItems.Date, CashFlowItems.DueDate)
```

Não usar `CompetenceDate` nesse cenário.

Para realizado:

```sql
Executed = 1
```

### Resultado por competência / análise gerencial

Usar:

```sql
CashFlowItems.CompetenceDate
```

e ignorar registros sem competência quando a visão exigir competência contábil.

---

## BR-009 — Receita e despesa

Em análises gerenciais de `CashFlowItems`:

```sql
-- Receita.
SUM(ABS(Value))
WHERE Value > 0
```

```sql
-- Despesa.
SUM(ABS(Value))
WHERE Value < 0
```

Indicadores:

```text
Margem Direta = Receita - Despesa
```

---

## BR-010 — Transferências internas

Transferências não devem ser tratadas como receita ou despesa operacional.

Excluir:

```sql
Transfer_Id IS NOT NULL
```

Quando houver herança pai/filho, considerar também o `Transfer_Id` efetivo do pai.

---

## BR-011 — Movimentos financeiros pai/filho

Quando um `CashFlowItems` possui quebra em filhos:

- o Analytics deve considerar as linhas filhas;
- usar projeto, categoria e valor da própria quebra;
- não somar simultaneamente pai e filhos.

Padrão validado:

```sql
WHERE
    cfi.Parent_Id IS NOT NULL
    OR NOT EXISTS (
        SELECT 1
        FROM CashFlowItems child_cfi
        WHERE child_cfi.Parent_Id = cfi.Id
    )
```

Isso mantém:
- filhos;
- lançamentos que não possuem filhos;

e remove o pai quando ele foi quebrado.

---

## BR-012 — Sinal da quebra de despesa

Quando o pai é negativo e o filho foi armazenado positivo, preservar a semântica de despesa.

Padrão:

```sql
CASE
    WHEN parent_value < 0
         AND child_value > 0
        THEN child_value * -1
    ELSE child_value
END
```

---

## BR-013 — Status financeiro

```sql
CASE
    WHEN Executed = 1 THEN 'Realizado'
    ELSE 'A realizar'
END
```

Representação booleana:

```sql
CASE
    WHEN Executed = 1 THEN 'Sim'
    ELSE 'Não'
END AS Compensado
```

---

## BR-014 — Rateio

Rateio é um indicador separado.

```sql
SharingRevenue - SharingExpense
```

Só incluir quando:
- o usuário pedir explicitamente rateio;
- ou a métrica definida for resultado final com rateio.

Não somar rateio diretamente às colunas de Receita e Despesa.

Resultado final quando aplicável:

```text
Resultado = Receita + Rateio - Despesa
```

---

## BR-015 — Hierarquia financeira

Para categoria com até três níveis:

### 1 nível
```text
Grupo = categoria atual
Subgrupo = NULL
Categoria = NULL
```

### 2 níveis
```text
Grupo = categoria pai
Subgrupo = NULL
Categoria = categoria atual
```

### 3 níveis
```text
Grupo = categoria avó
Subgrupo = categoria pai
Categoria = categoria atual
```

O agente deve construir a hierarquia com self joins em `CashFlowCategories.Parent_Id`.

---

## BR-016 — Venda de serviço e parcelas

A parcela financeira está em:

```text
ServiceSalePayments
```

`CashFlowItems` é a fonte do fluxo real e traz contexto financeiro que não está necessariamente na parcela.

Para análises autorizadas de venda de serviço:
- usar `ServiceSalePayments` como base das parcelas;
- correlacionar pelo `Sale_Id` com itens, impostos e NFSe autorizados;
- usar `CashFlowItem_Id` para chegar ao fluxo financeiro.

Não inventar dados de cabeçalho indisponíveis.

---

## BR-017 — Impostos de serviço

Somar `ServiceSaleTaxes.Value` por `Sale_Id` e classificar:

```text
0 -> CSLL
1 -> COFINS
2 -> INSS
3 -> IRPJ
4 -> PIS
5 -> ISS
6 -> Outros
```

---

## BR-018 — Descontos de NFSe

Para descontos incondicionados:

```sql
ServiceSaleInvoices.UnconditionedDiscounts
```

Evitar duplicidade quando uma venda possui múltiplas relações com parcelas.

---

## BR-019 — NFSe

Usar o enum vigente em `ServiceSaleInvoices.NfseStatus`.

Em especial:

```text
7 = Vinculação externa
```

Não classificar automaticamente esse status como emissão normal.

---

## BR-020 — Segmento e Setor do projeto

Padrão atualmente validado:

```text
CustomField_Id = 1 -> Segmento
CustomField_Id = 2 -> Setor
```

Relacionar pela entidade do projeto.

---

## BR-021 — Utilização de horas

A capacidade deve considerar, quando necessário:

- colaborador ativo;
- cargo vigente;
- `carga_horaria`;
- feriados;
- férias;
- período selecionado.

Não calcular capacidade apenas multiplicando dias por oito horas sem consultar a configuração real quando as tabelas estiverem disponíveis.

---

## BR-022 — Cargo vigente

Para uma data `d`, a promoção válida é a promoção mais recente em que:

```sql
promocao.DesdeDia <= d
```

Ordenar por `DesdeDia DESC` e escolher a primeira por membro.

---

## BR-023 — Custo vigente

Quando o custo vier de histórico, usar o registro correspondente ao intervalo de vigência.

Para `CostSaleWorkedHoursHistory`:

```sql
StartDuration <= data
AND (
    EndDuration IS NULL
    OR EndDuration >= data
)
```

Para regras baseadas em `reajuste`, usar o reajuste vigente mais recente antes da data.

---

## BR-024 — Open Finance: conta válida

Uma instância só deve ser considerada apta à sincronização automática se existir pelo menos uma conta que satisfaça o conjunto de regras:

```text
AkropoliItems.Status = 'AUTHORISED'
AkropoliItems.Active = 1
AkropoliItemBankAccounts.StartDate IS NOT NULL
conta associada existente em BankAccounts
```

Consolidar o resultado no nível lógico da instância/cliente usado pelo processo de Open Finance.

---

## BR-025 — Snapshot x histórico de Open Finance

Use:

```text
metabase_openfinance_data
```

para estado operacional atual.

Use:

```text
metabase_nf_openfinance_status
```

para histórico de status por `reference_date`.

Nunca interpretar o snapshot atual como série histórica.

---

# 6. ROTEAMENTO DE INTENÇÃO PARA O TEXT-TO-SQL

Esta seção serve para o Schema Linking.

| Pergunta do usuário | Tabelas prioritárias |
|---|---|
| projetos | `projeto`, `CostCenters` |
| etapas / boards / sprints | `Boards` |
| tarefas | `Tasks`, `Status`, `StatusTemplates` |
| tarefa finalizada | `Tasks`, `TaskHistories`, `Status`, `StatusTemplates` |
| horas apontadas | `reportagem`, `membro` |
| horas por projeto | `reportagem`, `Tasks`, `Boards`, `CostCenters` |
| esforço estimado x realizado | `Tasks`, `reportagem` |
| bugs / suporte / cerimônias | `TagTasks`, `Tags`, `Tasks` |
| responsáveis | `membro`, `TaskUsers`, `ProjectOwners`, `Boards` |
| segmento / setor | `CustomFieldAnswers`, `CustomFieldValues` |
| receita/despesa | `CashFlowItems`, `CashFlowCategories` |
| fornecedor | `CashFlowItems`, `Suppliers` |
| cliente | `CashFlowItems`, `Clients` |
| conta bancária | `CashFlowItems`, `BankAccounts` |
| resultado por competência | `CashFlowItems`, `CashFlowCategories` |
| fluxo realizado | `CashFlowItems` |
| rateio | `FinanceSharingCaches` |
| parcelas de serviço | `ServiceSalePayments`, `CashFlowItems` |
| serviços da venda | `ServiceSaleItems`, `Services`, `ServiceSalePayments` |
| impostos de serviço | `ServiceSaleTaxes`, `ServiceSalePayments` |
| NFSe | `ServiceSaleInvoices` |
| vendas de produto | `ProductSales`, `ProductSaleItems`, `ProductSalePayments` |
| colaboradores ativos | `membro` |
| carga horária | `carga_horaria`, `promocao`, `cargo` |
| férias | `Vacation`, `membro` |
| feriados | `feriado` |
| custo por hora | `CostSaleWorkedHoursHistory` |
| status Open Finance atual | `metabase_openfinance_data` |
| histórico NF/Open Finance | `metabase_nf_openfinance_status` |
| elegibilidade Open Finance | `AkropoliItems`, `AkropoliItemBankAccounts`, `BankAccounts` |

---

# 7. REGRAS DE GERAÇÃO DE SQL

## 7.1 Filtros de data sargáveis

Preferir:

```sql
WHERE cfi.CompetenceDate >= ?
  AND cfi.CompetenceDate < ?
```

Evitar quando possível:

```sql
WHERE DATE(cfi.CompetenceDate) BETWEEN ...
```

ou:

```sql
WHERE YEAR(cfi.CompetenceDate) = ...
```

porque isso pode impedir uso eficiente de índices.

---

## 7.2 Evitar multiplicação de linhas

Antes de fazer JOIN entre relações 1:N e N:N, definir a granularidade.

Exemplo errado:

```text
CashFlowItems
x ServiceSalePayments
x ServiceSaleItems
x ServiceSaleTaxes
```

sem pré-agregação pode multiplicar valores.

Padrão correto:
1. agregar parcelas;
2. agregar impostos;
3. agregar itens;
4. só então combinar as CTEs pelo identificador correto.

---

## 7.3 `COUNT(DISTINCT ...)`

Usar quando a cardinalidade do JOIN pode duplicar entidades.

Exemplos:
- número de tarefas;
- número de projetos;
- número de clientes;
- número de colaboradores.

---

## 7.4 `LEFT JOIN` para dimensões opcionais

Quando a ausência de dimensão não deve remover o fato, usar `LEFT JOIN`.

Exemplos:
- tarefa sem tag;
- movimento sem fornecedor;
- projeto sem custom field;
- venda sem NFSe.

---

## 7.5 Não usar `SELECT *` em SQL gerado ao usuário

Preferir colunas explícitas:
- reduz exposição acidental;
- evita trazer campos sensíveis;
- melhora manutenção;
- reduz payload.

---

# 8. POLÍTICA DE DADOS SENSÍVEIS

## 8.1 Nunca retornar

Credenciais ou segredos como:
- senha;
- salt;
- token;
- chave;
- credencial de integração;
- token de produção/homologação.

## 8.2 Restringir fortemente

Sem necessidade explícita e autorização:
- salário individual;
- custo individual;
- CPF/CNPJ;
- PIX;
- número de conta;
- agência;
- IBAN;
- telefone;
- email pessoal.

Para o BI, preferir:
- agregações;
- identificadores internos;
- nome da entidade;
- totais;
- médias;
- faixas.

---

# 9. LIMITAÇÕES CONHECIDAS DO ESCOPO ATUAL

## 9.1 Métricas dependentes de fontes excluídas

Algumas consultas históricas da aplicação utilizaram fontes que hoje não fazem parte do escopo de acesso do usuário.

A partir desta versão:

- não tentar reproduzir esses JOINs;
- não usar exemplos antigos como few-shot se dependerem de fonte excluída;
- não recuperar DDL dessas fontes;
- não sugerir que o usuário tem acesso a elas.

Se uma métrica depender exclusivamente de uma fonte excluída, responder como **não suportada no schema autorizado atual**.

---

## 9.2 Schema físico pode evoluir

A documentação não substitui validação automática de schema.

Antes de executar SQL gerado em produção, o pipeline ideal deve conferir:
- existência da tabela;
- existência da coluna;
- tipo;
- permissões;
- cardinalidade esperada.

---

# 10. RECOMENDAÇÃO DE INDEXAÇÃO PARA O RAG

O conteúdo desta base não deve ser indexado como um único chunk.

Separar em documentos lógicos.

## Tipo A — `table_card`

Exemplo de metadados:

```json
{
  "type": "table_card",
  "table": "CashFlowItems",
  "domain": "finance",
  "keywords": [
    "receita",
    "despesa",
    "competência",
    "vencimento",
    "fluxo de caixa",
    "fornecedor",
    "projeto"
  ]
}
```

## Tipo B — `business_rule`

Exemplo:

```json
{
  "type": "business_rule",
  "rule_id": "BR-011",
  "tables": [
    "CashFlowItems"
  ],
  "keywords": [
    "pai",
    "filho",
    "quebra",
    "duplicidade",
    "extrato"
  ]
}
```

## Tipo C — `join_path`

Exemplo:

```json
{
  "type": "join_path",
  "name": "hours_to_project",
  "tables": [
    "reportagem",
    "Tasks",
    "Boards"
  ]
}
```

## Tipo D — `few_shot`

Guardar:
- pergunta original;
- SQL validado;
- tabelas usadas;
- regras aplicadas;
- data da validação;
- versão da regra.

---

# 11. CONTEXTO MÍNIMO A SER INJETADO NO LLM

Para cada pergunta, o retriever deve entregar apenas:

1. tabelas candidatas;
2. colunas relevantes;
3. caminhos de JOIN;
4. regras de negócio relacionadas;
5. 2 a 4 exemplos SQL semanticamente parecidos;
6. regras de segurança;
7. dialeto `MySQL`.

Evitar injetar o catálogo inteiro quando a pergunta usar poucas entidades.

---

# 12. PIPELINE RECOMENDADO

```text
Pergunta
   ↓
Classificador de intenção
   ↓
Schema retrieval
   ↓
Business-rule retrieval
   ↓
Few-shot retrieval
   ↓
SQL planner
   ↓
SQL generator
   ↓
Policy validator
   ↓
EXPLAIN / execução read-only
   ↓
Correção automática em caso de erro
   ↓
Validação de resultado
   ↓
Resposta
```

---

# 13. CHECKLIST DO AGENTE ANTES DE ENTREGAR SQL

- [ ] A tabela pertence ao escopo autorizado?
- [ ] O schema proibido foi evitado?
- [ ] Não há dependência de MRR ou HealthScore?
- [ ] Os nomes físicos respeitam maiúsculas e minúsculas?
- [ ] Todas as colunas existem na base semântica?
- [ ] O caminho de JOIN está documentado?
- [ ] A granularidade está correta?
- [ ] Não existe multiplicação de valores por JOIN?
- [ ] A regra de data é a correta para a métrica?
- [ ] Transferências foram tratadas?
- [ ] Pai/filho financeiro foi tratado?
- [ ] O projeto oficial de apontamento foi resolvido pela board quando aplicável?
- [ ] Dados sensíveis foram excluídos?
- [ ] A consulta é somente leitura?
- [ ] Há `LIMIT` quando é consulta de detalhe?
- [ ] Os filtros são sargáveis quando possível?
- [ ] A consulta respeita MySQL?

---

# 14. REGRA FINAL DO RAG

**Precisão é mais importante do que responder a qualquer custo.**

Se o usuário pedir algo que não pode ser determinado com as tabelas autorizadas, a resposta correta é informar a limitação.

O agente nunca deve compensar ausência de dados por:
- adivinhação;
- uso de tabela proibida;
- uso de schema externo;
- criação de coluna fictícia;
- JOIN por similaridade de nome sem relacionamento validado.
