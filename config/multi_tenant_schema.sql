-- Multi-tenant + branch model migration for Nwoma backend
-- Strict hierarchy enforced in this migration: tenant -> school -> branch
-- Run against school_db once (after backup) before enabling tenant middleware.
USE school_db;

SET FOREIGN_KEY_CHECKS = 0;

-- 1) Core tenancy tables
CREATE TABLE IF NOT EXISTS tenants (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(150) NOT NULL,
  slug VARCHAR(120) NOT NULL UNIQUE,
  status ENUM('active', 'suspended', 'cancelled') NOT NULL DEFAULT 'active',
  billing_email VARCHAR(150) NULL,
  timezone VARCHAR(64) NOT NULL DEFAULT 'UTC',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS tenant_subscriptions (
  id INT AUTO_INCREMENT PRIMARY KEY,
  tenant_id INT NOT NULL,
  plan_code ENUM('starter', 'growth', 'enterprise') NOT NULL DEFAULT 'starter',
  status ENUM('trialing', 'active', 'past_due', 'suspended', 'cancelled') NOT NULL DEFAULT 'trialing',
  currency VARCHAR(10) NOT NULL DEFAULT 'USD',
  monthly_price DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  student_unit_price DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  billing_cycle_day TINYINT UNSIGNED DEFAULT 1,
  trial_ends_at DATETIME NULL,
  current_period_start DATETIME NULL,
  current_period_end DATETIME NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_tenant_subscriptions_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
  KEY idx_tenant_subscriptions_tenant_status (tenant_id, status)
);

-- 2) Tenant scope on schools
ALTER TABLE schools
  ADD COLUMN tenant_id INT NULL AFTER id,
  ADD COLUMN code VARCHAR(50) NULL AFTER name,
  ADD COLUMN status ENUM('active', 'inactive') NOT NULL DEFAULT 'active' AFTER email,
  ADD COLUMN created_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  ADD COLUMN updated_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP;

ALTER TABLE schools
  ADD CONSTRAINT fk_schools_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD UNIQUE KEY uq_school_per_tenant_code (tenant_id, code),
  ADD KEY idx_schools_tenant_status (tenant_id, status);

-- 3) Branch model
CREATE TABLE IF NOT EXISTS branches (
  id INT AUTO_INCREMENT PRIMARY KEY,
  tenant_id INT NOT NULL,
  school_id INT NOT NULL,
  code VARCHAR(50) NOT NULL,
  name VARCHAR(150) NOT NULL,
  is_main TINYINT(1) NOT NULL DEFAULT 0,
  status ENUM('active', 'inactive') NOT NULL DEFAULT 'active',
  address TEXT NULL,
  phone_number VARCHAR(20) NULL,
  email VARCHAR(100) NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_branches_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT fk_branches_school FOREIGN KEY (school_id) REFERENCES schools(id) ON DELETE CASCADE ON UPDATE CASCADE,
  UNIQUE KEY uq_branch_code_per_school (school_id, code),
  KEY idx_branches_scope (tenant_id, school_id, status, is_main)
);

CREATE TABLE IF NOT EXISTS user_branch_access (
  user_id INT NOT NULL,
  branch_id INT NOT NULL,
  PRIMARY KEY (user_id, branch_id),
  CONSTRAINT fk_user_branch_access_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT fk_user_branch_access_branch FOREIGN KEY (branch_id) REFERENCES branches(id) ON DELETE CASCADE ON UPDATE CASCADE
);

-- 4) Add tenant_id / branch_id to business tables
ALTER TABLE users
  ADD COLUMN tenant_id INT NULL AFTER id,
  ADD COLUMN branch_id INT NULL AFTER school_id;
ALTER TABLE users
  ADD CONSTRAINT fk_users_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT fk_users_branch FOREIGN KEY (branch_id) REFERENCES branches(id) ON DELETE SET NULL ON UPDATE CASCADE,
  ADD KEY idx_users_scope (tenant_id, school_id, branch_id);

ALTER TABLE classes
  ADD COLUMN tenant_id INT NULL AFTER id,
  ADD COLUMN branch_id INT NULL AFTER school_id;
ALTER TABLE classes
  ADD CONSTRAINT fk_classes_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT fk_classes_branch FOREIGN KEY (branch_id) REFERENCES branches(id) ON DELETE SET NULL ON UPDATE CASCADE,
  ADD KEY idx_classes_scope (tenant_id, school_id, branch_id);

ALTER TABLE students
  ADD COLUMN tenant_id INT NULL AFTER id,
  ADD COLUMN branch_id INT NULL AFTER school_id;
ALTER TABLE students
  ADD CONSTRAINT fk_students_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT fk_students_branch FOREIGN KEY (branch_id) REFERENCES branches(id) ON DELETE SET NULL ON UPDATE CASCADE,
  ADD KEY idx_students_scope (tenant_id, school_id, branch_id);

ALTER TABLE admissions
  ADD COLUMN tenant_id INT NULL AFTER id,
  ADD COLUMN branch_id INT NULL AFTER school_id;
ALTER TABLE admissions
  ADD CONSTRAINT fk_admissions_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT fk_admissions_branch FOREIGN KEY (branch_id) REFERENCES branches(id) ON DELETE SET NULL ON UPDATE CASCADE,
  ADD KEY idx_admissions_scope (tenant_id, school_id, branch_id);

ALTER TABLE fees
  ADD COLUMN tenant_id INT NULL AFTER id,
  ADD COLUMN branch_id INT NULL AFTER school_id;
ALTER TABLE fees
  ADD CONSTRAINT fk_fees_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT fk_fees_branch FOREIGN KEY (branch_id) REFERENCES branches(id) ON DELETE SET NULL ON UPDATE CASCADE,
  ADD KEY idx_fees_scope (tenant_id, school_id, branch_id);

ALTER TABLE payments
  ADD COLUMN tenant_id INT NULL AFTER id,
  ADD COLUMN branch_id INT NULL AFTER school_id;
ALTER TABLE payments
  ADD CONSTRAINT fk_payments_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT fk_payments_branch FOREIGN KEY (branch_id) REFERENCES branches(id) ON DELETE SET NULL ON UPDATE CASCADE,
  ADD KEY idx_payments_scope (tenant_id, school_id, branch_id);

ALTER TABLE receipts
  ADD COLUMN tenant_id INT NULL AFTER id,
  ADD COLUMN branch_id INT NULL AFTER school_id;
ALTER TABLE receipts
  ADD CONSTRAINT fk_receipts_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT fk_receipts_branch FOREIGN KEY (branch_id) REFERENCES branches(id) ON DELETE SET NULL ON UPDATE CASCADE,
  ADD KEY idx_receipts_scope (tenant_id, school_id, branch_id);

ALTER TABLE registrations
  ADD COLUMN tenant_id INT NULL AFTER id,
  ADD COLUMN school_id INT NULL AFTER tenant_id,
  ADD COLUMN branch_id INT NULL AFTER school_id;
ALTER TABLE registrations
  ADD CONSTRAINT fk_registrations_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT fk_registrations_school FOREIGN KEY (school_id) REFERENCES schools(id) ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT fk_registrations_branch FOREIGN KEY (branch_id) REFERENCES branches(id) ON DELETE SET NULL ON UPDATE CASCADE,
  ADD KEY idx_registrations_scope (tenant_id, school_id, branch_id);

ALTER TABLE academic_years
  ADD COLUMN tenant_id INT NULL AFTER id,
  ADD COLUMN school_id INT NULL AFTER tenant_id;
ALTER TABLE academic_years
  ADD CONSTRAINT fk_academic_years_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT fk_academic_years_school FOREIGN KEY (school_id) REFERENCES schools(id) ON DELETE SET NULL ON UPDATE CASCADE,
  ADD KEY idx_academic_years_scope (tenant_id, school_id);

ALTER TABLE categories
  ADD COLUMN tenant_id INT NULL AFTER id,
  ADD COLUMN school_id INT NULL AFTER tenant_id;
ALTER TABLE categories
  ADD CONSTRAINT fk_categories_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT fk_categories_school FOREIGN KEY (school_id) REFERENCES schools(id) ON DELETE SET NULL ON UPDATE CASCADE,
  ADD KEY idx_categories_scope (tenant_id, school_id);

ALTER TABLE exams
  ADD COLUMN tenant_id INT NULL AFTER id,
  ADD COLUMN school_id INT NULL AFTER class_id,
  ADD COLUMN branch_id INT NULL AFTER school_id;
ALTER TABLE exams
  ADD CONSTRAINT fk_exams_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT fk_exams_school FOREIGN KEY (school_id) REFERENCES schools(id) ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT fk_exams_branch FOREIGN KEY (branch_id) REFERENCES branches(id) ON DELETE SET NULL ON UPDATE CASCADE,
  ADD KEY idx_exams_scope (tenant_id, school_id, branch_id);

-- 5) Existing user uniqueness changed to tenant-scoped uniqueness
DROP INDEX email ON users;
DROP INDEX username ON users;
ALTER TABLE users
  ADD UNIQUE KEY uq_users_tenant_email (tenant_id, email),
  ADD UNIQUE KEY uq_users_tenant_username (tenant_id, username);

-- 6) Backfill migration for existing records
INSERT INTO tenants (name, slug, status, timezone)
VALUES ('Legacy Tenant', 'legacy', 'active', 'UTC')
ON DUPLICATE KEY UPDATE name = VALUES(name), status = VALUES(status), timezone = VALUES(timezone);

SET @legacy_tenant_id := (SELECT id FROM tenants WHERE slug = 'legacy' LIMIT 1);

UPDATE schools
SET tenant_id = COALESCE(tenant_id, @legacy_tenant_id);

INSERT INTO branches (tenant_id, school_id, code, name, is_main, status, address, phone_number, email)
SELECT s.tenant_id, s.id, CONCAT('MAIN-', s.id), CONCAT(s.name, ' Main Branch'), 1, 'active', s.address, s.phone_number, s.email
FROM schools s
LEFT JOIN branches b ON b.school_id = s.id AND b.is_main = 1
WHERE b.id IS NULL;

UPDATE users u
LEFT JOIN schools s ON s.id = u.school_id
LEFT JOIN branches b ON b.school_id = u.school_id AND b.is_main = 1
SET u.tenant_id = COALESCE(u.tenant_id, s.tenant_id, @legacy_tenant_id),
    u.branch_id = COALESCE(u.branch_id, b.id);

UPDATE classes c
JOIN schools s ON s.id = c.school_id
LEFT JOIN branches b ON b.school_id = c.school_id AND b.is_main = 1
SET c.tenant_id = COALESCE(c.tenant_id, s.tenant_id),
    c.branch_id = COALESCE(c.branch_id, b.id);

UPDATE students st
LEFT JOIN schools s ON s.id = st.school_id
LEFT JOIN classes c ON c.id = st.class_id
LEFT JOIN branches bs ON bs.school_id = st.school_id AND bs.is_main = 1
SET st.tenant_id = COALESCE(st.tenant_id, s.tenant_id),
    st.branch_id = COALESCE(st.branch_id, c.branch_id, bs.id);

UPDATE admissions a
LEFT JOIN schools s ON s.id = a.school_id
LEFT JOIN branches b ON b.school_id = a.school_id AND b.is_main = 1
SET a.tenant_id = COALESCE(a.tenant_id, s.tenant_id),
    a.branch_id = COALESCE(a.branch_id, b.id);

UPDATE fees f
LEFT JOIN schools s ON s.id = f.school_id
LEFT JOIN branches b ON b.school_id = f.school_id AND b.is_main = 1
SET f.tenant_id = COALESCE(f.tenant_id, s.tenant_id),
    f.branch_id = COALESCE(f.branch_id, b.id);

UPDATE payments p
LEFT JOIN schools s ON s.id = p.school_id
LEFT JOIN branches b ON b.school_id = p.school_id AND b.is_main = 1
SET p.tenant_id = COALESCE(p.tenant_id, s.tenant_id),
    p.branch_id = COALESCE(p.branch_id, b.id);

UPDATE receipts r
LEFT JOIN schools s ON s.id = r.school_id
LEFT JOIN branches b ON b.school_id = r.school_id AND b.is_main = 1
SET r.tenant_id = COALESCE(r.tenant_id, s.tenant_id),
    r.branch_id = COALESCE(r.branch_id, b.id);

UPDATE registrations r
SET r.tenant_id = COALESCE(r.tenant_id, @legacy_tenant_id);

UPDATE academic_years ay
SET ay.tenant_id = COALESCE(ay.tenant_id, @legacy_tenant_id);

UPDATE categories c
SET c.tenant_id = COALESCE(c.tenant_id, @legacy_tenant_id);

UPDATE exams e
LEFT JOIN classes c ON c.id = e.class_id
LEFT JOIN schools s ON s.id = c.school_id
LEFT JOIN branches b ON b.school_id = s.id AND b.is_main = 1
SET e.school_id = COALESCE(e.school_id, c.school_id),
    e.tenant_id = COALESCE(e.tenant_id, s.tenant_id),
    e.branch_id = COALESCE(e.branch_id, c.branch_id, b.id);

-- Default branch access for all users currently in a school
INSERT IGNORE INTO user_branch_access (user_id, branch_id)
SELECT u.id, b.id
FROM users u
JOIN branches b ON b.school_id = u.school_id
WHERE b.is_main = 1
  AND u.school_id IS NOT NULL;

-- 7) Hard requirements after backfill
ALTER TABLE schools MODIFY COLUMN tenant_id INT NOT NULL;
ALTER TABLE users MODIFY COLUMN tenant_id INT NOT NULL;
ALTER TABLE classes MODIFY COLUMN tenant_id INT NOT NULL;
ALTER TABLE students MODIFY COLUMN tenant_id INT NOT NULL;

SET FOREIGN_KEY_CHECKS = 1;
