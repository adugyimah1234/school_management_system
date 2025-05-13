USE school_db;

-- Drop tables if they exist
DROP TABLE IF EXISTS registrations;
DROP TABLE IF EXISTS academic_years;

-- -----------------------------------------------------
-- Table `academic_years`
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS academic_years (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `year` VARCHAR(9) NOT NULL UNIQUE,  -- e.g., "2023-2024"
    `start_date` DATE NOT NULL,
    `end_date` DATE NOT NULL,
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
)  ENGINE=InnoDB;

-- -----------------------------------------------------
-- Table `registrations`
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS registrations (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `student_id` INT NOT NULL,
  `class_id` INT NOT NULL,
  `academic_year_id` INT NOT NULL,
  `registration_date` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`student_id`) REFERENCES `students` (`id`),
  FOREIGN KEY (`class_id`) REFERENCES `classes` (`id`),
  FOREIGN KEY (`academic_year_id`) REFERENCES `academic_years` (`id`),
  UNIQUE INDEX `registration_id_UNIQUE` (`id` ASC) VISIBLE,
  INDEX `fk_registrations_students_idx` (`student_id` ASC) VISIBLE,
  INDEX `fk_registrations_classes_idx` (`class_id` ASC) VISIBLE
) ENGINE=InnoDB;
