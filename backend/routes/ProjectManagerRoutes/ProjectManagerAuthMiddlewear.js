const jwt = require("jsonwebtoken");

const ProjectManagerAuth = (req, res, next) => {
  try {
    const token = req.cookies?.EmployeeToken;

    if (!token) {
      return res.status(401).json({
        success: false,
        message: "Access denied. Employee token not found.",
      });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    req.pm = decoded;

    if (decoded.role !== "project-manager") {
      return res.status(403).json({
        success: false,
        message: "Access denied. You are not a Project Manager.",
      });
    }

    next();
  } catch (error) {
    console.error("PM Auth Error:", error);
    return res.status(401).json({
      success: false,
      message: "Invalid or expired token.",
    });
  }
};

module.exports = ProjectManagerAuth;
