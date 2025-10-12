// Process departments - handle both string IDs and objects
const departmentIds = Array.isArray(departments) 
  ? departments.map(dept => {
      if (typeof dept === 'object' && dept.id) {
        return dept.id; // Extract ID from object
      }
      return dept; // Already a string
    })
  : [];