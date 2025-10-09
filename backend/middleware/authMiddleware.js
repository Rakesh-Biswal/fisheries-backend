const jwt = require('jsonwebtoken');

// Simple authentication middleware for testing
const authenticateToken = async (req, res, next) => {
  try {
    // For testing, you can temporarily bypass auth
    // Remove this in production
    req.user = { id: '65d8f5a8e4b1c2d3e4f5a6b7' }; // Mock user ID for testing
    return next();

    /* Uncomment for real authentication
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Access token required'
      });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
    req.user = decoded;
    next();
    */
  } catch (error) {
    console.error('Authentication error:', error);
    return res.status(403).json({
      success: false,
      message: 'Invalid or expired token'
    });
  }
};

module.exports = { authenticateToken };