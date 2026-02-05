-- Check current foreign key constraint on students table
SELECT
    tc.constraint_name,
    tc.table_name,
    kcu.column_name,
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name,
    rc.delete_rule,
    rc.update_rule
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
    ON tc.constraint_name = kcu.constraint_name
    AND tc.table_schema = kcu.table_schema
JOIN information_schema.constraint_column_usage AS ccu
    ON ccu.constraint_name = tc.constraint_name
    AND ccu.table_schema = tc.table_schema
JOIN information_schema.referential_constraints AS rc
    ON tc.constraint_name = rc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY'
    AND tc.table_name = 'students';

-- If delete_rule shows 'CASCADE', you need to fix it to 'SET NULL'
-- Run this to fix it:

-- Step 1: Drop the old constraint
ALTER TABLE students 
DROP CONSTRAINT IF EXISTS students_course_id_fkey;

-- Step 2: Add new constraint with SET NULL
ALTER TABLE students
ADD CONSTRAINT students_course_id_fkey 
FOREIGN KEY (course_id) 
REFERENCES courses(id) 
ON DELETE SET NULL 
ON UPDATE CASCADE;

-- Verify the change
SELECT
    tc.constraint_name,
    rc.delete_rule
FROM information_schema.table_constraints AS tc
JOIN information_schema.referential_constraints AS rc
    ON tc.constraint_name = rc.constraint_name
WHERE tc.table_name = 'students'
    AND tc.constraint_type = 'FOREIGN KEY';
