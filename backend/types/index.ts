export interface UserProfile {
  _id: string;
  name: string;
  companyEmail: string;
  phone: string;
  role: string;
  empCode: string;
  photo?: string;
  businessData?: any;
}

export interface Meeting {
  _id: string;
  title: string;
  description: string;
  googleMeetLink?: string;
  googleSheetLink?: string;
  organizer: string | { name: string; email: string };
  participants: {
    name: string;
    email: string;
    status: string;
    _id: string;
  }[];
  timeSlots: {
    date: string;
    startTime: string;
    endTime: string;
    status: string;
    _id: string;
  }[];
  agenda?: string;
  meetingType?: string;
  priority?: string;
  status?: string;
}

export interface TLTask {
  _id: string;
  title: string;
  description: string;
  deadline: string;
  priority: "low" | "medium" | "high";
  progress: number;
  status: "pending" | "in-progress" | "completed" | "overdue" | "cancelled";
  highlights: string[];
  assignedBy: {
    _id: string;
    name: string;
    photo?: string;
    email: string;
  };
  hasResponse: boolean;
  responseStatus: string;
}

export interface FarmerLead {
  _id: string;
  name: string;
  phone: string;
  address: string;
  farmSize?: string;
  farmType?: string;
  farmingExperience?: number;
  createdAt: string;
  progress?: {
    stage: "basic" | "intermediate" | "advanced";
    completed: boolean;
  };
}

export interface AttendanceData {
  isActive: boolean;
  workModeOnTime: string;
  workModeOffTime?: string;
  totalWorkDuration?: number;
  totalDistanceTravelled: number;
  status: string;
  workType: string;
  startingLocation?: {
    latitude: number;
    longitude: number;
  };
  endLocation?: {
    latitude: number;
    longitude: number;
  };
  imageURL?: string;
}

export interface NotificationType {
  id: string;
  title: string;
  message: string;
  type: "warning" | "info" | "error" | "success";
  timestamp: string;
  read: boolean;
}
