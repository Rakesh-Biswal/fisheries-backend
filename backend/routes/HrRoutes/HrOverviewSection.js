const express = require("express");
const HrEmployee = require("../../models/HR/HrEmployee");
const authenticateToken = require("./HrAuthMiddlewear");

const router = express.Router();

router.get("/me", authenticateToken, async (req, res) => {
    try {
        
        const hrEmployee = req.user;

        res.json({
            success: true,
            user: {
                id: hrEmployee._id,
                name: hrEmployee.name,
                role: hrEmployee.role,
            }
        });

    } catch (error) {
        console.error("Error fetching HR employee:", error);
        res.status(500).json({
            success: false,
            error: "Internal server error"
        });
    }
});

module.exports = router;