-- MySQL dump 10.13  Distrib 8.0.42, for Win64 (x86_64)
--
-- Host: 127.0.0.1    Database: bms
-- ------------------------------------------------------
-- Server version	8.0.42

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
-- Table structure for table `admin_login`
--

DROP TABLE IF EXISTS `admin_login`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `admin_login` (
  `id` int NOT NULL,
  `username` varchar(45) NOT NULL,
  `password` varchar(255) NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `admin_login`
--

LOCK TABLES `admin_login` WRITE;
/*!40000 ALTER TABLE `admin_login` DISABLE KEYS */;
INSERT INTO `admin_login` VALUES (1,'admin','123');
/*!40000 ALTER TABLE `admin_login` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `attendance`
--

DROP TABLE IF EXISTS `attendance`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `attendance` (
  `id` int NOT NULL AUTO_INCREMENT,
  `fk_attendance_employee` int NOT NULL,
  `attendance_date` date NOT NULL,
  `check_in_time` timestamp NULL DEFAULT NULL,
  `check_out_time` timestamp NULL DEFAULT NULL,
  `status` varchar(45) DEFAULT 'present',
  `special_reason` varchar(255) DEFAULT NULL,
  `total_hours` decimal(4,2) DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`fk_attendance_employee`,`attendance_date`),
  UNIQUE KEY `unique_employee_date` (`fk_attendance_employee`,`attendance_date`),
  UNIQUE KEY `id_UNIQUE` (`id`),
  KEY `idx_employee_date` (`fk_attendance_employee`,`attendance_date`),
  CONSTRAINT `fk_attendance_employee` FOREIGN KEY (`fk_attendance_employee`) REFERENCES `employee` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=252 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `attendance`
--

LOCK TABLES `attendance` WRITE;
/*!40000 ALTER TABLE `attendance` DISABLE KEYS */;
INSERT INTO `attendance` VALUES (102,1,'2025-06-01','2025-06-01 03:25:00','2025-06-01 11:30:00','on time',NULL,NULL,'2025-06-19 20:43:16','2025-06-19 20:43:16'),(103,1,'2025-06-02','2025-06-02 03:30:00','2025-06-02 11:30:00','on time',NULL,NULL,'2025-06-19 20:43:16','2025-06-19 20:43:16'),(104,1,'2025-06-03','2025-06-03 03:20:00','2025-06-03 11:30:00','on time',NULL,NULL,'2025-06-19 20:43:16','2025-06-19 20:43:16'),(105,1,'2025-06-04','2025-06-04 03:35:00','2025-06-04 11:30:00','on time',NULL,NULL,'2025-06-19 20:43:16','2025-06-19 20:43:16'),(106,1,'2025-06-05','2025-06-05 03:30:00','2025-06-05 11:30:00','on time',NULL,NULL,'2025-06-19 20:43:16','2025-06-19 20:43:16'),(107,1,'2025-06-06','2025-06-06 03:25:00','2025-06-06 11:30:00','on time',NULL,NULL,'2025-06-19 20:43:16','2025-06-19 20:43:16'),(108,1,'2025-06-07','2025-06-07 03:30:00','2025-06-07 11:30:00','on time',NULL,NULL,'2025-06-19 20:43:16','2025-06-19 20:43:16'),(109,1,'2025-06-08','2025-06-08 03:20:00','2025-06-08 11:30:00','on time',NULL,NULL,'2025-06-19 20:43:16','2025-06-19 20:43:16'),(110,1,'2025-06-09','2025-06-09 03:35:00','2025-06-09 11:30:00','on time',NULL,NULL,'2025-06-19 20:43:16','2025-06-19 20:43:16'),(111,1,'2025-06-10','2025-06-10 03:30:00','2025-06-10 11:30:00','on time',NULL,NULL,'2025-06-19 20:43:16','2025-06-19 20:43:16'),(112,1,'2025-06-11','2025-06-11 03:25:00','2025-06-11 11:30:00','on time',NULL,NULL,'2025-06-19 20:43:16','2025-06-19 20:43:16'),(113,1,'2025-06-12','2025-06-12 03:30:00','2025-06-12 11:30:00','on time',NULL,NULL,'2025-06-19 20:43:16','2025-06-19 20:43:16'),(114,1,'2025-06-13','2025-06-13 03:20:00','2025-06-13 11:30:00','on time',NULL,NULL,'2025-06-19 20:43:16','2025-06-19 20:43:16'),(115,1,'2025-06-14','2025-06-14 03:35:00','2025-06-14 11:30:00','on time',NULL,NULL,'2025-06-19 20:43:16','2025-06-19 20:43:16'),(116,1,'2025-06-15','2025-06-15 03:30:00','2025-06-15 11:30:00','on time',NULL,NULL,'2025-06-19 20:43:16','2025-06-19 20:43:16'),(117,1,'2025-06-16','2025-06-16 03:25:00','2025-06-16 11:30:00','on time',NULL,NULL,'2025-06-19 20:43:16','2025-06-19 20:43:16'),(118,1,'2025-06-17','2025-06-17 03:30:00','2025-06-17 11:30:00','on time',NULL,NULL,'2025-06-19 20:43:16','2025-06-19 20:43:16'),(119,1,'2025-06-18','2025-06-18 03:20:00','2025-06-18 11:30:00','on time',NULL,NULL,'2025-06-19 20:43:16','2025-06-19 20:43:16'),(120,1,'2025-06-19','2025-06-19 03:35:00','2025-06-19 11:30:00','on time',NULL,NULL,'2025-06-19 20:43:16','2025-06-19 20:43:16'),(121,1,'2025-06-20','2025-06-20 03:30:00','2025-06-20 11:30:00','on time',NULL,NULL,'2025-06-19 20:43:16','2025-06-19 20:43:16'),(122,1,'2025-06-21','2025-06-21 03:45:00','2025-06-21 11:30:00','late',NULL,NULL,'2025-06-19 20:43:16','2025-06-19 20:43:16'),(123,1,'2025-06-22','2025-06-22 03:50:00','2025-06-22 11:30:00','late',NULL,NULL,'2025-06-19 20:43:16','2025-06-19 20:43:16'),(124,1,'2025-06-23','2025-06-23 04:00:00','2025-06-23 11:30:00','late',NULL,NULL,'2025-06-19 20:43:16','2025-06-19 20:43:16'),(125,1,'2025-06-24','2025-06-24 03:55:00','2025-06-24 11:30:00','late',NULL,NULL,'2025-06-19 20:43:16','2025-06-19 20:43:16'),(126,1,'2025-06-25','2025-06-25 04:10:00','2025-06-25 11:30:00','late',NULL,NULL,'2025-06-19 20:43:16','2025-06-19 20:43:16');
/*!40000 ALTER TABLE `attendance` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `batch`
--

DROP TABLE IF EXISTS `batch`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `batch` (
  `id` int NOT NULL AUTO_INCREMENT,
  `fk_batch_product` int NOT NULL,
  `batch_number` varchar(45) NOT NULL,
  `mfg_date` datetime NOT NULL,
  `exp_date` datetime NOT NULL,
  `init_qty` int NOT NULL,
  `qty` int NOT NULL,
  `cost` decimal(10,2) NOT NULL,
  `description` varchar(100) DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `product_id_idx` (`fk_batch_product`),
  CONSTRAINT `fk_batch_product` FOREIGN KEY (`fk_batch_product`) REFERENCES `product` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=34 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `batch`
--

LOCK TABLES `batch` WRITE;
/*!40000 ALTER TABLE `batch` DISABLE KEYS */;
INSERT INTO `batch` VALUES (31,10,'W-2025-0001','2025-06-09 00:00:00','2025-06-23 00:00:00',120,0,1000.00,NULL),(32,11,'PC-2025-0001','2025-06-17 00:00:00','2025-07-08 00:00:00',100,0,400.00,NULL),(33,10,'W-2025-0002','2025-06-18 00:00:00','2025-07-08 00:00:00',500,0,10000.00,NULL);
/*!40000 ALTER TABLE `batch` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `batch_order`
--

DROP TABLE IF EXISTS `batch_order`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `batch_order` (
  `fk_batch_order_batch` int NOT NULL,
  `fk_batch_order_order` int NOT NULL,
  `qty` int NOT NULL,
  `diff_qty` int DEFAULT NULL,
  `description` varchar(200) DEFAULT NULL,
  PRIMARY KEY (`fk_batch_order_batch`,`fk_batch_order_order`),
  KEY `batch_order_ibfk_2` (`fk_batch_order_order`),
  CONSTRAINT `batch_order_ibfk_1` FOREIGN KEY (`fk_batch_order_batch`) REFERENCES `batch` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `batch_order_ibfk_2` FOREIGN KEY (`fk_batch_order_order`) REFERENCES `orders` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `batch_order`
--

LOCK TABLES `batch_order` WRITE;
/*!40000 ALTER TABLE `batch_order` DISABLE KEYS */;
INSERT INTO `batch_order` VALUES (31,38,80,-20,'111'),(31,40,40,-110,'insufficient'),(32,39,100,0,NULL),(33,41,500,0,NULL);
/*!40000 ALTER TABLE `batch_order` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `client`
--

DROP TABLE IF EXISTS `client`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `client` (
  `id` int NOT NULL AUTO_INCREMENT,
  `name` varchar(255) NOT NULL,
  `contact_person` varchar(255) NOT NULL,
  `location` varchar(255) NOT NULL,
  `phone1` varchar(20) NOT NULL,
  `phone2` varchar(20) DEFAULT NULL,
  `email` varchar(255) NOT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=10 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `client`
--

LOCK TABLES `client` WRITE;
/*!40000 ALTER TABLE `client` DISABLE KEYS */;
INSERT INTO `client` VALUES (6,'Sumanasiri Stores','Sumanasiri','Karapitiya','0756859323','','ggayashan07@gmail.com','2025-05-19 04:30:31','2025-05-19 04:30:31'),(7,'Keels','John','Hirimbura','0701234567','','jidohix329@almaxen.com','2025-05-19 04:32:53','2025-05-19 04:32:53'),(8,'Sathosa','Gamage','Karapitiya','0911234567','','sathosa@mail.com','2025-06-06 11:33:51','2025-06-06 11:33:51'),(9,'Cargills','Kasun','Karapitiya','0911234567','','sales@cargills.com','2025-06-06 11:34:52','2025-06-06 11:34:52');
/*!40000 ALTER TABLE `client` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `distribution`
--

DROP TABLE IF EXISTS `distribution`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `distribution` (
  `id` int NOT NULL AUTO_INCREMENT,
  `date` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `departure_time` time DEFAULT NULL,
  `arrival_time` time DEFAULT NULL,
  `notes` varchar(255) DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=7 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `distribution`
--

LOCK TABLES `distribution` WRITE;
/*!40000 ALTER TABLE `distribution` DISABLE KEYS */;
INSERT INTO `distribution` VALUES (2,'2025-06-17 16:41:30','16:48:58','16:49:03',''),(4,'2025-06-17 17:01:17','17:31:51','17:31:58',''),(5,'2025-06-17 17:40:14','20:27:51','20:27:55',''),(6,'2025-06-17 22:23:51',NULL,NULL,'');
/*!40000 ALTER TABLE `distribution` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `distribution_employee`
--

DROP TABLE IF EXISTS `distribution_employee`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `distribution_employee` (
  `fk_distribution_employee_distribution` int NOT NULL,
  `fk_distribution_employee_employee` int NOT NULL,
  PRIMARY KEY (`fk_distribution_employee_distribution`,`fk_distribution_employee_employee`),
  KEY `fk_employee_id_idx` (`fk_distribution_employee_employee`),
  CONSTRAINT `fk_distribution_employee_distribution` FOREIGN KEY (`fk_distribution_employee_distribution`) REFERENCES `distribution` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_distribution_employee_employee` FOREIGN KEY (`fk_distribution_employee_employee`) REFERENCES `employee` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `distribution_employee`
--

LOCK TABLES `distribution_employee` WRITE;
/*!40000 ALTER TABLE `distribution_employee` DISABLE KEYS */;
/*!40000 ALTER TABLE `distribution_employee` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `distribution_order`
--

DROP TABLE IF EXISTS `distribution_order`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `distribution_order` (
  `fk_distribution_order_distribution` int NOT NULL,
  `fk_distribution_order_order` int NOT NULL,
  PRIMARY KEY (`fk_distribution_order_distribution`,`fk_distribution_order_order`),
  KEY `fk_order_id_idx` (`fk_distribution_order_order`),
  CONSTRAINT `fk_distribution_order_distribution` FOREIGN KEY (`fk_distribution_order_distribution`) REFERENCES `distribution` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_distribution_order_order` FOREIGN KEY (`fk_distribution_order_order`) REFERENCES `orders` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `distribution_order`
--

LOCK TABLES `distribution_order` WRITE;
/*!40000 ALTER TABLE `distribution_order` DISABLE KEYS */;
INSERT INTO `distribution_order` VALUES (2,38),(4,39),(5,40),(6,41);
/*!40000 ALTER TABLE `distribution_order` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `employee`
--

DROP TABLE IF EXISTS `employee`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `employee` (
  `id` int NOT NULL AUTO_INCREMENT,
  `name` varchar(200) NOT NULL,
  `type_id` int NOT NULL,
  `nic` varchar(45) DEFAULT NULL,
  `acc_no` varchar(100) DEFAULT NULL,
  `dob` date DEFAULT NULL,
  `email` varchar(45) NOT NULL,
  `password` varchar(200) NOT NULL,
  `phone1` varchar(45) NOT NULL,
  `phone2` varchar(45) DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `email_UNIQUE` (`email`),
  UNIQUE KEY `nic_UNIQUE` (`nic`),
  KEY `type_id_idx` (`type_id`),
  CONSTRAINT `type_id` FOREIGN KEY (`type_id`) REFERENCES `employee_type` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=5 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `employee`
--

LOCK TABLES `employee` WRITE;
/*!40000 ALTER TABLE `employee` DISABLE KEYS */;
INSERT INTO `employee` VALUES (1,'John Doe',1,'900000000V','123456','1990-01-01','john@example.com','password','0711111111',NULL),(2,'Jane Smith',2,'900000001V','654321','1992-02-02','jane@example.com','password','0722222222',NULL);
/*!40000 ALTER TABLE `employee` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `employee_type`
--

DROP TABLE IF EXISTS `employee_type`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `employee_type` (
  `id` int NOT NULL AUTO_INCREMENT,
  `name` varchar(45) NOT NULL,
  `basic_salary` decimal(10,2) NOT NULL,
  `description` varchar(100) DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=5 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `employee_type`
--

LOCK TABLES `employee_type` WRITE;
/*!40000 ALTER TABLE `employee_type` DISABLE KEYS */;
INSERT INTO `employee_type` VALUES (1,'Agent',25000.00,'Distribute and Marketing'),(2,'Driver',30000.00,'Transportation'),(3,'Agent',25000.00,'Distribute and Marketing'),(4,'Driver',30000.00,'Transportation');
/*!40000 ALTER TABLE `employee_type` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `orders`
--

DROP TABLE IF EXISTS `orders`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `orders` (
  `id` int NOT NULL AUTO_INCREMENT,
  `fk_order_client` int NOT NULL,
  `fk_order_product` int NOT NULL,
  `qty` int NOT NULL,
  `unit_price` decimal(10,2) NOT NULL,
  `total_price` decimal(10,2) DEFAULT NULL,
  `date` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `required_date` datetime NOT NULL,
  `status` varchar(45) NOT NULL DEFAULT 'pending',
  PRIMARY KEY (`id`),
  KEY `fk_order_client_idx` (`fk_order_client`),
  KEY `fk_order_product_idx` (`fk_order_product`),
  CONSTRAINT `fk_order_client` FOREIGN KEY (`fk_order_client`) REFERENCES `client` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_order_product` FOREIGN KEY (`fk_order_product`) REFERENCES `product` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=42 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `orders`
--

LOCK TABLES `orders` WRITE;
/*!40000 ALTER TABLE `orders` DISABLE KEYS */;
INSERT INTO `orders` VALUES (38,7,10,100,80.00,8000.00,'2025-06-09 12:00:00','2025-06-10 12:00:00','delivered'),(39,6,11,100,100.00,10000.00,'2025-06-09 12:00:00','2025-06-12 12:00:00','delivered'),(40,8,10,150,70.00,10500.00,'2025-06-09 12:00:00','2025-06-11 12:00:00','delivered'),(41,9,10,500,150.00,NULL,'2025-06-17 12:00:00','2025-06-18 12:00:00','assigned');
/*!40000 ALTER TABLE `orders` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `payroll`
--

DROP TABLE IF EXISTS `payroll`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `payroll` (
  `id` int NOT NULL AUTO_INCREMENT,
  `employee_id` int NOT NULL,
  `salary_month` varchar(7) NOT NULL,
  `base_salary` decimal(10,2) NOT NULL,
  `present_days` int NOT NULL,
  `late_days` int NOT NULL,
  `deduction_percent` decimal(5,2) DEFAULT '0.00',
  `overtime_hours` decimal(6,2) DEFAULT '0.00',
  `overtime_rate` decimal(10,2) DEFAULT '0.00',
  `overtime_pay` decimal(10,2) DEFAULT '0.00',
  `bonuses` decimal(10,2) DEFAULT '0.00',
  `deductions` decimal(10,2) DEFAULT '0.00',
  `total_salary` decimal(10,2) NOT NULL,
  `payment_date` date DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `employee_id` (`employee_id`),
  CONSTRAINT `payroll_ibfk_1` FOREIGN KEY (`employee_id`) REFERENCES `employee` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `payroll`
--

LOCK TABLES `payroll` WRITE;
/*!40000 ALTER TABLE `payroll` DISABLE KEYS */;
/*!40000 ALTER TABLE `payroll` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `product`
--

DROP TABLE IF EXISTS `product`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `product` (
  `id` int NOT NULL AUTO_INCREMENT,
  `name` varchar(45) NOT NULL,
  `fk_product_category` int NOT NULL,
  `price` decimal(10,2) DEFAULT '0.00',
  `description` varchar(45) DEFAULT 'N/A',
  PRIMARY KEY (`id`),
  KEY `name_idx` (`fk_product_category`),
  CONSTRAINT `categoryID` FOREIGN KEY (`fk_product_category`) REFERENCES `product_category` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=12 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `product`
--

LOCK TABLES `product` WRITE;
/*!40000 ALTER TABLE `product` DISABLE KEYS */;
INSERT INTO `product` VALUES (10,'Watalappan',1,150.00,''),(11,'Potato Chips',2,200.00,'');
/*!40000 ALTER TABLE `product` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `product_category`
--

DROP TABLE IF EXISTS `product_category`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `product_category` (
  `id` int NOT NULL AUTO_INCREMENT,
  `name` varchar(45) NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `product_category`
--

LOCK TABLES `product_category` WRITE;
/*!40000 ALTER TABLE `product_category` DISABLE KEYS */;
INSERT INTO `product_category` VALUES (1,'Dessert'),(2,'Savory');
/*!40000 ALTER TABLE `product_category` ENABLE KEYS */;
UNLOCK TABLES;
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;

-- Dump completed on 2025-06-20  2:36:17
