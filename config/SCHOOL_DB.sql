use school_db;
-- SQL Script: Professional School Management System

-- Table: categories
-- CREATE TABLE categories (
--   id INT AUTO_INCREMENT PRIMARY KEY,
--   name VARCHAR(10) NOT NULL UNIQUE -- SVC, MOD, CIV
-- );

-- Table: schools (multi-branch support)
-- CREATE TABLE schools (
--   id INT AUTO_INCREMENT PRIMARY KEY,
--   name VARCHAR(100) NOT NULL,
--   address TEXT,
--   phone_number VARCHAR(20),
--   email VARCHAR(100)
-- );

-- Table: classes
-- CREATE TABLE classes (
--   id INT AUTO_INCREMENT PRIMARY KEY,
--   school_id INT NOT NULL,
--   name VARCHAR(50) NOT NULL,
--   level INT,
--   FOREIGN KEY (school_id) REFERENCES schools(id)
-- );

-- Table: students
CREATE TABLE students (
  id INT AUTO_INCREMENT PRIMARY KEY,
  first_name VARCHAR(50) NOT NULL,
  middle_name VARCHAR(50),
  last_name VARCHAR(50) NOT NULL,
  dob DATE NOT NULL,
  gender ENUM('Male', 'Female') NOT NULL,
  category_id INT NOT NULL,
  class_id INT,
  registration_date DATE DEFAULT (CURRENT_DATE()),
  admission_status ENUM('registered', 'admitted') DEFAULT 'registered',
  status ENUM('active', 'inactive', 'graduated') DEFAULT 'active',
  school_id INT,
  FOREIGN KEY (category_id) REFERENCES categories(id),
  FOREIGN KEY (class_id) REFERENCES classes(id),
  FOREIGN KEY (school_id) REFERENCES schools(id)
);

-- Table: parents
CREATE TABLE parents (
  id INT AUTO_INCREMENT PRIMARY KEY,
  student_id INT NOT NULL,
  full_name VARCHAR(100) NOT NULL,
  relationship ENUM('father', 'mother', 'guardian') DEFAULT 'guardian',
  phone_number VARCHAR(20),
  email VARCHAR(100),
  address TEXT,
  FOREIGN KEY (student_id) REFERENCES students(id)
);

-- Table: users (includes admins, frontdesk, accountant)
CREATE TABLE users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  full_name VARCHAR(100) NOT NULL,
  email VARCHAR(100) NOT NULL UNIQUE,
  password VARCHAR(255) NOT NULL,
  role ENUM('admin', 'frontdesk', 'accountant') NOT NULL,
  school_id INT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (school_id) REFERENCES schools(id)
);

-- Table: admissions
CREATE TABLE admissions (
  id INT AUTO_INCREMENT PRIMARY KEY,
  student_id INT NOT NULL,
  admission_date DATE NOT NULL,
  admitted_by INT,
  class_id INT,
  school_id INT,
  FOREIGN KEY (student_id) REFERENCES students(id),
  FOREIGN KEY (admitted_by) REFERENCES users(id),
  FOREIGN KEY (class_id) REFERENCES classes(id),
  FOREIGN KEY (school_id) REFERENCES schools(id)
);

-- Table: fees
CREATE TABLE fees (
  id INT AUTO_INCREMENT PRIMARY KEY,
  category_id INT NOT NULL,
  class_id INT NOT NULL,
  fee_type ENUM('registration', 'admission', 'tuition', 'exam') NOT NULL,
  amount DECIMAL(10, 2) NOT NULL,
  description TEXT,
  effective_date DATE,
  school_id INT,
  FOREIGN KEY (category_id) REFERENCES categories(id),
  FOREIGN KEY (class_id) REFERENCES classes(id),
  FOREIGN KEY (school_id) REFERENCES schools(id)
);

-- Table: payments (installments supported)
CREATE TABLE payments (
  id INT AUTO_INCREMENT PRIMARY KEY,
  student_id INT NOT NULL,
  fee_id INT NOT NULL,
  amount_paid DECIMAL(10, 2) NOT NULL,
  payment_date DATE NOT NULL,
  installment_number INT DEFAULT 1,
  recorded_by INT,
  school_id INT,
  FOREIGN KEY (student_id) REFERENCES students(id),
  FOREIGN KEY (fee_id) REFERENCES fees(id),
  FOREIGN KEY (recorded_by) REFERENCES users(id),
  FOREIGN KEY (school_id) REFERENCES schools(id)
);

-- Table: receipts
CREATE TABLE receipts (
  id INT AUTO_INCREMENT PRIMARY KEY,
  student_id INT NOT NULL,
  payment_id INT,
  receipt_type ENUM('registration', 'admission', 'tuition', 'exam'),
  amount DECIMAL(10, 2),
  issued_by INT,
  date_issued DATE,
  venue VARCHAR(100),
  logo_url VARCHAR(255),
  exam_date DATE,
  class_id INT,
  school_id INT,
  FOREIGN KEY (student_id) REFERENCES students(id),
  FOREIGN KEY (payment_id) REFERENCES payments(id),
  FOREIGN KEY (issued_by) REFERENCES users(id),
  FOREIGN KEY (class_id) REFERENCES classes(id),
  FOREIGN KEY (school_id) REFERENCES schools(id)
);

-- Table: exams (link to receipts or class exams)
CREATE TABLE exams (
  id INT AUTO_INCREMENT PRIMARY KEY,
  class_id INT NOT NULL,
  category_id INT,
  name VARCHAR(100),
  date DATE,
  venue VARCHAR(100),
  FOREIGN KEY (class_id) REFERENCES classes(id),
  FOREIGN KEY (category_id) REFERENCES categories(id)
);

-- Seed categories
INSERT INTO categories (name) VALUES ('SVC'), ('MOD'), ('CIV');

