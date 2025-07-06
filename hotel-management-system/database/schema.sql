
id INT AUTO_INCREMENT PRIMARY KEY,
name VARCHAR(100),
email VARCHAR(100),
phone VARCHAR(20),
booking_type ENUM('room', 'event'),
item_id INT,
guests INT,
check_in DATE,
check_out DATE,
event_date DATE,
notes TEXT,
created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
