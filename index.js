const express = require('express');
const app = express();
require('dotenv').config();
const studentRoutes = require('./routes/students');
const parentRoutes = require('./routes/parents');

app.use(express.json());
app.use('/api/students', studentRoutes);
app.use('/api/parents', parentRoutes);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
