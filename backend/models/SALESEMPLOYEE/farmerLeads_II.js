const mongoose = require("mongoose");

const FarmerLand_IISchema = new mongoose.Schema(
  {
    // Reference to the main FarmerLead
    farmerLeadId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "FarmerLead",
      required: true,
    },

    // ===== Land Details =====
    landOwner: {
      type: String,
      required: true,
    },
    khatiyanNo: {
      type: String,
      required: true,
    },
    plotNo: {
      type: String,
      required: true,
    },
    plotArea: {
      value: { type: Number, required: true },
      unit: { type: String, default: "decimal" },
    },
    landOwnerRelation: {
      type: String,
      required: true,
      enum: [
        "Self",
        "Father",
        "Mother",
        "Spouse",
        "Son",
        "Daughter",
        "Brother",
        "Sister",
        "Other",
      ],
    },

    // ===== Document Uploads =====
    documents: {
      kyc: {
        aadharFront: { type: String }, // URL
        aadharBack: { type: String }, // URL
        panCard: { type: String }, // URL
        voterId: { type: String }, // URL
        otherId: { type: String }, // URL
      },
      landRecords: {
        khatiyanDocument: { type: String }, // URL
        plotDocument: { type: String }, // URL
        landMap: { type: String }, // URL
        otherLandDoc: { type: String }, // URL
      },
      noc: {
        type: String, // URL for No Objection Certificate
      },
      leaseAgreement: {
        type: String, // URL for lease agreement if applicable
      },
      photos: {
        applicantPhoto: { type: String }, // URL
        landPhoto1: { type: String }, // URL
        landPhoto2: { type: String }, // URL
        landPhoto3: { type: String }, // URL
      },
    },

    // ===== Additional Information =====
    landLocation: {
      latitude: { type: Number },
      longitude: { type: Number },
      fullAddress: { type: String },
    },

    // ===== Status Tracking =====
    documentStatus: {
      type: String,
      enum: [
        "Pending",
        "Under Review",
        "Approved",
        "Rejected",
        "Needs Correction",
      ],
      default: "Pending",
    },

    verificationNotes: { type: String },

    // ===== Timestamps =====
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

module.exports = mongoose.model("FarmerLand_II", FarmerLand_IISchema);