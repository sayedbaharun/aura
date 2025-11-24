-- Check all tables and their ID column types
SELECT
    table_name,
    column_name,
    data_type,
    udt_name
FROM information_schema.columns
WHERE
    column_name = 'id'
    AND table_schema = 'public'
ORDER BY table_name;

-- Also check foreign key columns that reference IDs
SELECT
    table_name,
    column_name,
    data_type,
    udt_name
FROM information_schema.columns
WHERE
    (column_name LIKE '%_id' OR column_name LIKE '%Id')
    AND table_schema = 'public'
ORDER BY table_name, column_name;
