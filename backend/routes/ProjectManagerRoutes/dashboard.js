// backend/routes/ProjectManagerRoutes/dashboard.js
const express = require("express");
const router = express.Router();
const FarmerLead = require("../../models/SALESEMPLOYEE/farmerLeads");
const FarmerLand_II = require("../../models/SALESEMPLOYEE/farmerLeads_II");
const Payment = require("../../models/PAYMENTS/Payment");

// Get dashboard overview data
router.get("/", async (req, res) => {
    try {
        // Get counts in parallel for better performance
        const [
            totalFarmers,
            approvedFarmers,
            step2Data,
            payments,
            recentFarmers
        ] = await Promise.all([
            FarmerLead.countDocuments(),
            FarmerLead.countDocuments({ hrApproved: true }),
            FarmerLand_II.find(),
            Payment.find(),
            FarmerLead.find()
                .sort({ createdAt: -1 })
                .limit(5)
                .select('name phone email farmSize farmType salesEmployeeApproved teamLeaderApproved hrApproved createdAt')
        ]);

        // Calculate statistics
        const pendingApprovals = await FarmerLead.countDocuments({
            $or: [
                { salesEmployeeApproved: { $ne: true } },
                { teamLeaderApproved: { $ne: true } },
                { hrApproved: { $ne: true } }
            ]
        });

        const totalRevenue = payments
            .filter(p => p.paymentStatus === 'Completed')
            .reduce((sum, payment) => sum + payment.amount, 0);

        const step1Completed = await FarmerLead.countDocuments({
            salesEmployeeApproved: true,
            teamLeaderApproved: true,
            hrApproved: true
        });

        const step2Completed = step2Data.filter(data => data.documentStatus === 'Approved').length;

        const paymentReadyCount = (await FarmerLead.aggregate([
            {
                $lookup: {
                    from: 'farmerland_iis',
                    localField: '_id',
                    foreignField: 'farmerLeadId',
                    as: 'step2'
                }
            },
            {
                $match: {
                    'salesEmployeeApproved': true,
                    'teamLeaderApproved': true,
                    'hrApproved': true,
                    'step2.documentStatus': 'Approved'
                }
            },
            {
                $count: 'count'
            }
        ]))[0]?.count || 0;

        // Generate mock chart data (replace with actual aggregation in production)
        const enrollmentData = generateEnrollmentData();
        const paymentDistribution = generatePaymentDistribution(payments);
        const stepCompletionData = generateStepCompletionData(totalFarmers, step1Completed, step2Completed, paymentReadyCount);
        const pendingActions = generatePendingActions(recentFarmers, step2Data);

        res.json({
            success: true,
            data: {
                stats: {
                    totalFarmers,
                    totalPayments: payments.length,
                    completedSteps: step1Completed,
                    pendingApprovals,
                    activeProjects: approvedFarmers,
                    totalRevenue
                },
                enrollmentChart: enrollmentData,
                paymentChart: paymentDistribution,
                stepCompletionChart: stepCompletionData,
                recentFarmers,
                pendingActions
            }
        });
    } catch (error) {
        console.error("Error fetching dashboard data:", error);
        res.status(500).json({
            success: false,
            message: "Error fetching dashboard data",
            error: error.message
        });
    }
});

// Helper functions for mock data
function generateEnrollmentData() {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return months.map(month => ({
        month,
        enrolled: Math.floor(Math.random() * 30) + 10,
        approved: Math.floor(Math.random() * 25) + 5
    }));
}

function generatePaymentDistribution(payments) {
    const statusCount = {
        'Completed': 0,
        'Pending': 0,
        'Processing': 0,
        'Failed': 0
    };

    payments.forEach(payment => {
        statusCount[payment.paymentStatus] = (statusCount[payment.paymentStatus] || 0) + 1;
    });

    return Object.entries(statusCount)
        .filter(([_, value]) => value > 0)
        .map(([name, value]) => ({ name, value }));
}

function generateStepCompletionData(total, step1, step2, paymentReady) {
    return [
        { step: 'Step 1', completed: step1, pending: total - step1 },
        { step: 'Step 2', completed: step2, pending: total - step2 },
        { step: 'Payment Ready', completed: paymentReady, pending: total - paymentReady }
    ];
}

function generatePendingActions(farmers, step2Data) {
    const actions = [];

    // Add approval actions
    farmers.forEach(farmer => {
        if (!farmer.hrApproved) {
            actions.push({
                type: 'approval',
                title: 'Approval Required',
                description: `Farmer: ${farmer.name}`,
                farmerId: farmer._id,
                priority: 'High'
            });
        }
    });

    // Add verification actions
    step2Data.forEach(step2 => {
        if (step2.documentStatus === 'Pending' || step2.documentStatus === 'Under Review') {
            actions.push({
                type: 'verification',
                title: 'Document Review',
                description: `Land documents pending - ${step2.landOwner}`,
                farmerId: step2.farmerLeadId,
                priority: 'Medium'
            });
        }
    });

    return actions.slice(0, 5);
}

module.exports = router;