// backend/models/HR/Department.js
const mongoose = require("mongoose");

const departmentSchema = new mongoose.Schema(
  {
    deptId: {
      type: String,
      required: true,
      unique: true
    },
    name: {
      type: String,
      required: true,
      unique: true
    },
    description: {
      type: String,
      default: ""
    },
    isActive: {
      type: Boolean,
      default: true
    },
    createdBy: {
      type: String,
      default: "Admin"
    }
  },
  {
    timestamps: true
  }
);

// Pre-save hook to generate department ID
departmentSchema.pre("save", function(next) {
  if (!this.deptId) {
    // Generate department ID: DEPT_001, DEPT_002, etc.
    this.deptId = `DEPT_${String(this._id).slice(-3).toUpperCase()}`;
  }
  next();
});

module.exports = mongoose.model("Department", departmentSchema);