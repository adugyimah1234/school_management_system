const axios = require('axios');
require('dotenv').config();

/**
 * Professional Backend Test Script
 * Verifies: Registration, Validation, and Standardized Responses
 */

const API_URL = `http://localhost:${process.env.SERVER_PORT || 5000}/api`;

async function testRegistration() {
  console.log('--- Starting Registration Test ---');

  // 1. First, we need to log in to get a token (because routes are protected)
  console.log('\nStep 1: Logging in as Admin...');
  let token;
  try {
    const loginRes = await axios.post(`${API_URL}/auth/login`, {
      username: 'admin',
      password: 'password123' // Use your actual admin password
    });
    token = loginRes.data.data.token;
    console.log('✅ Login Successful.');
  } catch (err) {
    console.error('❌ Login Failed. Ensure server is running and admin credentials are correct.');
    console.error('Error:', err.response?.data || err.message);
    return;
  }

  // 2. Get a valid Academic Year ID
  console.log('\nStep 2: Fetching Academic Year...');
  let academicYearId;
  try {
    const ayRes = await axios.get(`${API_URL}/academic-years`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    // The new standard uses .data.data
    academicYearId = ayRes.data.data[0]?.id;
    if (!academicYearId) throw new Error('No academic year found in DB');
    console.log(`✅ Using Academic Year ID: ${academicYearId}`);
  } catch (err) {
    console.error('❌ Failed to fetch Academic Year.');
    return;
  }

  // 3. Test VALID Registration
  console.log('\nStep 3: Creating a new registration...');
  const payload = {
    first_name: "John",
    last_name: "Doe",
    category: "CIV",
    date_of_birth: "2015-05-20",
    class_applying_for: "Primary 1",
    gender: "Male",
    address: "123 Professional St, Tech City",
    guardian_name: "Jane Doe",
    relationship: "Mother",
    guardian_phone_number: "0240000000",
    academic_year_id: academicYearId,
    previous_school: "Old Tech Academy"
  };

  try {
    const regRes = await axios.post(`${API_URL}/registrations/create`, payload, {
      headers: { Authorization: `Bearer ${token}` }
    });
    console.log('✅ Registration Created Successfully!');
    console.log('Response:', JSON.stringify(regRes.data, null, 2));
  } catch (err) {
    console.error('❌ Registration Failed.');
    console.error('Error Details:', JSON.stringify(err.response?.data, null, 2));
  }

  // 4. Test VALIDATION (Deliberately fail)
  console.log('\nStep 4: Testing Validation (Missing Last Name)...');
  try {
    await axios.post(`${API_URL}/registrations/create`, { ...payload, last_name: "" }, {
      headers: { Authorization: `Bearer ${token}` }
    });
  } catch (err) {
    if (err.response?.status === 422) {
      console.log('✅ Validation correctly caught the missing last name!');
      console.log('Server returned:', JSON.stringify(err.response.data.errors, null, 2));
    }
  }

  console.log('\n--- Test Complete ---');
}

testRegistration();
