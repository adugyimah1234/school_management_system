const { DataTypes } = require('sequelize');
const sequelize = require('../config/db'); // Adjust path as needed

const Invoice = sequelize.define('Invoice', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  invoice_number: {
    type: DataTypes.STRING(50),
    allowNull: false,
    unique: true
  },
  student_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'students', // Adjust table name as needed
      key: 'id'
    }
  },
  issue_date: {
    type: DataTypes.DATEONLY,
    allowNull: false
  },
  due_date: {
    type: DataTypes.DATEONLY,
    allowNull: false
  },
  total_amount: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    defaultValue: 0.00
  },
  amount_paid: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    defaultValue: 0.00
  },
  balance: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    defaultValue: 0.00
  },
  status: {
    type: DataTypes.ENUM('draft', 'sent', 'paid', 'overdue', 'cancelled', 'partially_paid'),
    allowNull: false,
    defaultValue: 'draft'
  },
  notes: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  school_id: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: {
      model: 'schools', // Adjust table name as needed
      key: 'id'
    }
  },
  class_id: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: {
      model: 'classes', // Adjust table name as needed
      key: 'id'
    }
  },
  created_by: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: {
      model: 'users', // Adjust table name as needed
      key: 'id'
    }
  },
  created_at: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW
  },
  updated_at: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW
  }
}, {
  tableName: 'invoices',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  hooks: {
    beforeSave: async (invoice) => {
      // Calculate balance
      invoice.balance = parseFloat(invoice.total_amount) - parseFloat(invoice.amount_paid);
      
      // Update status based on payment
      if (invoice.balance <= 0) {
        invoice.status = 'paid';
      } else if (invoice.amount_paid > 0) {
        invoice.status = 'partially_paid';
      } else if (new Date() > new Date(invoice.due_date) && invoice.status !== 'cancelled') {
        invoice.status = 'overdue';
      }
    },
    beforeCreate: async (invoice) => {
      // Generate invoice number if not provided
      if (!invoice.invoice_number) {
        const year = new Date().getFullYear();
        const count = await Invoice.count({
          where: sequelize.where(
            sequelize.fn('YEAR', sequelize.col('created_at')), 
            year
          )
        });
        invoice.invoice_number = `INV-${year}-${String(count + 1).padStart(4, '0')}`;
      }
    }
  }
});

// Invoice Items Model
const InvoiceItem = sequelize.define('InvoiceItem', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  invoice_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'invoices',
      key: 'id'
    }
  },
  fee_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'fees', // Adjust table name as needed
      key: 'id'
    }
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: false
  },
  amount: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false
  },
  quantity: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 1
  },
  total: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false
  }
}, {
  tableName: 'invoice_items',
  timestamps: false,
  hooks: {
    beforeSave: async (item) => {
      // Calculate total
      item.total = parseFloat(item.amount) * parseInt(item.quantity);
    }
  }
});

// Payment History Model
const PaymentHistory = sequelize.define('PaymentHistory', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  invoice_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'invoices',
      key: 'id'
    }
  },
  amount: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false
  },
  date: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW
  },
  method: {
    type: DataTypes.STRING(50),
    allowNull: true
  },
  receipt_id: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: {
      model: 'receipts', // Adjust table name as needed
      key: 'id'
    }
  },
  notes: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  created_at: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW
  }
}, {
  tableName: 'payment_history',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: false
});

// Define associations
Invoice.hasMany(InvoiceItem, { 
  foreignKey: 'invoice_id', 
  as: 'items',
  onDelete: 'CASCADE'
});

Invoice.hasMany(PaymentHistory, { 
  foreignKey: 'invoice_id', 
  as: 'payment_history',
  onDelete: 'CASCADE'
});

InvoiceItem.belongsTo(Invoice, { 
  foreignKey: 'invoice_id',
  as: 'invoice'
});

PaymentHistory.belongsTo(Invoice, { 
  foreignKey: 'invoice_id',
  as: 'invoice'
});

// You'll need to define these associations in your respective models as well
// Invoice.belongsTo(Student, { foreignKey: 'student_id', as: 'student' });
// Invoice.belongsTo(School, { foreignKey: 'school_id', as: 'school' });
// Invoice.belongsTo(Class, { foreignKey: 'class_id', as: 'class' });
// Invoice.belongsTo(User, { foreignKey: 'created_by', as: 'creator' });
// InvoiceItem.belongsTo(Fee, { foreignKey: 'fee_id', as: 'fee' });

module.exports = { Invoice, InvoiceItem, PaymentHistory };