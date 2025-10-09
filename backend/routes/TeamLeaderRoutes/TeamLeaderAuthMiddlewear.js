const jwt = require("jsonwebtoken");

const TLAuth = (req, res, next) => {
  try {
    // Get token from cookies
    const token = req.cookies?.EmployeeToken;
    if (!token) {
      return res.status(401).json({
        success: false,
        message: "Access denied. TL token not found.",
      });
    }

    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Attach decoded user to request
    req.tl = decoded; 
    // Optional: Ensure role is CEO before allowing
    if (decoded.role !== "teamleader") {
      return res.status(403).json({
        success: false,
        message: "Access denied. You are not authorized.",
      });
    }

    next();
  } catch (error) {
    console.error("TL Auth Error:", error);
    res.status(401).json({
      success: false,
      message: "Invalid or expired token.",
    });
  }
};

module.exports = TLAuth;
