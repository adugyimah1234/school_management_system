const axios = require('axios');
require('dotenv').config();

/**
 * Financial Module Test Script
 * Verifies: Fee Structures, Payments, and Balance Calculations
 */

const API_URL = `http://localhost:${process.env.SERVER_PORT || 5000}/api`;

async function testFinancialModule() {
  console.log('--- Starting Financial Module Test ---');

  // 1. Login
  console.log('\nStep 1: Logging in as Admin...');
  let token;
  try {
    const loginRes = await axios.post(`${API_URL}/auth/login`, {
      username: 'admin',
      password: 'password123'
    });
    token = loginRes.data.data.token;
    console.log('✅ Login Successful.');
  } catch (err) {
    console.error('❌ Login Failed.');
    return;
  }

  // 2. Fetch dependencies
  console.log('\nStep 2: Fetching IDs for Fee Creation...');
  let classId, categoryId, academicYearId, studentId;
  try {
    const [classes, categories, academicYears] = await Promise.all([
      axios.get(`${API_URL}/classes`, { headers: { Authorization: `Bearer ${token}` } }),
      axios.get(`${API_URL}/categories`, { headers: { Authorization: `Bearer ${token}` } }),
      axios.get(`${API_URL}/academic-years`, { headers: { Authorization: `Bearer ${token}` } })
    ]);

    classId = classes.data.data[0]?.id;
    categoryId = categories.data.data[0]?.id;
    academicYearId = academicYears.data.data[0]?.id;

    if (!classId || !categoryId || !academicYearId) {
        throw new Error('Database must have at least one class, category, and academic year.');
    }
  } catch (err) {
    console.error('❌ Dependency fetch failed:', err.message);
    return;
  }

  // 3. Create a Fee Structure
  console.log('\nStep 3: Creating a Tuition Fee structure...');
  let feeId;
  try {
    const feePayload = {
      category_id: categoryId,
      class_id: classId,
      fee_type: "tuition",
      amount: 1500.00,
      description: "Test Semester Tuition",
      academic_year_id: academicYearId
    };

    const feeRes = await axios.post(`${API_URL}/fees`, feePayload, {
      headers: { Authorization: `Bearer ${token}` }
    });
    feeId = feeRes.data.data.id;
    console.log(`✅ Fee Structure created: ${feeId} (GHS 1500.00)`);
  } catch (err) {
    if (err.response?.data?.message?.includes('already exists')) {
        console.log('ℹ️ Fee structure already exists, moving to next step...');
        // We'll just grab the existing one
        const allFees = await axios.get(`${API_URL}/fees`, { headers: { Authorization: `Bearer ${token}` } });
        feeId = allFees.data.data.find(f => f.fee_type === 'tuition')?.id;
    } else {
        console.error('❌ Fee Creation Failed:', err.response?.data || err.message);
        return;
    }
  }

  // 4. Create a Temporary Student (to pay for)
  console.log('\nStep 4: Creating a test student for payment...');
  try {
    const stRes = await axios.post(`${API_URL}/students`, {
      first_name: "Financial",
      last_name: "Tester",
      dob: "2012-12-12",
      gender: "Female",
      class_id: classId,
      category_id: categoryId,
      academic_year_id: academicYearId,
      admission_status: "registered"
    }, { headers: { Authorization: `Bearer ${token}` } });
    studentId = stRes.data.data.id;
    console.log(`✅ Student Created: ${studentId}`);
  } catch (err) {
    console.error('❌ Student Creation Failed.');
    return;
  }

  // 5. Record a Partial Payment
  console.log('\nStep 5: Recording a partial payment (GHS 500)...');
  try {
    const payRes = await axios.post(`${API_URL}/fees/payments`, {
      student_id: studentId,
      fee_id: feeId,
      amount_paid: 500.00,
      payment_method: "cash"
    }, { headers: { Authorization: `Bearer ${token}` } });

    console.log('✅ Payment recorded.');
    console.log(`📊 Remaining Balance: ${payRes.data.data.remaining_balance}`);
  } catch (err) {
    console.error('❌ Payment recording failed:', err.response?.data || err.message);
  }

  // 6. Check Payment History
  console.log('\nStep 6: Verifying student payment history...');
  try {
    const historyRes = await axios.get(`${API_URL}/fees/payments/student/${studentId}`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    console.log('✅ History fetched successfully.');
    console.log(`Student has ${historyRes.data.data.length} payment records.`);
  } catch (err) {
    console.error('❌ History fetch failed.');
  }

  // 7. Cleanup
  console.log('\nStep 7: Cleaning up test data...');
  try {
    await axios.delete(`${API_URL}/students/${studentId}`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    console.log('✅ Test Student Deleted.');
  } catch (err) {
    console.error('⚠️ Cleanup partially failed.');
  }

  console.log('\n--- Financial Module Test Complete ---');
}

testFinancialModule();
