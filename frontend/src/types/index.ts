export interface User {
  _id: string;
  name: string;
  email: string;
  phone: number;
  role: "Job Seeker" | "Employer";
  createdAt: string;
}

export interface Job {
  _id: string;
  title: string;
  description: string;
  category: string;
  country: string;
  city: string;
  location: string;
  fixedSalary?: number;
  salaryFrom?: number;
  salaryTo?: number;
  expired: boolean;
  jobPostedOn: string;
  postedBy: User | string;
  hasNewApplications?: boolean;
}

export interface Application {
  _id: string;
  name: string;
  email: string;
  phone: number;
  address: string;
  coverLetter: string;
  resume: {
    url: string;
    public_id: string;
  };
  applicantID: {
    user: User | string;
    role: "Job Seeker";
  };
  employerID: {
    user: User | string;
    role: "Employer";
  };
  status: "Pending" | "Accepted" | "Rejected";
  createdAt?: string;
  updatedAt?: string;
}

export interface ContextType {
  isAuthorized: boolean;
  setIsAuthorized: (value: boolean) => void;
  user: User | null;
  setUser: (user: User | null) => void;
  isLoading: boolean;
  setIsLoading: (value: boolean) => void;
}