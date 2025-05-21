-- Step 1: Disable foreign key checks
SET FOREIGN_KEY_CHECKS = 0;

-- Step 2: Truncate or delete all tables
TRUNCATE TABLE users;
TRUNCATE TABLE roles;
TRUNCATE TABLE students;
TRUNCATE TABLE parents;
TRUNCATE TABLE receipts;
TRUNCATE TABLE classes;
TRUNCATE TABLE registrations;
TRUNCATE TABLE admissions;
TRUNCATE TABLE fees;


-- Step 3: Enable foreign key checks
SET FOREIGN_KEY_CHECKS = 1;
