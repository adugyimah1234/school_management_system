const express = require('express');
const app = express();
require('dotenv').config();

// ✅ Validate Environment Variables First
require('./config/env')();

const cors = require('cors');
const morgan = require('morgan');
const logger = require('./utils/logger');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const hpp = require('hpp');
const xss = require('xss-clean');

// ✅ Professional Proxy Trust (Essential for Cloudflare)
app.set('trust proxy', 1);

// ✅ Security Middleware
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" },
  contentSecurityPolicy: false,
}));
app.use(xss());    // Prevent XSS attacks
app.use(hpp());    // Prevent HTTP Parameter Pollution

// ✅ Rate Limiting (Prevents Brute Force/DoS)
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per window
  message: { success: false, message: 'Too many requests from this IP, please try again later.' },
});
app.use('/api/', limiter);

const cookieParser = require('cookie-parser');
 // ✅ Added
const db = require('./config/db');
const path = require('path');

// Handle uncaught exceptions
process.on('uncaughtException', (err) => {
  logger.error('Uncaught Exception: ' + err.message);
  logger.error(err.stack);
  process.exit(1);
});

// ✅ Morgan HTTP Logging
const morganMiddleware = morgan(
  ':method :url :status :res[content-length] - :response-time ms',
  {
    stream: {
      write: (message) => logger.http(message.trim()),
    },
  }
);

app.use(morganMiddleware);

app.use((req, res, next) => {
  logger.debug('🧾 Origin: ' + req.headers.origin);
  res.setHeader('X-Debug-Origin', req.headers.origin || 'none');
  next();
});

// ✅ CORS Configuration (dynamic origin + credentials)
const corsOptions = {
  origin: function (origin, callback) {
    const allowedOrigins = [
      'http://localhost:3000',
      'http://localhost:3001',
      'https://3-gec.com'
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
const assessmentRoutes = require('./routes/assessmentRoutes');
const receiptRoutes = require('./routes/receipts');
const branchRoutes = require('./routes/branches');
const reportRouter = require('./routes/financialReportRoutes');
const schoolsRouter = require('./routes/schools');
const categoriesRouter = require('./routes/categories');
const academicYearsRouter = require('./routes/academicYears');
const roleRoutes = require('./routes/role.routes');
const moduleRoutes = require('./routes/module');
const receiptItemRoutes = require('./routes/receiptItemRoutes');
const tuitionRoutes = require('./routes/tuitionRoutes');
const settingRoutes = require('./routes/settings');
const superAdminRoutes = require('./routes/superAdminRoutes');
const gradebookRoutes = require('./routes/gradebook');
const disciplineRoutes = require('./routes/discipline');
const inventoryRoutes = require('./routes/inventory');
const dutyRoutes = require('./routes/duty');
const expenseRoutes = require('./routes/expenses');
const exeatRoutes = require('./routes/exeat');
const remarksRoutes = require('./routes/remarks');
const momoRoutes = require('./routes/momo');
const payrollRoutes = require('./routes/payroll');
const performanceRoutes = require('./routes/performance');
const garrisonDirectorRoutes = require('./routes/garrisonDirectorRoutes');
const notificationRoutes = require('./routes/notificationRoutes');
const { swaggerUi, specs } = require('./config/swagger');

// ✅ Use routes
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(specs));
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/students', studentRoutes);
app.use('/api/roles', roleRoutes);
app.use('/api/parents', parentRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/classes', classRoutes);
app.use('/api/receipt-items', receiptItemRoutes);
app.use('/api/admissions', admissionRoutes);
app.use('/api/registrations', registrationRoutes);
app.use('/api/academic-years', academicYearsRouter);
app.use('/api/fees', feeRoutes);
app.use('/api/assessments', assessmentRoutes);
app.use('/api/receipts', receiptRoutes);
app.use('/api/reports', reportRouter);
app.use('/api/branches', branchRoutes);
app.use('/api/schools', schoolsRouter);
app.use('/api/categories', categoriesRouter);
app.use('/api/modules', moduleRoutes);
app.use('/api/tuition', tuitionRoutes);
app.use('/api/settings', settingRoutes);
app.use('/api/super-admin', superAdminRoutes);
app.use('/api/gradebook', gradebookRoutes);
app.use('/api/discipline', disciplineRoutes);
app.use('/api/inventory', inventoryRoutes);
app.use('/api/duty-roster', dutyRoutes);
app.use('/api/expenses', expenseRoutes);
app.use('/api/exeats', exeatRoutes);
app.use('/api/remarks', remarksRoutes);
app.use('/api/momo', momoRoutes);
app.use('/api/payroll', payrollRoutes);
app.use('/api/performance', performanceRoutes);
app.use('/api/garrison-director', garrisonDirectorRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/fees/presets', require('./routes/presets'));
app.use('/api/public', require('./routes/public'));
app.use('/api/documents', require('./routes/documents'));

// ✅ Global error handler
app.use((err, req, res, next) => {
  // Log the full error internally for developers using Winston
  logger.error(`${req.method} ${req.url} - ${err.message}`);
  logger.error(err.stack);

  // Determine status code (default to 500)
  const statusCode = res.statusCode === 200 ? 500 : res.statusCode;

  // Send a clean, non-leaking message to the user
  res.status(statusCode).json({
    success: false,
    message: process.env.NODE_ENV === 'production'
      ? 'An internal server error occurred. Please contact support.'
      : err.message,
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined,
  });
});

// ✅ Start server
const PORT = process.env.SERVER_PORT || 5001;
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
