const express = require("express")
const bcrypt = require("bcryptjs")
const AccountantEmployee = require("../../models/ACCOUNTANT/AccountantEmployee")
const AccountantBusinessData = require("../../models/ACCOUNTANT/AccountantBusinessData")
const HrEmployee = require("../../models/HR/HrEmployee")
const { authenticateToken } = require("./HrAuthMiddlewear");

const router = express.Router()

// Get all accountants
router.get("/fetch-data", authenticateToken, async (req, res) => {
    try {
        const accountants = await AccountantEmployee.find({ status: "active" })
            .populate("businessData")
            .select("-password")
            .sort({ createdAt: -1 })

        res.json({
            success: true,
            data: accountants,
            count: accountants.length,
        })

    } catch (error) {
        console.error("Error fetching accountants:", error)
        res.status(500).json({
            success: false,
            message: "Failed to fetch accountants",
            error: error.message,
        })
    }
})

// Hire new accountant
router.post("/hire", authenticateToken, async (req, res) => {
    try {
        const {
            name,
            phone,
            email,
            password,
            aadhar,
            pan,
            photoUrl,
            address,
            emergencyContact,
            bankAccount,
            employeeType,
            department,
            joiningDate,
            salary,
            designation,
            experience,
            qualification,
            previousCompany,
            specialization,
            certifications,
        } = req.body;

        // 🔑 Get referredBy from the authenticated HR user (no need from frontend)
        const referredBy = req.user.id;

        // Check if email already exists
        const existingAccountant = await AccountantEmployee.findOne({ companyEmail: email });
        if (existingAccountant) {
            return res.status(400).json({
                success: false,
                message: "Accountant with this email already exists",
            });
        }

        //Verify referring HR exists (extra safety)
        const referringHr = await HrEmployee.findById(referredBy);
        if (!referringHr) {
            return res.status(400).json({
                success: false,
                message: "Invalid HR reference",
            });
        }

        // Generate employee code
        const empCode = `ACC${Date.now().toString().slice(-6)}`;

        // Hash password
        const hashedPassword = await bcrypt.hash(password, 12);

        // Create accountant record
        const accountantEmployee = new AccountantEmployee({
            name,
            phone,
            companyEmail: email,
            password: hashedPassword,
            aadhar,
            pan,
            emergencyContact,
            address,
            qualification: qualification || "",
            experience: experience || 0,
            previousCompany: previousCompany || "",
            specialization: specialization || "",
            certifications: certifications || [],
            bankAccount,
            photo: photoUrl || null,
            empCode,
            status: "active",
            role: "accountant",
            referredBy, // ✅ from cookie
        });

        const savedAccountant = await accountantEmployee.save();

        // Create business data record
        const accountantBusinessData = new AccountantBusinessData({
            employeeId: savedAccountant._id,
            empCode,
            employeeType: employeeType || "full-time",
            department: department || "Finance",
            designation: designation || "Accountant",
            joiningDate: joiningDate || new Date(),
            salary: salary || 0,
            specialization: specialization || "",
            certifications: certifications || [],
            deptStatus: "active",
            probationPeriod: 6,
            reportingManager: referredBy, // ✅ from cookie
        });

        const savedBusinessData = await accountantBusinessData.save();

        // Link business data back to employee
        savedAccountant.businessData = savedBusinessData._id;
        await savedAccountant.save();

        // Remove password from response
        const responseData = savedAccountant.toObject();
        delete responseData.password;

        res.status(201).json({
            success: true,
            message: "Accountant hired successfully",
            data: {
                ...responseData,
                businessData: savedBusinessData,
            },
        });
    } catch (error) {
        console.error("Error hiring accountant:", error);
        res.status(500).json({
            success: false,
            message: "Failed to hire accountant",
            error: error.message,
        });
    }
});

module.exports = router
