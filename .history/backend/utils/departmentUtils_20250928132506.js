// backend/utils/departmentUtils.js

const DEPARTMENT_CODES = {
  "HR": "HR",
  "Development": "DEV",
  "Design": "DES",
  "Marketing": "MKT",
  "Sales": "SAL",
  "Support": "SUP",
  "Management": "MGMT",
  "Accountant": "AC",
  "Project Manager": "PM",
  "Team Leader": "TL",
  "Telecaller": "TC",
  "Sales Employee": "SE"
};

const COMPANY_SUFFIX = "@fisheries123";

/**
 * Generate department ID for a given department name
 * @param {string} departmentName 
 * @returns {string} department ID
 */
const generateDepartmentId = (departmentName) => {
  const code = DEPARTMENT_CODES[departmentName];
  if (!code) {
    throw new Error(`Invalid department name: ${departmentName}`);
  }
  return `${code}${COMPANY_SUFFIX}`;
};

/**
 * Generate department objects with IDs for multiple departments
 * @param {string[]} departmentNames 
 * @returns {Array<{name: string, id: string}>}
 */
const generateDepartmentObjects = (departmentNames) => {
  return departmentNames.map(name => ({
    name: name,
    id: generateDepartmentId(name)
  }));
};

/**
 * Get all available departments with their IDs
 * @returns {Array<{name: string, id: string, code: string, label: string, icon: string, color: string}>}
 */
const getAllDepartments = () => {
  const departments = [
    { name: "HR", label: "HR Department", icon: "👥", color: "bg-pink-100 text-pink-800" },
    { name: "Development", label: "Development Team", icon: "💻", color: "bg-blue-100 text-blue-800" },
    { name: "Design", label: "Design Team", icon: "🎨", color: "bg-purple-100 text-purple-800" },
    { name: "Marketing", label: "Marketing", icon: "📢", color: "bg-green-100 text-green-800" },
    { name: "Sales", label: "Sales", icon: "💰", color: "bg-yellow-100 text-yellow-800" },
    { name: "Support", label: "Customer Support", icon: "🔧", color: "bg-indigo-100 text-indigo-800" },
    { name: "Management", label: "Management", icon: "👔", color: "bg-gray-100 text-gray-800" },
    { name: "Accountant", label: "Accountant", icon: "📊", color: "bg-red-100 text-red-800" },
    { name: "Project Manager", label: "Project Manager", icon: "📋", color: "bg-orange-100 text-orange-800" },
    { name: "Team Leader", label: "Team Leader", icon: "👨‍💼", color: "bg-teal-100 text-teal-800" },
    { name: "Telecaller", label: "Telecaller", icon: "📞", color: "bg-cyan-100 text-cyan-800" },
    { name: "Sales Employee", label: "Sales Employee", icon: "💼", color: "bg-lime-100 text-lime-800" }
  ];

  return departments.map(dept => ({
    ...dept,
    id: generateDepartmentId(dept.name),
    code: DEPARTMENT_CODES[dept.name]
  }));
};

module.exports = {
  generateDepartmentId,
  generateDepartmentObjects,
  getAllDepartments,
  DEPARTMENT_CODES,
  COMPANY_SUFFIX
};