# Baseline de Consultas e Otimizações de Banco de Dados

Este documento registra a análise de custo e as recomendações de índices físicos recomendados para a réplica MySQL (Azure).

---

## 1. Consulta Piloto: FAQ 9 - Resultado Financeiro

### Consulta Atual
Filtros aplicados sobre `cashflowitems` baseados em `CompetenceDate`, `CostCenter_Id` e `Active`.

```sql
SELECT * FROM cashflowitems cfi
WHERE cfi.Active = 1
  AND cfi.CompetenceDate >= '2026-01-01'
  AND cfi.CompetenceDate <= '2026-06-30'
  AND cfi.CostCenter_Id IN (1, 2, 3);
```

### Problema Identificado
Ausência de índice composto sobre os campos de filtro provoca escaneamento completo (*Full Table Scan*) ou uso ineficiente de chaves isoladas.

### Proposta de Índice
```sql
CREATE INDEX idx_cashflow_active_competence ON cashflowitems (Active, CompetenceDate, CostCenter_Id);
```
- **Seletividade esperada:** Alta. Filtra rapidamente registros ativos no intervalo temporal desejado.
- **Impacto em escrita:** Baixo (banco de leitura analítico).

---

## 2. Consulta FAQ 10 - Utilização de Horas / Apontamentos

### Consulta Atual
Filtros aplicados sobre a tabela `reportagem` baseados em `Dia` e `Membro_Id`.

### Proposta de Índice
```sql
CREATE INDEX idx_reportagem_dia_membro ON reportagem (Dia, Membro_Id);
```
- **Seletividade esperada:** Alta, otimiza o cálculo de esforço operacional mensal/diário.
