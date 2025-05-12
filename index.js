const express = require('express');
const app = express();
require('dotenv').config();
const cors = require('cors'); // If you need CORS

app.use(cors()); // Use CORS if needed
app.use(express.json()); //  Use express.json() *once*

// Route imports -  Import ALL your route files
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

// API routes - Mount ALL your routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/students', studentRoutes);
app.use('/api/parents', parentRoutes);
app.use('/api/classes', classRoutes);
app.use('/api/admissions', admissionRoutes);
app.use('/api/registrations', registrationRoutes);
app.use('/api/fees', feeRoutes);
app.use('/api/receipts', receiptRoutes);
app.use('/api/branches', branchRoutes);

// Server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));