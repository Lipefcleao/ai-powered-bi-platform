--
-- Script Seed para popular de forma idempotente a tabela dim_calendar (2019 a 2030)
-- 

DROP PROCEDURE IF EXISTS FillCalendar;

DELIMITER $$

CREATE PROCEDURE FillCalendar(startDate DATE, endDate DATE)
BEGIN
    DECLARE currentDate DATE;
    SET currentDate = startDate;
    
    WHILE currentDate <= endDate DO
        INSERT INTO dim_calendar (
            date_key,
            calendar_date,
            year,
            quarter,
            month,
            month_name,
            week,
            weekday,
            is_weekend,
            is_business_day
        ) VALUES (
            CAST(DATE_FORMAT(currentDate, '%Y%m%d') AS UNSIGNED),
            currentDate,
            YEAR(currentDate),
            QUARTER(currentDate),
            MONTH(currentDate),
            DATE_FORMAT(currentDate, '%M'),
            WEEK(currentDate, 3), -- Norma ISO-8601
            WEEKDAY(currentDate) + 1,
            CASE WHEN WEEKDAY(currentDate) IN (5, 6) THEN 1 ELSE 0 END,
            CASE WHEN WEEKDAY(currentDate) IN (5, 6) THEN 0 ELSE 1 END
        )
        ON DUPLICATE KEY UPDATE calendar_date = VALUES(calendar_date);
        
        SET currentDate = DATE_ADD(currentDate, INTERVAL 1 DAY);
    END WHILE;
END$$

DELIMITER ;

-- Executa a carga inicial segura de 2019 a 2030
CALL FillCalendar('2019-01-01', '2030-12-31');

DROP PROCEDURE IF EXISTS FillCalendar;
