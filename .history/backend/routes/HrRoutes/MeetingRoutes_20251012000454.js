const express = require("express");
const mongoose = require("mongoose");
const Meeting = require("../../models/Meeting/Meeting");
const { authenticateToken } = require("./HrAuthMiddlewear");

// Import department models
const Ceo = require("../../models/CEO/CeoPi");
const CeoTask = require("../../models/CEO/CeoTask");
const AccountantEmployee = require("../../models/ACCOUNTANT/AccountantEmployee");

// (Add these only if you actually have these folders)
const TeamLeaderEmployee = require("../../models/TEAMLEADER/TeamLeaderEmployee");
const ProjectManagerEmployee = require("../../models/PROJECTMANAGER/ProjectManagerEmployee");
const TelecallerEmployee = require("../../models/TELECALLER/TelecallerEmployee");
const SalesEmployeeEmployee = require("../../models/SALESEMPLOYEE/SalesEmployeeEmployee");

const router = express.Router();

// Department mapping
const DEPARTMENT_MODELS = {
  ceo: Ceo,
  team_leader: TeamLeaderEmployee,
  project_manager: ProjectManagerEmployee,
  accountant: AccountantEmployee,
  telecaller: TelecallerEmployee,
  sales: SalesEmployeeEmployee
};

const DEPARTMENT_NAMES = {
  hr: 'Human Resources',
  ceo: 'Chief Executive Officer',
  team_leader: 'Team Leader',
  project_manager: 'Project Manager',
  accountant: 'Accountant',
  telecaller: 'Telecaller',
  sales: 'Sales'
};

/**
 * POST /api/hr/meetings/create - Create new meeting as HR (FIXED VERSION)
 */
  const departmentIds = [];
    