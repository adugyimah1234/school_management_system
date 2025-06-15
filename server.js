const express = require('express');
const app = express();
require('dotenv').config();
const cors = require('cors');
const cookieParser = require('cookie-parser'); // ✅ Added
const db = require('./config/db');
const path = require('path');

// Handle uncaught exceptions
process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception:', err);
  process.exit(1);
});

app.use((req, res, next) => {
  console.log('🧾 Origin:', req.headers.origin);
  res.setHeader('X-Debug-Origin', req.headers.origin || 'none');
  next();
});

// ✅ CORS Configuration (dynamic origin + credentials)
const corsOptions = {
  origin: function (origin, callback) {
    const allowedOrigins = [
      'http://localhost:3000',
      'https://3-gec.com',
    ];
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
};


app.use(cors(corsOptions));
app.use(express.json());
app.use(cookieParser()); // ✅ Enables reading cookies

// Static files
app.use('/uploads/logos', express.static(path.join(__dirname, 'uploads/logos')));
app.use(express.static(path.join(__dirname, 'public')));

// ✅ Import routes
const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/users');
const studentRoutes = require('./routes/students');
const parentRoutes = require('./routes/parents');
const classRoutes = require('./routes/classes');
const admissionRoutes = require('./routes/admissions');
const registrationRoutes = require('./routes/registrations');
const feeRoutes = require('./routes/fees');
const dashboardRoutes = require('./routes/dashboardRoutes');
const examRoutes = require('./routes/examRoutes');
const receiptRoutes = require('./routes/receipts');
const branchRoutes = require('./routes/branches');
const reportRouter = require('./routes/financialReportRoutes');
const schoolsRouter = require('./routes/schools');
const categoriesRouter = require('./routes/categories');
const academicYearsRouter = require('./routes/academicYears');
const roleRoutes = require('./routes/role.routes');
const moduleRoutes = require('./routes/module');
const tuitionRoutes = require('./routes/tuitionRoutes');
// ✅ Use routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/students', studentRoutes);
app.use('/api/roles', roleRoutes);
app.use('/api/parents', parentRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/classes', classRoutes);
app.use('/api/admissions', admissionRoutes);
app.use('/api/registrations', registrationRoutes);
app.use('/api/academic-years', academicYearsRouter);
app.use('/api/fees', feeRoutes);
app.use('/api/exams', examRoutes);
app.use('/api/receipts', receiptRoutes);
app.use('/api/reports', reportRouter);
app.use('/api/branches', branchRoutes);
app.use('/api/schools', schoolsRouter);
app.use('/api/categories', categoriesRouter);
app.use('/api/modules', moduleRoutes);
app.use('/api/tuition', tuitionRoutes);

// ✅ Global error handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    error: 'Something went wrong!',
    message: process.env.NODE_ENV === 'development' ? err.message : undefined,
  });
});

// ✅ Start server
const PORT = process.env.SERVER_PORT || 3000;
const server = app.listen(PORT, () =>
  console.log(`🚀 Server running on port ${PORT}`)
);

// ✅ Handle unhandled promise rejections
process.on('unhandledRejection', (err) => {
  console.error('Unhandled Rejection:', err);
  server.close(() => process.exit(1));
});

app.use((req, res, next) => {
  console.log('>>> Incoming Origin:', req.headers.origin);
  next();
});


// ✅ Graceful shutdown
['SIGTERM', 'SIGINT'].forEach((signal) => {
  process.on(signal, () => {
    console.log(`${signal} received. Shutting down gracefully...`);
    server.close(() => {
      console.log('Process terminated');
      db.end(() => process.exit(0));
    });
  });
});
