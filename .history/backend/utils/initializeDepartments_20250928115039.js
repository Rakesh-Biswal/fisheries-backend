// scripts/initializeDepartments.js
const mongoose = require("mongoose");
const Department = require("../models/HR/Department");

const departments = [
  { name: "TeleCaller", description: "Tele-calling department" },
  { name: "Accountant", description: "Accounting and finance department" },
  { name: "Sale Employee", description: "Sales department" },
  { name: "Team Leader", description: "Team leadership" },
  { name: "Project Manager", description: "Project management" },
  { name: "HR", description: "Human Resources" }
];

async function initializeDepartments() {
  try {
    for (const dept of departments) {
      const existing = await Department.findOne({ name: dept.name });
      if (!existing) {
        const newDept = new Department(dept);
        await newDept.save();
        console.log(`Created department: ${dept.name} with ID: ${newDept.deptId}`);
      }
    }
    console.log("Departments initialization completed");
  } catch (error) {
    console.error("Error initializing departments:", error);
  }
}

module.exports = initializeDepartments;

where i create file