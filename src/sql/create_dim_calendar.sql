-- 
-- Criação da Tabela Física Permanente: dim_calendar
-- Substitui subqueries dinâmicas nos relatórios para melhor performance e sargabilidade.
--

CREATE TABLE IF NOT EXISTS dim_calendar (
    date_key INT PRIMARY KEY, -- Formato YYYYMMDD
    calendar_date DATE NOT NULL UNIQUE,
    year INT NOT NULL,
    quarter INT NOT NULL,
    month INT NOT NULL,
    month_name VARCHAR(20) NOT NULL,
    week INT NOT NULL,
    weekday INT NOT NULL,
    is_weekend TINYINT(1) DEFAULT 0,
    is_business_day TINYINT(1) DEFAULT 1,
    INDEX idx_calendar_date (calendar_date),
    INDEX idx_year_month (year, month)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
