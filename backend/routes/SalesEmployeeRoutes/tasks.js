const mongoose = require("mongoose");
const express = require("express");
const router = express.Router();
const TLTask = require("../../models/TEAMLEADER/TLTask");
const { SalesEmployeeAuth } = require("../../middleware/authMiddleware");
const cloudinary = require("cloudinary").v2;

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

router.post("/upload-task-image", SalesEmployeeAuth, async (req, res) => {
  try {
    const { imageData, taskId } = req.body;

    console.log(`📤 Uploading image for task: ${taskId}`);

    // Validate task ownership
    const task = await TLTask.findOne({
      _id: taskId,
      assignedTo: req.salesEmployee.id,
    });

    if (!task) {
      return res.status(404).json({
        success: false,
        message: "Task not found or access denied",
      });
    }

    // Upload to Cloudinary
    const uploadResult = await cloudinary.uploader.upload(imageData, {
      folder: `task_responses/${taskId}`,
      transformation: [
        { width: 1200, crop: "limit" },
        { quality: "auto" },
        { format: "auto" },
      ],
    });

    console.log(`✅ Image uploaded successfully: ${uploadResult.public_id}`);

    res.json({
      success: true,
      data: {
        url: uploadResult.secure_url,
        publicId: uploadResult.public_id,
        width: uploadResult.width,
        height: uploadResult.height,
        format: uploadResult.format,
      },
    });
  } catch (error) {
    console.error("❌ Upload error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to upload image",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
});

// Get ongoing tasks for sales employee
router.get("/ongoing-tasks", SalesEmployeeAuth, async (req, res) => {
  try {
    const salesEmployeeId = req.salesEmployee.id;

    console.log("🔍 Fetching tasks for sales employee:", salesEmployeeId);

    const tasks = await TLTask.find({
      assignedTo: salesEmployeeId,
      status: { $in: ["pending", "in-progress"] },
    })
      .populate("assignedBy", "name photo companyEmail")
      .populate("originalTask", "title description")
      .sort({ deadline: 1, priority: -1 })
      .select(
        "title description deadline priority progress status assignedBy highlights response"
      );

    console.log(`✅ Found ${tasks.length} tasks for sales employee`);

    // Format the response
    const formattedTasks = tasks.map((task) => ({
      _id: task._id,
      title: task.title,
      description: task.description,
      deadline: task.deadline,
      priority: task.priority,
      progress: task.progress,
      status: task.status,
      highlights: task.highlights || [],
      assignedBy: {
        _id: task.assignedBy._id,
        name: task.assignedBy.name,
        photo: task.assignedBy.photo,
        email: task.assignedBy.companyEmail,
      },
      hasResponse: !!task.response?.submittedAt,
      responseStatus: task.response?.workStatus || "not-responded",
    }));

    res.json({
      success: true,
      data: formattedTasks,
      count: formattedTasks.length,
      message: `Found ${formattedTasks.length} ongoing tasks`,
    });
  } catch (error) {
    console.error("❌ Error fetching ongoing tasks:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch ongoing tasks",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
});

// Get completed tasks (for history)
router.get("/completed/history", SalesEmployeeAuth, async (req, res) => {
  try {
    const salesEmployeeId = req.salesEmployee.id;
    const { page = 1, limit = 10 } = req.query;

    const tasks = await TLTask.find({
      assignedTo: salesEmployeeId,
      status: "completed",
    })
      .populate("assignedBy", "name photo companyEmail")
      .populate("originalTask", "title description")
      .sort({ "response.submittedAt": -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .select("title description deadline priority status response assignedBy");

    const total = await TLTask.countDocuments({
      assignedTo: salesEmployeeId,
      status: "completed",
    });

    const formattedTasks = tasks.map((task) => ({
      _id: task._id,
      title: task.title,
      description: task.description,
      deadline: task.deadline,
      priority: task.priority,
      status: task.status,
      assignedBy: {
        _id: task.assignedBy._id,
        name: task.assignedBy.name,
        photo: task.assignedBy.photo,
        email: task.assignedBy.companyEmail,
      },
      response: task.response || null,
      submittedAt: task.response?.submittedAt,
      completionPercentage: task.response?.completionPercentage,
    }));

    res.json({
      success: true,
      data: formattedTasks,
      totalPages: Math.ceil(total / limit),
      currentPage: parseInt(page),
      total,
    });
  } catch (error) {
    console.error("❌ Error fetching completed tasks:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch completed tasks",
    });
  }
});

// Get task statistics for sales employee
router.get("/task-stats", SalesEmployeeAuth, async (req, res) => {
  try {
    const salesEmployeeId = req.salesEmployee.id;

    const stats = await TLTask.aggregate([
      {
        $match: {
          assignedTo: new mongoose.Types.ObjectId(salesEmployeeId),
        },
      },
      {
        $group: {
          _id: null,
          total: { $sum: 1 },
          pending: {
            $sum: { $cond: [{ $eq: ["$status", "pending"] }, 1, 0] },
          },
          inProgress: {
            $sum: { $cond: [{ $eq: ["$status", "in-progress"] }, 1, 0] },
          },
          completed: {
            $sum: { $cond: [{ $eq: ["$status", "completed"] }, 1, 0] },
          },
          overdue: {
            $sum: {
              $cond: [
                {
                  $and: [
                    { $ne: ["$status", "completed"] },
                    { $lt: ["$deadline", new Date()] },
                  ],
                },
                1,
                0,
              ],
            },
          },
        },
      },
    ]);

    res.json({
      success: true,
      data: stats[0] || {
        total: 0,
        pending: 0,
        inProgress: 0,
        completed: 0,
        overdue: 0,
      },
    });
  } catch (error) {
    console.error("❌ Error fetching task stats:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch task statistics",
    });
  }
});

router.get("/tasks-history", SalesEmployeeAuth, async (req, res) => {
  try {
    const salesEmployeeId = req.salesEmployee.id;
    const { month, year } = req.query;

    console.log(
      `📅 Fetching tasks history for sales employee: ${salesEmployeeId}`
    );

    // Calculate date range for the requested month/year
    const currentDate = new Date();
    const targetMonth = month ? parseInt(month) : currentDate.getMonth() + 1;
    const targetYear = year ? parseInt(year) : currentDate.getFullYear();

    const startDate = new Date(targetYear, targetMonth - 1, 1);
    const endDate = new Date(targetYear, targetMonth, 0, 23, 59, 59);

    console.log(`📅 Date range: ${startDate} to ${endDate}`);

    // Get all tasks with responses (both completed and with responses)
    const tasks = await TLTask.find({
      assignedTo: salesEmployeeId,
      $or: [
        { status: "completed" },
        { "response.submittedAt": { $exists: true, $ne: null } },
      ],
    })
      .populate("assignedBy", "name photo companyEmail")
      .populate("originalTask", "title description")
      .sort({ "response.submittedAt": -1, assignmentDate: -1 })
      .select(
        "title description deadline priority status response assignedBy assignmentDate"
      );

    console.log(`✅ Found ${tasks.length} historical tasks`);

    // Filter tasks by date range on the backend side
    const filteredTasks = tasks.filter((task) => {
      const taskDate = task.response?.submittedAt || task.assignmentDate;
      return taskDate >= startDate && taskDate <= endDate;
    });

    console.log(`📅 ${filteredTasks.length} tasks in date range`);

    // Group tasks by date
    const tasksByDate = {};

    filteredTasks.forEach((task) => {
      // Use response submission date if available, otherwise use assignment date
      const taskDate = task.response?.submittedAt || task.assignmentDate;
      const dateKey = new Date(taskDate).toDateString();

      if (!tasksByDate[dateKey]) {
        tasksByDate[dateKey] = {
          date: taskDate,
          tasks: [],
        };
      }

      tasksByDate[dateKey].tasks.push({
        _id: task._id,
        title: task.title,
        description: task.description,
        deadline: task.deadline,
        priority: task.priority,
        status: task.status,
        assignedBy: {
          _id: task.assignedBy._id,
          name: task.assignedBy.name,
          photo: task.assignedBy.photo,
          email: task.assignedBy.companyEmail,
        },
        response: task.response || null,
        hasResponse: !!task.response?.submittedAt,
        submittedAt: task.response?.submittedAt,
        completionPercentage: task.response?.completionPercentage || 0,
        workStatus: task.response?.workStatus || "not-responded",
      });
    });

    // Convert to array and sort by date (newest first)
    const groupedTasks = Object.values(tasksByDate).sort(
      (a, b) => new Date(b.date) - new Date(a.date)
    );

    // Get unique months for navigation
    const monthSet = new Set();
    tasks.forEach((task) => {
      const taskDate = task.response?.submittedAt || task.assignmentDate;
      const year = taskDate.getFullYear();
      const month = taskDate.getMonth() + 1;
      monthSet.add(`${year}-${month}`);
    });

    const uniqueMonths = Array.from(monthSet)
      .map((dateStr) => {
        const [year, month] = dateStr.split("-").map(Number);
        return { year, month, count: 1 };
      })
      .sort((a, b) => {
        if (a.year !== b.year) return b.year - a.year;
        return b.month - a.month;
      });

    res.json({
      success: true,
      data: {
        tasks: groupedTasks,
        currentMonth: targetMonth,
        currentYear: targetYear,
        availableMonths: uniqueMonths,
      },
      message: `Found ${groupedTasks.length} days with tasks`,
    });
  } catch (error) {
    console.error("❌ Error fetching tasks history:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch tasks history",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
});

// Get task details by ID
router.get("/:id", SalesEmployeeAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const salesEmployeeId = req.salesEmployee.id;

    console.log(`🔍 Fetching task details for: ${id}`);

    const task = await TLTask.findOne({
      _id: id,
      assignedTo: salesEmployeeId,
    })
      .populate("assignedBy", "name photo companyEmail")
      .populate("originalTask", "title description")
      .select("-comments -attachments"); // Exclude heavy fields for now

    if (!task) {
      return res.status(404).json({
        success: false,
        message: "Task not found or access denied",
      });
    }

    // Format the response with all task details
    const taskDetails = {
      _id: task._id,
      title: task.title,
      description: task.description,
      deadline: task.deadline,
      priority: task.priority,
      progress: task.progress,
      status: task.status,
      highlights: task.highlights || [],
      assignmentDate: task.assignmentDate,
      assignedBy: {
        _id: task.assignedBy._id,
        name: task.assignedBy.name,
        photo: task.assignedBy.photo,
        email: task.assignedBy.companyEmail,
      },
      // Include response data if exists
      response: task.response || null,
      hasResponse: !!task.response?.submittedAt,
      originalTask: task.originalTask
        ? {
            title: task.originalTask.title,
            description: task.originalTask.description,
          }
        : null,
    };

    res.json({
      success: true,
      data: taskDetails,
      message: "Task details fetched successfully",
    });
  } catch (error) {
    console.error("❌ Error fetching task details:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch task details",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
});

router.post("/:id/submit-response", SalesEmployeeAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const salesEmployeeId = req.salesEmployee.id;
    const responseData = req.body;

    console.log(`📝 Submitting response for task: ${id}`);
    console.log("👤 Sales Employee ID:", salesEmployeeId);
    console.log("📊 Response data overview:", {
      responseTitle: responseData.responseTitle,
      workStatus: responseData.workStatus,
      imagesCount: responseData.images ? responseData.images.length : 0,
      completionPercentage: responseData.completionPercentage,
      keyPointsCount: responseData.keyPoints
        ? responseData.keyPoints.length
        : 0,
    });

    // Enhanced validation for required fields
    const requiredFields = [
      "responseTitle",
      "responseDescription",
      "workStatus",
      "completionPercentage",
    ];

    const missingFields = [];
    for (const field of requiredFields) {
      if (
        !responseData[field] ||
        responseData[field].toString().trim() === ""
      ) {
        missingFields.push(field);
      }
    }

    if (missingFields.length > 0) {
      return res.status(400).json({
        success: false,
        message: `Missing required fields: ${missingFields.join(", ")}`,
        missingFields,
      });
    }

    // Validate workStatus
    const validWorkStatus = [
      "success",
      "rejected",
      "under-process",
      "not-responded",
      "partial-success",
      "delayed",
    ];

    if (!validWorkStatus.includes(responseData.workStatus)) {
      return res.status(400).json({
        success: false,
        message: "Invalid work status",
        validWorkStatus,
      });
    }

    // Validate completion percentage
    const completionPercentage = parseInt(responseData.completionPercentage);
    if (
      isNaN(completionPercentage) ||
      completionPercentage < 0 ||
      completionPercentage > 100
    ) {
      return res.status(400).json({
        success: false,
        message: "Completion percentage must be between 0 and 100",
      });
    }

    // Find the task
    const task = await TLTask.findOne({
      _id: id,
      assignedTo: salesEmployeeId,
    });

    if (!task) {
      return res.status(404).json({
        success: false,
        message: "Task not found or access denied",
      });
    }

    // Check if task already has a response
    if (task.response && task.response.submittedAt) {
      return res.status(400).json({
        success: false,
        message: "Response already submitted. Use update endpoint to modify.",
      });
    }

    // ENHANCED: Process images with comprehensive validation
    let processedImages = [];

    console.log("🖼️ Starting image processing...");

    if (responseData.images && Array.isArray(responseData.images)) {
      console.log(`📸 Processing ${responseData.images.length} images`);

      processedImages = responseData.images
        .map((img, index) => {
          console.log(`🔍 Analyzing image ${index}:`, {
            type: typeof img,
            isObject: typeof img === "object",
            hasUrl: img && typeof img === "object" && img.url,
            urlLength: img?.url?.length || 0,
          });

          // Case 1: Already proper object with URL
          if (
            img &&
            typeof img === "object" &&
            img.url &&
            typeof img.url === "string" &&
            img.url.trim() !== ""
          ) {
            const processed = {
              url: img.url.trim(),
              publicId: img.publicId || `task_${id}_img_${Date.now()}_${index}`,
              caption: img.caption || "",
            };

            console.log(`✅ Valid object image ${index}:`, {
              urlPreview: `${processed.url.substring(0, 50)}...`,
              publicId: processed.publicId,
              captionLength: processed.caption.length,
            });

            return processed;
          }

          // Case 2: String URL (fallback for old format)
          else if (typeof img === "string" && img.trim() !== "") {
            const processed = {
              url: img.trim(),
              publicId: `task_${id}_img_${Date.now()}_${index}`,
              caption: "",
            };

            console.log(`✅ Valid string image ${index}:`, {
              urlPreview: `${processed.url.substring(0, 50)}...`,
              publicId: processed.publicId,
            });

            return processed;
          }

          // Case 3: Invalid image
          else {
            console.log(`❌ Invalid image at index ${index}:`, {
              type: typeof img,
              value: img,
            });
            return null;
          }
        })
        .filter((img) => img !== null);

      console.log(
        `✅ Final processed images: ${processedImages.length} valid out of ${responseData.images.length} total`
      );

      // Log each valid image for debugging
      processedImages.forEach((img, index) => {
        console.log(`🖼️ Valid image ${index}: ${img.url.substring(0, 30)}...`);
      });
    } else {
      console.log("ℹ️ No images array provided or invalid format");
    }

    // Prepare comprehensive response object
    const response = {
      submittedAt: new Date(),
      responseTitle: responseData.responseTitle.trim(),
      responseDescription: responseData.responseDescription.trim(),
      workStatus: responseData.workStatus,
      keyPoints: Array.isArray(responseData.keyPoints)
        ? responseData.keyPoints
            .map((point) => point.toString().trim())
            .filter((point) => point !== "")
        : [],
      images: processedImages,
      challengesFaced: responseData.challengesFaced
        ? responseData.challengesFaced.trim()
        : "",
      nextSteps: responseData.nextSteps ? responseData.nextSteps.trim() : "",
      completionPercentage: Math.min(100, Math.max(0, completionPercentage)),
      rating: responseData.rating ? parseInt(responseData.rating) : null,
    };

    console.log("💾 Final response object prepared:", {
      responseTitle: response.responseTitle,
      workStatus: response.workStatus,
      completionPercentage: response.completionPercentage,
      imagesCount: response.images.length,
      keyPointsCount: response.keyPoints.length,
      hasChallenges: response.challengesFaced.length > 0,
      hasNextSteps: response.nextSteps.length > 0,
      rating: response.rating,
    });

    // Update task with response
    task.response = response;

    // Update task status based on workStatus
    if (response.workStatus === "success") {
      task.status = "completed";
    } else if (response.workStatus === "partial-success") {
      task.status = "in-progress";
    } else {
      task.status = "in-progress";
    }

    task.progress = response.completionPercentage;
    task.updatedAt = new Date();

    console.log("💾 Saving task to database...");

    await task.save();

    console.log(`✅ Response submitted successfully for task: ${id}`);
    console.log("📈 Task updated:", {
      newStatus: task.status,
      newProgress: task.progress,
      responseSubmitted: task.response.submittedAt,
    });

    // Send success response
    res.json({
      success: true,
      message: "Task response submitted successfully",
      data: {
        taskId: task._id,
        status: task.status,
        progress: task.progress,
        submittedAt: response.submittedAt,
        imagesCount: processedImages.length,
        keyPointsCount: response.keyPoints.length,
        workStatus: response.workStatus,
      },
    });
  } catch (error) {
    console.error("❌ Error submitting task response:", error);

    // Enhanced error handling
    if (error.name === "ValidationError") {
      return res.status(400).json({
        success: false,
        message: "Validation error",
        error: error.message,
      });
    }

    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: "Duplicate response detected",
      });
    }

    res.status(500).json({
      success: false,
      message: "Failed to submit task response",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
});

// Update task response - MODIFIED
router.put("/:id/update-response", SalesEmployeeAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const salesEmployeeId = req.salesEmployee.id;
    const responseData = req.body;

    console.log(`🔄 Updating response for task: ${id}`);
    console.log(
      "📊 Update request data:",
      JSON.stringify(responseData, null, 2)
    );

    // Find the task
    const task = await TLTask.findOne({
      _id: id,
      assignedTo: salesEmployeeId,
    });

    if (!task) {
      return res.status(404).json({
        success: false,
        message: "Task not found or access denied",
      });
    }

    // Check if task has a response to update
    if (!task.response || !task.response.submittedAt) {
      return res.status(400).json({
        success: false,
        message: "No response found to update. Please submit a response first.",
      });
    }

    // Process images for update - ENHANCED
    if (responseData.images && Array.isArray(responseData.images)) {
      console.log(`🖼️ Updating ${responseData.images.length} images`);

      const processedImages = responseData.images
        .map((img, index) => {
          console.log(`🖼️ Update image ${index}:`, img);

          if (typeof img === "object" && img.url) {
            return {
              url: img.url,
              publicId: img.publicId || img.url.split("/").pop().split(".")[0],
              caption: img.caption || "",
            };
          } else if (typeof img === "string" && img.trim() !== "") {
            return {
              url: img,
              publicId: img.split("/").pop().split(".")[0],
              caption: "",
            };
          }
          return null;
        })
        .filter((img) => img !== null);

      task.response.images = processedImages;
      console.log(`✅ Updated images array:`, processedImages);
    }

    // Update other response fields
    if (responseData.responseTitle)
      task.response.responseTitle = responseData.responseTitle;
    if (responseData.responseDescription)
      task.response.responseDescription = responseData.responseDescription;
    if (responseData.workStatus)
      task.response.workStatus = responseData.workStatus;
    if (responseData.keyPoints)
      task.response.keyPoints = responseData.keyPoints;
    if (responseData.challengesFaced !== undefined)
      task.response.challengesFaced = responseData.challengesFaced;
    if (responseData.nextSteps !== undefined)
      task.response.nextSteps = responseData.nextSteps;
    if (responseData.completionPercentage) {
      task.response.completionPercentage = Math.min(
        100,
        Math.max(0, responseData.completionPercentage)
      );
      task.progress = task.response.completionPercentage;
    }
    if (responseData.rating !== undefined)
      task.response.rating = responseData.rating;

    // Update task status based on workStatus
    if (responseData.workStatus) {
      task.status =
        responseData.workStatus === "success"
          ? "completed"
          : responseData.workStatus === "partial-success"
          ? "in-progress"
          : "in-progress";
    }

    task.response.submittedAt = new Date();

    await task.save();

    console.log(`✅ Response updated for task: ${id}`);
    console.log(
      "💾 Updated task response:",
      JSON.stringify(task.response, null, 2)
    );

    res.json({
      success: true,
      message: "Task response updated successfully",
      data: {
        taskId: task._id,
        status: task.status,
        progress: task.progress,
        submittedAt: task.response.submittedAt,
        imagesCount: task.response.images.length,
      },
    });
  } catch (error) {
    console.error("❌ Error updating task response:", error);
    res.status(500).json({
      success: false,
      message: "Failed to update task response",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
});

module.exports = router;
