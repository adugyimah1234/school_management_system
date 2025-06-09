// tuition-config.js
module.exports = {
  TUITION_FEE_ID: 1, // static ID from your "fees" table

  TuitionByCategory: {
    1: { amount: 200, label: 'SVC' },
    2: { amount: 300, label: 'MOD' },
    3: { amount: 400, label: 'CIV' }
  }
};
