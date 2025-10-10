const express = require("express");
const router = express.Router();
const mongoose = require("mongoose");
const TLTask = require("../../models/TEAMLEADER/TLTask");
const { SalesEmployeeAuth } = require("../../middleware/authMiddleware"); // Fix the import path
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
    console.log(
      "📊 Received FULL response data:",
      JSON.stringify(responseData, null, 2)
    );

    // Validate required fields
    const requiredFields = [
      "responseTitle",
      "responseDescription",
      "workStatus",
      "completionPercentage",
    ];
    for (const field of requiredFields) {
      if (!responseData[field]) {
        return res.status(400).json({
          success: false,
          message: `Missing required field: ${field}`,
        });
      }
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

    // Process images to match schema - ENHANCED DEBUGGING
    let processedImages = [];
    console.log("🖼️ Raw images data received:", responseData.images);

    if (responseData.images && Array.isArray(responseData.images)) {
      console.log(`🖼️ Processing ${responseData.images.length} images`);

      processedImages = responseData.images
        .map((img, index) => {
          console.log(`🖼️ Image ${index}:`, img);

          // If it's already an object with proper structure, use it as-is
          if (typeof img === "object" && img.url) {
            const processed = {
              url: img.url,
              publicId: img.publicId || img.url.split("/").pop().split(".")[0],
              caption: img.caption || "",
            };
            console.log(`✅ Processed object image ${index}:`, processed);
            return processed;
          }
          // If it's a string URL, convert to object
          else if (typeof img === "string" && img.trim() !== "") {
            const processed = {
              url: img,
              publicId: img.split("/").pop().split(".")[0],
              caption: "",
            };
            console.log(`✅ Processed string image ${index}:`, processed);
            return processed;
          }
          console.log(`❌ Invalid image at index ${index}:`, img);
          return null;
        })
        .filter((img) => img !== null);

      console.log(`✅ Final processed images: ${processedImages.length}`);
    } else {
      console.log("❌ No images array or invalid format");
    }

    console.log("🖼️ Final processed images array:", processedImages);

    // Prepare response object
    const response = {
      submittedAt: new Date(),
      responseTitle: responseData.responseTitle,
      responseDescription: responseData.responseDescription,
      workStatus: responseData.workStatus,
      keyPoints: responseData.keyPoints || [],
      images: processedImages,
      challengesFaced: responseData.challengesFaced || "",
      nextSteps: responseData.nextSteps || "",
      completionPercentage: Math.min(
        100,
        Math.max(0, responseData.completionPercentage)
      ),
      rating: responseData.rating || null,
    };

    console.log(
      "💾 Final response object to save:",
      JSON.stringify(response, null, 2)
    );

    // Update task with response
    task.response = response;
    task.status =
      response.workStatus === "success"
        ? "completed"
        : response.workStatus === "partial-success"
        ? "in-progress"
        : "in-progress";
    task.progress = response.completionPercentage;

    await task.save();

    console.log(`✅ Response submitted for task: ${id}`);
    console.log(
      "💾 Saved task response:",
      JSON.stringify(task.response, null, 2)
    );

    res.json({
      success: true,
      message: "Task response submitted successfully",
      data: {
        taskId: task._id,
        status: task.status,
        progress: task.progress,
        submittedAt: response.submittedAt,
        imagesCount: processedImages.length,
      },
    });
  } catch (error) {
    console.error("❌ Error submitting task response:", error);
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
