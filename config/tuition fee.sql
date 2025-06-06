CREATE TABLE tuition_fees (
  id INT AUTO_INCREMENT PRIMARY KEY,
  category_id INT NOT NULL,
  class_id INT NOT NULL,
  amount DECIMAL(10,2) NOT NULL,
  academic_year VARCHAR(20) NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (category_id) REFERENCES categories(id),
  FOREIGN KEY (class_id) REFERENCES classes(id)
);

CREATE TABLE tuition_payments (
  id INT AUTO_INCREMENT PRIMARY KEY,
  student_id INT NOT NULL,
  tuition_fee_id INT NOT NULL,
  amount_paid DECIMAL(10,2) NOT NULL,
  payment_date DATE NOT NULL,
  payment_method VARCHAR(50),
  notes TEXT,
  recorded_by INT, -- user/admin id
  FOREIGN KEY (student_id) REFERENCES students(id),
  FOREIGN KEY (tuition_fee_id) REFERENCES tuition_fees(id),
  FOREIGN KEY (recorded_by) REFERENCES users(id)
);
