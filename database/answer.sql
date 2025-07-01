-- TYPE YOUR SQL QUERY BELOW

-- PART 1: Create a SQL query that maps out the daily average users before and after the feature change

WITH user_logins AS (
    SELECT
        CAST(DATEADD(SECOND, login_timestamp, '1970-01-01') AS DATE) AS login_date,  -- Convert UNIX timestamp to date
        COUNT(DISTINCT [user_id]) AS daily_users
    FROM login_history
    GROUP BY CAST(DATEADD(SECOND, login_timestamp, '1970-01-01') AS DATE)
)
SELECT
    CASE
        WHEN login_date < '2018-06-02' THEN 'Before feature change daily avg users :'
        ELSE 'After feature change daily avg users:'
    END AS period,
    ROUND(AVG(daily_users), 2) AS avg_daily_users
FROM user_logins
GROUP BY
    CASE
        WHEN login_date < '2018-06-02' THEN 'Before feature change daily avg users :'
        ELSE 'After feature change daily avg users:'
    END;


-- PART 2: Create a SQL query that indicates the number of status changes by card

WITH card_changes AS (
    SELECT
        -- Convert the UNIX timestamp (in seconds) to a DATE format
        CAST(DATEADD(SECOND, timestamp, '19700101') AS DATE) AS change_date,  
        COUNT(*) AS status_changes  -- Count status changes per day
    FROM card_change_history
    GROUP BY CAST(DATEADD(SECOND, timestamp, '19700101') AS DATE)
)
SELECT
     'Daily number of card status changes: ' + CAST(AVG(DISTINCT status_changes) AS VARCHAR) AS daily_data
FROM card_changes;





