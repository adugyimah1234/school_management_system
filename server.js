const express = require('express');
const app = express();
require('dotenv').config();
const cors = require('cors');
const db = require('./config/db');
const path = require('path');

// Error handling for uncaught exceptions
process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception:', err);
  process.exit(1);
});

// Apply middleware first - before route handlers
const corsOptions = {
  origin: 'http://localhost:3000', // Specify the exact origin of your frontend
  credentials: true,                // Enable sending cookies and authorization headers
};
app.use(cors(corsOptions));
app.use(express.json());

// Route imports
const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/users');
const studentRoutes = require('./routes/students');
const parentRoutes = require('./routes/parents');
const classRoutes = require('./routes/classes');
const admissionRoutes = require('./routes/admissions');
const registrationRoutes = require('./routes/registrations');
const feeRoutes = require('./routes/fees');
const examRoutes = require('./routes/examRoutes');
const receiptRoutes = require('./routes/receipts');
const branchRoutes = require('./routes/branches');
const schoolsRouter = require('./routes/schools');
const categoriesRouter = require('./routes/categories');
const academicYearsRouter = require('./routes/academicYears');
const roleRoutes = require('./routes/role.routes');
const moduleRoutes = require('./routes/module'); // Import without .js extension
const tuitionRoutes = require('./routes/tuitionRoutes');
app.use('/uploads/logos', express.static(path.join(__dirname, 'uploads/logos')));

// API routes - Mount routes incrementally to identify the problematic one
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
// Adding routes one by one to identify the issue
app.use('/api/students', studentRoutes);
app.use('/api/roles', roleRoutes);
app.use('/api/parents', parentRoutes);
app.use('/api/classes', classRoutes);
app.use('/api/admissions', admissionRoutes);
app.use('/api/registrations', registrationRoutes);
app.use('/api/academic-years', academicYearsRouter);
app.use('/api/fees', feeRoutes);
app.use('/api/exams', examRoutes);
app.use('/api/receipts', receiptRoutes);
app.use('/api/branches', branchRoutes);
app.use('/api/schools', schoolsRouter);
app.use('/api/categories', categoriesRouter);
app.use('/api/modules', moduleRoutes);
app.use(express.static(path.join(__dirname, 'public')));
app.use('/api/tuition', tuitionRoutes);
// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    error: 'Something went wrong!',
    message: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

// Server
const PORT = process.env.SERVER_PORT || 3000;
const server = app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));

// Error handling for unhandled promise rejections
process.on('unhandledRejection', (err) => {
  console.error('Unhandled Rejection:', err);
  // Graceful shutdown
  server.close(() => process.exit(1));
});

// Handle server shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received. Shutting down gracefully...');
  server.close(() => {
    console.log('Process terminated');
    db.end(() => process.exit(0));
  });
});

// Handle system signals for graceful shutdown
process.on('SIGINT', () => {
  console.log('SIGINT received. Shutting down gracefully...');
  server.close(() => {
    console.log('Process terminated');
    db.end(() => process.exit(0));
  });
});
