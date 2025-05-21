const express = require('express');
const app = express();
require('dotenv').config();
const cors = require('cors');

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
const receiptRoutes = require('./routes/receipts');
const branchRoutes = require('./routes/branches');
const schoolsRouter = require('./routes/schools');
const categoriesRouter = require('./routes/categories');
const roleRoutes = require('./routes/role.routes');
const moduleRoutes = require('./routes/module'); // Import without .js extension


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
app.use('/api/fees', feeRoutes);
app.use('/api/receipts', receiptRoutes);
app.use('/api/branches', branchRoutes);
app.use('/api/schools', schoolsRouter);
app.use('/api/categories', categoriesRouter);
app.use('/api/modules', moduleRoutes);

// Server
const PORT = process.env.SERVER_PORT || 3000;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));