CREATE DATABASE  IF NOT EXISTS `school_db` /*!40100 DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci */ /*!80016 DEFAULT ENCRYPTION='N' */;
USE `school_db`;
-- MySQL dump 10.13  Distrib 8.0.41, for Win64 (x86_64)
--
-- Host: 127.0.0.1    Database: school_db
-- ------------------------------------------------------
-- Server version	9.2.0

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!50503 SET NAMES utf8 */;
/*!40103 SET @OLD_TIME_ZONE=@@TIME_ZONE */;
/*!40103 SET TIME_ZONE='+00:00' */;
/*!40014 SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0 */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;

--
-- Table structure for table `academic_years`
--

DROP TABLE IF EXISTS `academic_years`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `academic_years` (
  `id` int NOT NULL AUTO_INCREMENT,
  `year` varchar(9) DEFAULT NULL,
  `start_date` date DEFAULT NULL,
  `end_date` date DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `academic_years`
--

LOCK TABLES `academic_years` WRITE;
/*!40000 ALTER TABLE `academic_years` DISABLE KEYS */;
INSERT INTO `academic_years` VALUES (3,'2025-2026','2025-01-01','2026-07-31','2025-05-13 17:35:54','2025-06-16 05:14:32');
/*!40000 ALTER TABLE `academic_years` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `admissions`
--

DROP TABLE IF EXISTS `admissions`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `admissions` (
  `id` int NOT NULL AUTO_INCREMENT,
  `student_id` int NOT NULL,
  `admission_date` date NOT NULL,
  `admitted_by` int DEFAULT NULL,
  `class_id` int DEFAULT NULL,
  `school_id` int DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `student_id` (`student_id`),
  KEY `admitted_by` (`admitted_by`),
  KEY `class_id` (`class_id`),
  KEY `school_id` (`school_id`),
  CONSTRAINT `admissions_ibfk_1` FOREIGN KEY (`student_id`) REFERENCES `students` (`id`),
  CONSTRAINT `admissions_ibfk_2` FOREIGN KEY (`admitted_by`) REFERENCES `users` (`id`),
  CONSTRAINT `admissions_ibfk_3` FOREIGN KEY (`class_id`) REFERENCES `classes` (`id`),
  CONSTRAINT `admissions_ibfk_4` FOREIGN KEY (`school_id`) REFERENCES `schools` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `admissions`
--

LOCK TABLES `admissions` WRITE;
/*!40000 ALTER TABLE `admissions` DISABLE KEYS */;
/*!40000 ALTER TABLE `admissions` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `categories`
--

DROP TABLE IF EXISTS `categories`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `categories` (
  `id` int NOT NULL AUTO_INCREMENT,
  `name` varchar(10) NOT NULL,
  `amount` decimal(10,2) NOT NULL DEFAULT '0.00',
  `code` varchar(45) DEFAULT NULL,
  `description` varchar(45) DEFAULT NULL,
  `status` varchar(45) DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `name` (`name`)
) ENGINE=InnoDB AUTO_INCREMENT=10 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `categories`
--

LOCK TABLES `categories` WRITE;
/*!40000 ALTER TABLE `categories` DISABLE KEYS */;
INSERT INTO `categories` VALUES (1,'SVC',200.00,NULL,NULL,NULL),(2,'MOD',200.00,NULL,NULL,NULL),(3,'CIV',220.00,NULL,NULL,NULL);
/*!40000 ALTER TABLE `categories` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `classes`
--

DROP TABLE IF EXISTS `classes`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `classes` (
  `id` int NOT NULL AUTO_INCREMENT,
  `school_id` int NOT NULL,
  `name` varchar(50) NOT NULL,
  `level` int DEFAULT NULL,
  `slots` int NOT NULL DEFAULT '0',
  PRIMARY KEY (`id`),
  KEY `school_id` (`school_id`),
  CONSTRAINT `classes_ibfk_1` FOREIGN KEY (`school_id`) REFERENCES `schools` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=435 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `classes`
--

LOCK TABLES `classes` WRITE;
/*!40000 ALTER TABLE `classes` DISABLE KEYS */;
INSERT INTO `classes` VALUES (390,29,'KG 1 B',1,50),(391,29,'KG 1 C',1,50),(392,29,'KG 1 A',1,50),(393,29,'KG 1 D',1,50),(394,29,'KG 2 B',1,17),(395,29,'KG 2 A',1,15),(396,29,'KG 2 D',1,13),(397,29,'KG 2 C',1,15),(398,30,'BASIC 1',1,50),(399,30,'BASIC 3',1,4),(400,30,'BASIC 5',1,0),(401,30,'BASIC 2',1,5),(402,30,'BASIC 4',1,4),(403,30,'BASIC 7',1,0),(404,30,'BASIC 6',1,4),(405,30,'BASIC 8',1,0),(411,35,'Basic 1',NULL,0),(412,35,'Basic 4',NULL,0),(413,35,'Basic 6',NULL,0),(414,35,'Basic 8',NULL,0),(415,35,'Basic 3',NULL,0),(416,35,'Basic 2',NULL,0),(417,35,'Basic 7',NULL,0),(418,35,'Basic 5',NULL,0),(419,36,'Basic 1',NULL,0),(420,36,'Basic 6',NULL,0),(421,36,'Basic 5',NULL,0),(422,36,'Basic 4',NULL,0),(423,36,'Basic 3',NULL,0),(424,36,'Basic 2',NULL,0),(425,36,'Basic 7',NULL,0),(426,36,'Basic 8',NULL,0),(427,34,'Basic 1',NULL,0),(428,34,'Basic 2',NULL,0),(429,34,'Basic 3',NULL,0),(430,34,'Basic 5',NULL,0),(431,34,'Basic 4',NULL,0),(432,34,'Basic 6',NULL,0),(433,34,'Basic 7',NULL,0),(434,34,'Basic 8',NULL,0);
/*!40000 ALTER TABLE `classes` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `exams`
--

DROP TABLE IF EXISTS `exams`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `exams` (
  `id` int NOT NULL AUTO_INCREMENT,
  `class_id` int NOT NULL,
  `category_id` int DEFAULT NULL,
  `name` varchar(100) DEFAULT NULL,
  `date` date DEFAULT NULL,
  `venue` varchar(100) DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `class_id` (`class_id`),
  KEY `category_id` (`category_id`)
) ENGINE=InnoDB AUTO_INCREMENT=6 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `exams`
--

LOCK TABLES `exams` WRITE;
/*!40000 ALTER TABLE `exams` DISABLE KEYS */;
INSERT INTO `exams` VALUES (5,1,1,'Registration Exam','2025-09-29','Garrison Campus');
/*!40000 ALTER TABLE `exams` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `fee_presets`
--

DROP TABLE IF EXISTS `fee_presets`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `fee_presets` (
  `id` int NOT NULL AUTO_INCREMENT,
  `type` varchar(50) NOT NULL,
  `category` varchar(50) DEFAULT NULL,
  `class_name` varchar(50) DEFAULT NULL,
  `amount` decimal(10,2) NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=16 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `fee_presets`
--

LOCK TABLES `fee_presets` WRITE;
/*!40000 ALTER TABLE `fee_presets` DISABLE KEYS */;
INSERT INTO `fee_presets` VALUES (1,'levy','SVC',NULL,200.00),(2,'levy','CIV',NULL,220.00),(3,'registration',NULL,NULL,40.00),(4,'furniture',NULL,NULL,100.00),(5,'jersey_crest',NULL,NULL,120.00),(6,'textBooks',NULL,'kg',100.00),(7,'textBooks',NULL,'basic 1',120.00),(8,'textBooks',NULL,'basic 3',150.00),(9,'textBooks',NULL,'basic 5',180.00),(10,'textBooks',NULL,'basic 7',200.00),(11,'exerciseBooks',NULL,'kg',30.00),(12,'exerciseBooks',NULL,'basic 1',50.00),(13,'exerciseBooks',NULL,'basic 3',60.00),(14,'exerciseBooks',NULL,'basic 5',70.00),(15,'exerciseBooks',NULL,'basic 7',80.00);
/*!40000 ALTER TABLE `fee_presets` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `fees`
--

DROP TABLE IF EXISTS `fees`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `fees` (
  `id` int NOT NULL AUTO_INCREMENT,
  `category_id` int NOT NULL,
  `class_id` int NOT NULL,
  `fee_type` enum('registration','admission','tuition','exam') NOT NULL,
  `amount` decimal(10,2) NOT NULL,
  `description` text,
  `effective_date` date DEFAULT NULL,
  `school_id` int DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `category_id` (`category_id`),
  KEY `class_id` (`class_id`),
  KEY `school_id` (`school_id`),
  CONSTRAINT `fees_ibfk_1` FOREIGN KEY (`category_id`) REFERENCES `categories` (`id`),
  CONSTRAINT `fees_ibfk_2` FOREIGN KEY (`class_id`) REFERENCES `classes` (`id`),
  CONSTRAINT `fees_ibfk_3` FOREIGN KEY (`school_id`) REFERENCES `schools` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `fees`
--

LOCK TABLES `fees` WRITE;
/*!40000 ALTER TABLE `fees` DISABLE KEYS */;
/*!40000 ALTER TABLE `fees` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `modules`
--

DROP TABLE IF EXISTS `modules`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `modules` (
  `id` varchar(50) NOT NULL,
  `name` varchar(100) NOT NULL,
  `path` varchar(100) NOT NULL,
  `description` text,
  `parent_id` varchar(50) DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `parent_id` (`parent_id`),
  CONSTRAINT `modules_ibfk_1` FOREIGN KEY (`parent_id`) REFERENCES `modules` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `modules`
--

LOCK TABLES `modules` WRITE;
/*!40000 ALTER TABLE `modules` DISABLE KEYS */;
/*!40000 ALTER TABLE `modules` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `parents`
--

DROP TABLE IF EXISTS `parents`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `parents` (
  `id` int NOT NULL AUTO_INCREMENT,
  `student_id` int NOT NULL,
  `full_name` varchar(100) NOT NULL,
  `relationship` enum('father','mother','guardian') DEFAULT 'guardian',
  `phone_number` varchar(20) DEFAULT NULL,
  `email` varchar(100) DEFAULT NULL,
  `address` text,
  PRIMARY KEY (`id`),
  KEY `student_id` (`student_id`),
  CONSTRAINT `parents_ibfk_1` FOREIGN KEY (`student_id`) REFERENCES `students` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `parents`
--

LOCK TABLES `parents` WRITE;
/*!40000 ALTER TABLE `parents` DISABLE KEYS */;
/*!40000 ALTER TABLE `parents` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Temporary view structure for view `payment_breakdown_by_method`
--

DROP TABLE IF EXISTS `payment_breakdown_by_method`;
/*!50001 DROP VIEW IF EXISTS `payment_breakdown_by_method`*/;
SET @saved_cs_client     = @@character_set_client;
/*!50503 SET character_set_client = utf8mb4 */;
/*!50001 CREATE VIEW `payment_breakdown_by_method` AS SELECT 
 1 AS `method`,
 1 AS `total_transactions`,
 1 AS `total_amount`*/;
SET character_set_client = @saved_cs_client;

--
-- Temporary view structure for view `payment_request_status_summary`
--

DROP TABLE IF EXISTS `payment_request_status_summary`;
/*!50001 DROP VIEW IF EXISTS `payment_request_status_summary`*/;
SET @saved_cs_client     = @@character_set_client;
/*!50503 SET character_set_client = utf8mb4 */;
/*!50001 CREATE VIEW `payment_request_status_summary` AS SELECT 
 1 AS `status`,
 1 AS `total_requests`,
 1 AS `total_amount`*/;
SET character_set_client = @saved_cs_client;

--
-- Table structure for table `payment_requests`
--

DROP TABLE IF EXISTS `payment_requests`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `payment_requests` (
  `id` int NOT NULL AUTO_INCREMENT,
  `user_id` int NOT NULL,
  `amount` decimal(10,2) NOT NULL,
  `description` varchar(255) DEFAULT NULL,
  `status` enum('pending','paid','cancelled') DEFAULT 'pending',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `payment_requests`
--

LOCK TABLES `payment_requests` WRITE;
/*!40000 ALTER TABLE `payment_requests` DISABLE KEYS */;
/*!40000 ALTER TABLE `payment_requests` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `payments`
--

DROP TABLE IF EXISTS `payments`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `payments` (
  `id` int NOT NULL AUTO_INCREMENT,
  `student_id` int NOT NULL,
  `fee_id` int DEFAULT NULL,
  `amount_paid` decimal(10,2) NOT NULL,
  `payment_date` date NOT NULL,
  `installment_number` int DEFAULT '1',
  `recorded_by` int DEFAULT NULL,
  `school_id` int DEFAULT NULL,
  `type` varchar(50) DEFAULT NULL,
  `method` varchar(50) DEFAULT NULL,
  `description` text,
  PRIMARY KEY (`id`),
  KEY `student_id` (`student_id`),
  KEY `fee_id` (`fee_id`),
  KEY `recorded_by` (`recorded_by`),
  KEY `school_id` (`school_id`),
  CONSTRAINT `payments_ibfk_1` FOREIGN KEY (`student_id`) REFERENCES `students` (`id`),
  CONSTRAINT `payments_ibfk_3` FOREIGN KEY (`recorded_by`) REFERENCES `users` (`id`),
  CONSTRAINT `payments_ibfk_4` FOREIGN KEY (`school_id`) REFERENCES `schools` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=19 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `payments`
--

LOCK TABLES `payments` WRITE;
/*!40000 ALTER TABLE `payments` DISABLE KEYS */;
/*!40000 ALTER TABLE `payments` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `receipt_items`
--

DROP TABLE IF EXISTS `receipt_items`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `receipt_items` (
  `id` int NOT NULL AUTO_INCREMENT,
  `receipt_id` int NOT NULL,
  `receipt_type` varchar(255) NOT NULL,
  `amount` decimal(10,2) NOT NULL,
  PRIMARY KEY (`id`),
  KEY `receipt_id` (`receipt_id`),
  CONSTRAINT `receipt_items_ibfk_1` FOREIGN KEY (`receipt_id`) REFERENCES `receipts` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=59 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `receipt_items`
--

LOCK TABLES `receipt_items` WRITE;
/*!40000 ALTER TABLE `receipt_items` DISABLE KEYS */;
/*!40000 ALTER TABLE `receipt_items` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `receipts`
--

DROP TABLE IF EXISTS `receipts`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `receipts` (
  `id` int NOT NULL AUTO_INCREMENT,
  `student_id` int DEFAULT NULL,
  `payment_id` int DEFAULT NULL,
  `receipt_type` enum('registration','furniture','levy','textBooks','exerciseBooks','jersey_crest') NOT NULL,
  `amount` decimal(10,2) DEFAULT NULL,
  `issued_by` int DEFAULT NULL,
  `date_issued` date DEFAULT NULL,
  `venue` varchar(100) DEFAULT NULL,
  `logo_url` varchar(255) DEFAULT NULL,
  `exam_date` date DEFAULT NULL,
  `class_id` int DEFAULT NULL,
  `school_id` int DEFAULT NULL,
  `exam_id` int DEFAULT NULL,
  `registration_id` int DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `student_id` (`student_id`),
  KEY `payment_id` (`payment_id`),
  KEY `issued_by` (`issued_by`),
  KEY `class_id` (`class_id`),
  KEY `school_id` (`school_id`),
  KEY `fk_receipts_exam` (`exam_id`),
  KEY `fk_receipts_registration_id` (`registration_id`),
  CONSTRAINT `fk_receipts_exam` FOREIGN KEY (`exam_id`) REFERENCES `exams` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `fk_receipts_registration_id` FOREIGN KEY (`registration_id`) REFERENCES `registrations` (`id`),
  CONSTRAINT `receipts_ibfk_1` FOREIGN KEY (`student_id`) REFERENCES `students` (`id`),
  CONSTRAINT `receipts_ibfk_2` FOREIGN KEY (`payment_id`) REFERENCES `payments` (`id`),
  CONSTRAINT `receipts_ibfk_3` FOREIGN KEY (`issued_by`) REFERENCES `users` (`id`),
  CONSTRAINT `receipts_ibfk_4` FOREIGN KEY (`class_id`) REFERENCES `classes` (`id`),
  CONSTRAINT `receipts_ibfk_5` FOREIGN KEY (`school_id`) REFERENCES `schools` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=154 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `receipts`
--

LOCK TABLES `receipts` WRITE;
/*!40000 ALTER TABLE `receipts` DISABLE KEYS */;
/*!40000 ALTER TABLE `receipts` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `registrations`
--

DROP TABLE IF EXISTS `registrations`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `registrations` (
  `id` int NOT NULL AUTO_INCREMENT,
  `first_name` varchar(255) NOT NULL,
  `middle_name` varchar(255) DEFAULT NULL,
  `last_name` varchar(255) NOT NULL,
  `category` varchar(50) NOT NULL,
  `date_of_birth` date NOT NULL,
  `class_applying_for` varchar(10) NOT NULL,
  `gender` varchar(10) NOT NULL,
  `email` varchar(255) DEFAULT NULL,
  `phone_number` varchar(20) NOT NULL,
  `address` text NOT NULL,
  `previous_school` varchar(255) DEFAULT NULL,
  `guardian_name` varchar(255) NOT NULL,
  `relationship` varchar(100) NOT NULL,
  `guardian_phone_number` varchar(20) NOT NULL,
  `academic_year_id` int NOT NULL,
  `registration_date` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `status` enum('pending','approved','rejected') NOT NULL DEFAULT 'pending',
  `payment_type` enum('cash','momo','credit card') DEFAULT 'cash',
  `payment_status` enum('unpaid','partial','paid') DEFAULT 'unpaid',
  `scores` int DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `academic_year_id` (`academic_year_id`),
  CONSTRAINT `registrations_ibfk_1` FOREIGN KEY (`academic_year_id`) REFERENCES `academic_years` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=101 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `registrations`
--

LOCK TABLES `registrations` WRITE;
/*!40000 ALTER TABLE `registrations` DISABLE KEYS */;
/*!40000 ALTER TABLE `registrations` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `roles`
--

DROP TABLE IF EXISTS `roles`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `roles` (
  `id` int NOT NULL AUTO_INCREMENT,
  `name` varchar(50) NOT NULL,
  `description` text,
  PRIMARY KEY (`id`),
  UNIQUE KEY `name` (`name`)
) ENGINE=InnoDB AUTO_INCREMENT=8 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `roles`
--

LOCK TABLES `roles` WRITE;
/*!40000 ALTER TABLE `roles` DISABLE KEYS */;
INSERT INTO `roles` VALUES (1,'admin','System Administrator'),(2,'teacher','School Teacher'),(3,'frontdesk','Front Desk Staff'),(4,'accountant','School Accountant'),(7,'staff','General Staff Member');
/*!40000 ALTER TABLE `roles` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `schools`
--

DROP TABLE IF EXISTS `schools`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `schools` (
  `id` int NOT NULL AUTO_INCREMENT,
  `name` varchar(100) NOT NULL,
  `address` text,
  `phone_number` varchar(20) DEFAULT NULL,
  `email` varchar(100) DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=37 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `schools`
--

LOCK TABLES `schools` WRITE;
/*!40000 ALTER TABLE `schools` DISABLE KEYS */;
INSERT INTO `schools` VALUES (29,'GARRISON KINDERGARTEN SCHOOL','3 INFANTRY BATTALION, LIBERATION BARRACKS - SUNYANI','',''),(30,'GARRISON BASIC SCHOOL','3 INFANTRY BATTALION, LIBRATION BARRACKS - SUNYANI','',''),(34,'LIBERATION BASIC SCHOOL','3 INFANTRY BATTALION, LIBERATION BARRACKS - SUNYANI','',''),(35,'FORCES BASIC SCHOOL','3 INFANTRY BATTALION, LIBERATION BARRACKS - SUNYANI','',''),(36,'SERVICES BASIC SCHOOL','3 INFANTRY BATTALION, LIBERATION BARRACKS - SUNYANI','','');
/*!40000 ALTER TABLE `schools` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `students`
--

DROP TABLE IF EXISTS `students`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `students` (
  `id` int NOT NULL AUTO_INCREMENT,
  `first_name` varchar(50) NOT NULL,
  `middle_name` varchar(50) DEFAULT NULL,
  `last_name` varchar(50) NOT NULL,
  `dob` date NOT NULL,
  `gender` enum('Male','Female') NOT NULL,
  `category_id` int NOT NULL,
  `class_id` int DEFAULT NULL,
  `registration_date` date DEFAULT (curdate()),
  `admission_status` enum('registered','admitted','in_school') NOT NULL,
  `status` enum('active','inactive','graduated') DEFAULT 'active',
  `school_id` int DEFAULT NULL,
  `scores` int DEFAULT '0',
  `academic_year_id` int DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_name_dob` (`first_name`,`last_name`,`middle_name`,`dob`),
  KEY `category_id` (`category_id`),
  KEY `class_id` (`class_id`),
  KEY `school_id` (`school_id`),
  KEY `fk_academic_year` (`academic_year_id`),
  CONSTRAINT `fk_academic_year` FOREIGN KEY (`academic_year_id`) REFERENCES `academic_years` (`id`),
  CONSTRAINT `students_ibfk_1` FOREIGN KEY (`category_id`) REFERENCES `categories` (`id`),
  CONSTRAINT `students_ibfk_2` FOREIGN KEY (`class_id`) REFERENCES `classes` (`id`),
  CONSTRAINT `students_ibfk_3` FOREIGN KEY (`school_id`) REFERENCES `schools` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=155 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `students`
--

LOCK TABLES `students` WRITE;
/*!40000 ALTER TABLE `students` DISABLE KEYS */;
INSERT INTO `students` VALUES (71,'ABDUL SUBUR','YUDDIF','KANJIRI','2018-01-11','Male',1,428,'2025-06-19','in_school','active',34,0,NULL),(72,'ABDULAI SUMAILA',NULL,'GANDA','2017-05-11','Female',3,428,'2025-06-19','in_school','active',34,0,NULL),(73,'ABDUL-BASIT ','','GANDA','2018-03-03','Male',1,428,'2025-06-19','in_school','active',34,0,NULL),(74,'ABENA ','OSEI ','THYWILL','2019-04-10','Female',2,428,'2025-06-19','in_school','active',34,0,NULL),(75,'YASEL',NULL,'ABUBAKARI','2017-02-27','Female',3,428,'2025-06-19','in_school','active',34,0,NULL),(76,'JAKAR ISHRAT','','ADANI','2017-02-11','Male',3,428,'2025-06-19','in_school','active',34,0,NULL),(77,'ADOM','ADDAN','BEZALEL','2017-02-23','Male',3,428,'2025-06-19','in_school','active',34,0,NULL),(78,'JAIDEN',NULL,'AFARI BAAH','2018-12-20','Male',2,428,'2025-06-19','in_school','active',34,0,NULL),(79,'BLESSING FOBI',NULL,'AFFUL','2018-07-07','Female',2,428,'2025-06-19','in_school','active',34,0,NULL),(80,'EMMANUEL','GYAU','AGYEMANG','2017-12-24','Male',3,428,'2025-06-19','in_school','active',34,0,NULL),(81,'LUCY','DELALI','AMAKYE','2018-03-13','Female',1,428,'2025-06-19','in_school','active',34,0,NULL),(82,'FELIX','AMANKWAA','ADUSEI OWUSU','2017-04-18','Male',1,428,'2025-06-19','in_school','active',30,0,NULL),(83,'AMANKWAA ADUTWUM',NULL,'JEDEDIAH','2017-11-03','Male',3,401,'2025-06-19','in_school','active',30,0,NULL),(84,'JEDEDAH',NULL,'AMAMKWAA ADUTWUMWAA','2017-11-03','Female',3,428,'2025-06-19','in_school','active',34,0,NULL),(85,'FRANK',NULL,'AMOAH BOATENG','2017-06-09','Male',3,428,'2025-06-19','in_school','active',34,0,NULL),(86,'FRANCIS DAVID',NULL,'AMOATENG','2017-12-01','Male',3,428,'2025-06-19','in_school','active',34,0,NULL),(87,'AKUA',NULL,'AMOBIL EDINA','2018-01-10','Female',1,428,'2025-06-19','in_school','active',34,0,NULL),(88,'STEPHANIE GYAN',NULL,'AMPONSA','2017-05-26','Female',3,428,'2025-06-19','in_school','active',34,0,NULL),(89,'ANIMA',NULL,'TAKYI MARRANDA','2017-07-12','Female',3,428,'2025-06-19','in_school','active',34,0,NULL),(90,'JACINTHA',NULL,'APOTAREMAN AKOLBILA','2018-04-10','Female',2,428,'2025-06-19','in_school','active',34,0,NULL),(91,'ABEL',NULL,'ASANTE','2018-01-26','Male',1,428,'2025-06-19','in_school','active',34,0,NULL),(92,'ABAYA NELLEY','','ASEDA KORKOR','2018-07-24','Female',1,428,'2025-06-19','in_school','active',34,0,NULL),(93,'PROMISE',NULL,'ASIEDU FRIMPONG','2018-01-12','Male',3,428,'2025-06-19','in_school','active',34,0,NULL),(94,'WILMA',NULL,'ASIEDUWAA SARPONG ','2017-05-22','Female',1,428,'2025-06-19','in_school','active',34,0,NULL),(95,'JOSHUA','KWAME','ASUBONTENG ','2017-03-04','Male',3,428,'2025-06-19','in_school','active',34,0,NULL),(96,'PRINCESS','ESI','BAFFOE','2017-06-18','Female',1,428,'2025-06-19','in_school','active',34,0,NULL),(97,'CYRIL',NULL,'BERIMA AGYEI ASAFO','2017-08-23','Male',3,428,'2025-06-19','in_school','active',34,0,NULL),(98,'AKWASI',NULL,'BOAFO ADDAI','2017-10-08','Male',3,428,'2025-06-19','in_school','active',34,0,NULL),(99,'JAIDEN','MIRACLE ','BOATENG','2019-04-10','Male',1,428,'2025-06-19','in_school','active',34,0,NULL),(100,'JOSEPH',NULL,'BONOCTOR','2015-01-22','Male',3,428,'2025-06-19','in_school','active',34,0,NULL),(101,'KENDRICK',NULL,'BULU','2017-10-06','Male',1,428,'2025-06-19','in_school','active',34,0,NULL),(102,'NICOLE',NULL,'DERY','2018-01-20','Female',1,428,'2025-06-19','in_school','active',34,0,NULL),(103,'KELLEN',NULL,'ENTSIE','2017-09-19','Male',3,428,'2025-06-19','in_school','active',34,0,NULL),(104,'JADEN',NULL,'FOSU OPEMSAH','2017-05-12','Male',3,428,'2025-06-19','in_school','active',34,0,NULL),(105,'MEAGHAN',NULL,'FRIMPOMAA OWUSU-NTI','2018-06-09','Female',1,428,'2025-06-19','in_school','active',34,0,NULL),(106,'VIDA-MARY',NULL,'FRIMPONG','2017-07-14','Female',3,428,'2025-06-19','in_school','active',34,0,NULL),(107,'ESTHER',NULL,'GBEDE SEDINAM','2017-04-16','Female',3,428,'2025-06-19','in_school','active',34,0,NULL),(108,'ALEXANDER','YAW','GYAN ','2017-06-01','Male',3,428,'2025-06-19','in_school','active',34,0,NULL),(109,'JITO',NULL,'MARTIN','2017-04-04','Male',3,428,'2025-06-19','in_school','active',34,0,NULL),(110,'RAMZIA','','KATUMI ISSAH','2016-09-26','Female',3,428,'2025-06-19','in_school','active',34,0,NULL),(111,'KENDRICK JOSEPH',NULL,'KUMI ','2018-04-22','Male',3,428,'2025-06-19','in_school','active',34,0,NULL),(112,'BELINDA',NULL,'KUNTU BLANGSON','2017-03-16','Female',1,428,'2025-06-19','in_school','active',34,0,NULL),(113,'NHYIRA',NULL,'KYEREMAA FOKUO','2018-10-31','Female',3,428,'2025-06-19','in_school','active',34,0,NULL),(114,'ABDULAI','','MOHAMMED','2018-08-21','Male',2,428,'2025-06-19','in_school','active',34,0,NULL),(115,'FAREEDA',NULL,'MOHAMMED','2017-12-09','Female',1,428,'2025-06-19','in_school','active',34,0,NULL),(116,'NANA OHEMAA','LORETTA','BOATENG','2019-05-22','Female',1,428,'2025-06-19','in_school','active',34,0,NULL),(117,'HANIFA',NULL,'NASARA','2017-09-26','Male',2,428,'2025-06-19','in_school','active',34,0,NULL),(118,'NHYIRA GODSON ',NULL,'KWAKYE','2018-05-24','Male',1,428,'2025-06-19','in_school','active',34,0,NULL),(119,'PRECIOUS',NULL,'NKETIA','2017-09-02','Female',1,428,'2025-06-19','in_school','active',34,0,NULL),(120,'NANA YAA',NULL,'NKUNIM TUFFOUR','2018-05-03','Female',2,428,'2025-06-19','in_school','active',34,0,NULL),(122,'LOIS','','NUNTAR BODIO','2017-11-03','Female',2,428,'2025-06-19','in_school','active',34,0,NULL),(123,'OBAIDA',NULL,'MOHAMMED ZAINAB','2018-02-26','Female',2,401,'2025-06-19','in_school','active',30,0,NULL),(124,'JERRY',NULL,'OKONENGYE','2014-03-07','Male',3,428,'2025-06-19','in_school','active',34,0,NULL),(125,'CHARLES','EMMANUEL','OPOKU-ANTWI','2018-06-11','Male',2,428,'2025-06-19','in_school','active',34,0,NULL),(126,'ESTHER','','OSIE MENSAH','2018-12-14','Female',3,428,'2025-06-19','in_school','active',34,0,NULL),(127,'ESTHELLA',NULL,'OSEI MENSAH','2018-12-14','Female',3,428,'2025-06-19','in_school','active',34,0,NULL),(128,'JUSTICE',NULL,'OWUSU ARTHUR','2017-01-24','Male',3,428,'2025-06-19','in_school','active',34,0,NULL),(129,'SADICK','','MOHAMMED HALIFA','2018-12-10','Male',3,428,'2025-06-19','in_school','active',34,0,NULL),(130,'SALIFU RAMADAN',NULL,'SULEMANA','2016-06-06','Male',3,428,'2025-06-19','in_school','active',34,0,NULL),(131,'VANESA',NULL,'TIWAA ADJEI','2017-04-02','Female',3,428,'2025-06-19','in_school','active',34,0,NULL),(132,'RUFFAI ','ABDUL','WAHID','2018-09-04','Female',3,401,'2025-06-19','in_school','active',30,0,NULL),(133,'GIFTY',NULL,'YAMBA','2017-08-06','Female',2,428,'2025-06-19','in_school','active',34,0,NULL),(134,'JASON',NULL,'ADDO','2017-05-12','Male',3,428,'2025-06-19','in_school','active',34,0,NULL),(135,'GERRAD',NULL,'OSEI FOSU','2017-12-22','Male',3,428,'2025-06-19','in_school','active',34,0,NULL),(136,'NICOLE',NULL,'KAMASSA EDUDZI','2016-10-10','Male',1,428,'2025-06-19','in_school','active',34,0,NULL),(137,'Morrison','Adu','Gyimah','2019-01-19','Male',1,401,'2025-06-19','admitted','inactive',30,60,NULL),(138,'ABDUL RAHAMAN','','MAHAMA','2018-11-15','Male',2,427,'2025-06-19','in_school','active',34,0,NULL),(139,'SULEMANA ','FAHAD','ABINA','2019-01-11','Male',3,427,'2025-06-19','in_school','active',34,0,NULL),(140,'BAYAMBE','RAAKIN','ABUDU','2019-08-08','Male',3,427,'2025-06-19','in_school','active',34,0,NULL),(141,'ADAM',NULL,'ABUKARI','2017-02-21','Male',3,427,'2025-06-19','in_school','active',34,0,NULL),(142,'MAXIMILLIAN','KUMAH','ADDAE','2019-04-13','Female',3,427,'2025-06-19','in_school','active',34,0,NULL),(143,'PRINCE',NULL,'ADJEI','2017-05-03','Male',2,427,'2025-06-19','in_school','active',34,0,NULL),(144,'SIKAFO',NULL,'AFARI NANA YEBOAH','2018-10-16','Male',3,427,'2025-06-19','in_school','active',34,0,NULL),(152,'ANTHONY','UPAUL','ALINPO','2019-04-01','Male',3,427,'2025-06-19','in_school','active',34,0,NULL),(153,'GODSLOVE',NULL,'ABUGILLA MASEDA','2019-03-31','Female',3,427,'2025-06-19','in_school','active',34,0,NULL),(154,'GYAABA ','E.','AMANKONAH ','2019-05-08','Male',3,427,'2025-06-19','in_school','active',34,0,NULL);
/*!40000 ALTER TABLE `students` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `transactions`
--

DROP TABLE IF EXISTS `transactions`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `transactions` (
  `id` int NOT NULL AUTO_INCREMENT,
  `payment_request_id` int NOT NULL,
  `amount` decimal(10,2) NOT NULL,
  `method` enum('card','momo','bank','cash') NOT NULL,
  `transaction_ref` varchar(100) DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `payment_request_id` (`payment_request_id`),
  CONSTRAINT `transactions_ibfk_1` FOREIGN KEY (`payment_request_id`) REFERENCES `payment_requests` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `transactions`
--

LOCK TABLES `transactions` WRITE;
/*!40000 ALTER TABLE `transactions` DISABLE KEYS */;
/*!40000 ALTER TABLE `transactions` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `tuition_fees`
--

DROP TABLE IF EXISTS `tuition_fees`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `tuition_fees` (
  `id` int NOT NULL AUTO_INCREMENT,
  `category_id` int NOT NULL,
  `class_id` int DEFAULT NULL,
  `amount` decimal(10,2) NOT NULL,
  `academic_year` varchar(20) NOT NULL,
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `category_id` (`category_id`),
  KEY `class_id` (`class_id`),
  CONSTRAINT `tuition_fees_ibfk_1` FOREIGN KEY (`category_id`) REFERENCES `categories` (`id`),
  CONSTRAINT `tuition_fees_ibfk_2` FOREIGN KEY (`class_id`) REFERENCES `classes` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=5 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `tuition_fees`
--

LOCK TABLES `tuition_fees` WRITE;
/*!40000 ALTER TABLE `tuition_fees` DISABLE KEYS */;
/*!40000 ALTER TABLE `tuition_fees` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `user_module_access`
--

DROP TABLE IF EXISTS `user_module_access`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `user_module_access` (
  `id` int NOT NULL AUTO_INCREMENT,
  `user_id` int NOT NULL,
  `module_id` varchar(50) NOT NULL,
  `has_access` tinyint(1) DEFAULT '0',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_user_module` (`user_id`,`module_id`),
  KEY `module_id` (`module_id`),
  CONSTRAINT `user_module_access_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `user_module_access_ibfk_2` FOREIGN KEY (`module_id`) REFERENCES `modules` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `user_module_access`
--

LOCK TABLES `user_module_access` WRITE;
/*!40000 ALTER TABLE `user_module_access` DISABLE KEYS */;
/*!40000 ALTER TABLE `user_module_access` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `users`
--

DROP TABLE IF EXISTS `users`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `users` (
  `id` int NOT NULL AUTO_INCREMENT,
  `full_name` varchar(100) NOT NULL,
  `email` varchar(100) DEFAULT NULL,
  `username` varchar(50) DEFAULT NULL,
  `password` varchar(255) NOT NULL,
  `school_id` int DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `role_id` int DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `email` (`email`),
  UNIQUE KEY `username` (`username`),
  KEY `school_id` (`school_id`),
  KEY `fk_user_role` (`role_id`),
  CONSTRAINT `fk_user_role` FOREIGN KEY (`role_id`) REFERENCES `roles` (`id`),
  CONSTRAINT `fk_users_role` FOREIGN KEY (`role_id`) REFERENCES `roles` (`id`),
  CONSTRAINT `users_ibfk_1` FOREIGN KEY (`school_id`) REFERENCES `schools` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=21 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `users`
--

LOCK TABLES `users` WRITE;
/*!40000 ALTER TABLE `users` DISABLE KEYS */;
INSERT INTO `users` VALUES (3,'System Admin','admin@school.com','admin','$2b$10$Ha7edoNNYnTPf1O8tR2oXO/DPCzNniMWKEK2K6vkuVdXPBMGAb/Y.',NULL,'2025-05-20 12:44:19',1),(14,'GEORGE ANING ','george@gmail.com','admin@1','$2b$10$YW/DDDPJG3OnXxdeX.6LUOU9kyNoBmGGGjoom63msShDWicEMzTdG',NULL,'2025-06-15 12:19:50',1),(19,'Harry',NULL,'admin@2','$2b$10$MNi1PZ5YY/nO3PV6//Dj.OCDT7UxCOyb/7JDGU.PmsDJsrNUCCzSa',NULL,'2025-06-17 10:57:46',3),(20,'Mrs Mensah Ansah',NULL,'account001','$2b$10$VSA0lrCCDERPZnLEp2hlZO5i38.bSCqDFfOE.nVMuGQXCJ6OOERRm',NULL,'2025-06-19 19:18:23',4);
/*!40000 ALTER TABLE `users` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Dumping events for database 'school_db'
--

--
-- Dumping routines for database 'school_db'
--

--
-- Final view structure for view `payment_breakdown_by_method`
--

/*!50001 DROP VIEW IF EXISTS `payment_breakdown_by_method`*/;
/*!50001 SET @saved_cs_client          = @@character_set_client */;
/*!50001 SET @saved_cs_results         = @@character_set_results */;
/*!50001 SET @saved_col_connection     = @@collation_connection */;
/*!50001 SET character_set_client      = utf8mb4 */;
/*!50001 SET character_set_results     = utf8mb4 */;
/*!50001 SET collation_connection      = utf8mb4_0900_ai_ci */;
/*!50001 CREATE ALGORITHM=UNDEFINED */
/*!50013 DEFINER=`root`@`localhost` SQL SECURITY DEFINER */
/*!50001 VIEW `payment_breakdown_by_method` AS select `transactions`.`method` AS `method`,count(0) AS `total_transactions`,sum(`transactions`.`amount`) AS `total_amount` from `transactions` group by `transactions`.`method` */;
/*!50001 SET character_set_client      = @saved_cs_client */;
/*!50001 SET character_set_results     = @saved_cs_results */;
/*!50001 SET collation_connection      = @saved_col_connection */;

--
-- Final view structure for view `payment_request_status_summary`
--

/*!50001 DROP VIEW IF EXISTS `payment_request_status_summary`*/;
/*!50001 SET @saved_cs_client          = @@character_set_client */;
/*!50001 SET @saved_cs_results         = @@character_set_results */;
/*!50001 SET @saved_col_connection     = @@collation_connection */;
/*!50001 SET character_set_client      = utf8mb4 */;
/*!50001 SET character_set_results     = utf8mb4 */;
/*!50001 SET collation_connection      = utf8mb4_0900_ai_ci */;
/*!50001 CREATE ALGORITHM=UNDEFINED */
/*!50013 DEFINER=`root`@`localhost` SQL SECURITY DEFINER */
/*!50001 VIEW `payment_request_status_summary` AS select `payment_requests`.`status` AS `status`,count(0) AS `total_requests`,sum(`payment_requests`.`amount`) AS `total_amount` from `payment_requests` group by `payment_requests`.`status` */;
/*!50001 SET character_set_client      = @saved_cs_client */;
/*!50001 SET character_set_results     = @saved_cs_results */;
/*!50001 SET collation_connection      = @saved_col_connection */;
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;

-- Dump completed on 2025-06-20 10:04:20
