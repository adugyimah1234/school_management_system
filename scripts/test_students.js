const axios = require('axios');
require('dotenv').config();

/**
 * Student Module Test Script
 * Verifies: CRUD operations, Service Layer, and Standardized Responses
 */

const API_URL = `http://localhost:${process.env.SERVER_PORT || 5000}/api`;

async function testStudentModule() {
  console.log('--- Starting Student Module Test ---');

  // 1. Login
  console.log('\nStep 1: Logging in as Admin...');
  let token;
  let user;
  try {
    const loginRes = await axios.post(`${API_URL}/auth/login`, {
      username: 'admin',
      password: 'password123'
    });
    token = loginRes.data.data.token;
    user = loginRes.data.data.user;
    console.log(`✅ Login Successful. User: ${user.full_name}`);
  } catch (err) {
    console.error('❌ Login Failed.');
    return;
  }

  // 2. Fetch dependencies (IDs for creation)
  console.log('\nStep 2: Fetching required IDs (School, Class, Category)...');
  let schoolId, classId, categoryId, academicYearId;
  try {
    const [schools, classes, categories, academicYears] = await Promise.all([
      axios.get(`${API_URL}/schools`, { headers: { Authorization: `Bearer ${token}` } }),
      axios.get(`${API_URL}/classes`, { headers: { Authorization: `Bearer ${token}` } }),
      axios.get(`${API_URL}/categories`, { headers: { Authorization: `Bearer ${token}` } }),
      axios.get(`${API_URL}/academic-years`, { headers: { Authorization: `Bearer ${token}` } })
    ]);

    schoolId = schools.data.data[0]?.id;
    classId = classes.data.data[0]?.id;
    categoryId = categories.data.data[0]?.id;
    academicYearId = academicYears.data.data[0]?.id;

    if (!schoolId || !classId || !categoryId || !academicYearId) {
      console.warn('⚠️ Missing some dependency data. Creation might fail if not all optional.');
    }
    console.log(`✅ IDs ready: School(${schoolId}), Class(${classId}), Category(${categoryId})`);
  } catch (err) {
    console.error('❌ Dependency fetch failed.');
  }

  // 3. Create Student
  console.log('\nStep 3: Creating a new student...');
  let studentId;
  try {
    const studentPayload = {
      first_name: "Test",
      last_name: "Student",
      dob: "2010-01-01",
      gender: "Male",
      school_id: schoolId,
      garrison_id: user.garrison_id,
      class_id: classId,
      category_id: categoryId,
      academic_year_id: academicYearId,
      admission_status: "registered"
    };

    const createRes = await axios.post(`${API_URL}/students`, studentPayload, {
      headers: { Authorization: `Bearer ${token}` }
    });
    studentId = createRes.data.data.id;
    console.log(`✅ Student Created with UUID: ${studentId}`);
  } catch (err) {
    console.error('❌ Student Creation Failed.');
    console.error('Error:', err.response?.data || err.message);
    return;
  }

  // 4. Update Student
  console.log('\nStep 4: Updating student name...');
  try {
    const updateRes = await axios.put(`${API_URL}/students/${studentId}`, {
      first_name: "Updated_Test",
      last_name: "Student_Pro"
    }, {
      headers: { Authorization: `Bearer ${token}` }
    });
    console.log('✅ Student Updated successfully.');
  } catch (err) {
    console.error('❌ Student Update Failed.');
  }

  // 5. Fetch Single Student
  console.log('\nStep 5: Fetching student details...');
  try {
    const getRes = await axios.get(`${API_URL}/students/${studentId}`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    console.log('✅ Student Data:', JSON.stringify(getRes.data.data, null, 2));
  } catch (err) {
    console.error('❌ Fetch failed.');
  }

  // 6. Delete Student (Clean up)
  console.log('\nStep 6: Deleting test student...');
  try {
    await axios.delete(`${API_URL}/students/${studentId}`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    console.log('✅ Student Deleted. Database is clean.');
  } catch (err) {
    console.error('❌ Delete failed.');
  }

  console.log('\n--- Student Module Test Complete ---');
}

testStudentModule();
