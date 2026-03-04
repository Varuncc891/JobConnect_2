import axios from "axios";
import React, { useContext, useEffect, useState } from "react";
import toast from "react-hot-toast";
import { FaCheck } from "react-icons/fa6";
import { RxCross2 } from "react-icons/rx";
import { Context } from "../../main";
import { useNavigate } from "react-router-dom";
import { Job, Application } from "../../types";
import { useSSE } from "../../hooks/useSSE";

const MyJobs = () => {
  const [myJobs, setMyJobs] = useState<Job[]>([]);
  const [editingMode, setEditingMode] = useState<string | null>(null);
  const [applications, setApplications] = useState<Application[]>([]);
  const [selectedJobId, setSelectedJobId] = useState<string | null>(null);
  const [showApplications, setShowApplications] = useState(false);
  const [jobsWithNewApps, setJobsWithNewApps] = useState<Set<string>>(new Set());

  const { isAuthorized, user } = useContext(Context);
  const navigateTo = useNavigate();

  const { isConnected } = useSSE({
    url: "http://localhost:4000/api/v1/events",
    onMessage: (data) => {
      if (data.type === "NEW_APPLICATION") {
        const jobId = data.application.jobId;
        toast.custom(() => (
          <div style={{ background: "#f0fdf4", borderLeft: "4px solid #22c55e", padding: "1rem", borderRadius: "0.5rem" }}>
            <p style={{ fontWeight: 600 }}>New Application!</p>
            <p>{data.application.applicantName} applied for {data.application.jobTitle}</p>
          </div>
        ), { duration: 5000 });
        setJobsWithNewApps((prev) => { const s = new Set(prev); s.add(jobId); return s; });
        if (showApplications && selectedJobId === jobId) fetchApplicationsForJob(jobId);
      }
    },
  });

  useEffect(() => {
    const fetchJobs = async () => {
      try {
        const { data } = await axios.get("/api/v1/job/getmyjobs", { withCredentials: true });
        setMyJobs(data.myJobs);
      } catch (error: any) {
        toast.error(error.response?.data?.message || "Error fetching jobs");
        setMyJobs([]);
      }
    };
    fetchJobs();
  }, []);

  useEffect(() => {
    if (!isAuthorized || (user && user.role !== "Employer")) navigateTo("/");
  }, [isAuthorized, user, navigateTo]);

  const fetchApplicationsForJob = async (jobId: string) => {
    try {
      const { data } = await axios.get("/api/v1/application/employer/getall", { withCredentials: true });
      // @ts-ignore
      const jobApplications = data.applications.filter((app: Application) => app.jobId === jobId || app.jobInfo?.jobId === jobId);
      setApplications(jobApplications);
      setJobsWithNewApps((prev) => { const s = new Set(prev); s.delete(jobId); return s; });
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Error fetching applications");
    }
  };

  const handleViewApplications = (jobId: string) => {
    setSelectedJobId(jobId);
    setShowApplications(true);
    fetchApplicationsForJob(jobId);
  };

  const handleBackToJobs = () => {
    setShowApplications(false);
    setSelectedJobId(null);
    setApplications([]);
  };

  const handleUpdateApplicationStatus = async (applicationId: string, status: "Accepted" | "Rejected") => {
    try {
      await axios.put(`/api/v1/application/status/${applicationId}`, { status }, { withCredentials: true });
      toast.success(`Application ${status.toLowerCase()}!`);
      if (selectedJobId) fetchApplicationsForJob(selectedJobId);
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Error updating application");
    }
  };

  const handleEnableEdit = (jobId: string) => setEditingMode(jobId);
  const handleDisableEdit = () => setEditingMode(null);

  const handleUpdateJob = async (jobId: string) => {
    const updatedJob = myJobs.find((job) => job._id === jobId);
    if (!updatedJob) return;
    try {
      await axios.put(`/api/v1/job/update/${jobId}`, updatedJob, { withCredentials: true });
      toast.success("Job updated successfully!");
      setEditingMode(null);
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Error updating job");
    }
  };

  const handleDeleteJob = async (jobId: string) => {
    try {
      await axios.delete(`/api/v1/job/delete/${jobId}`, { withCredentials: true });
      toast.success("Job deleted successfully!");
      setMyJobs((prev) => prev.filter((job) => job._id !== jobId));
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Error deleting job");
    }
  };

  const handleInputChange = (jobId: string, field: keyof Job, value: any) => {
    setMyJobs((prev) => prev.map((job) => job._id === jobId ? { ...job, [field]: value } : job));
  };

  const connectionIndicator = (
    <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
      <div style={{ width: 10, height: 10, borderRadius: "50%", backgroundColor: isConnected ? "#22c55e" : "#ef4444" }} />
      <span style={{ fontSize: "0.875rem", color: "#6b7280" }}>{isConnected ? "Live" : "Reconnecting..."}</span>
    </div>
  );

  if (showApplications && selectedJobId) {
    const selectedJob = myJobs.find((job) => job._id === selectedJobId);
    return (
      <div className="myJobs page">
        <div className="container">
          <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: "1rem" }}>{connectionIndicator}</div>
          <button onClick={handleBackToJobs} style={{ marginBottom: "1rem", padding: "0.5rem 1rem", backgroundColor: "#f3f4f6", border: "none", borderRadius: "0.375rem", cursor: "pointer" }}>
            ← Back to Jobs
          </button>
          <h1 style={{ marginBottom: "1.5rem" }}>Applications for: {selectedJob?.title}</h1>
          {applications.length === 0 ? (
            <div style={{ textAlign: "center", padding: "3rem", backgroundColor: "#f9fafb", borderRadius: "0.5rem" }}>
              <p style={{ color: "#6b7280" }}>No applications yet</p>
              <p style={{ color: "#9ca3af", fontSize: "0.875rem", marginTop: "0.5rem" }}>
                {isConnected ? "Waiting for applicants... (Live updates active)" : "Reconnecting to live updates..."}
              </p>
            </div>
          ) : (
            <div>
              {applications.map((app) => (
                <div key={app._id} style={{ backgroundColor: "white", padding: "1.5rem", borderRadius: "0.5rem", boxShadow: "0 1px 3px rgba(0,0,0,0.1)", marginBottom: "1rem", border: "1px solid #e5e7eb" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                    <div>
                      <h3 style={{ fontSize: "1.125rem", fontWeight: 600, marginBottom: "0.5rem" }}>{app.name}</h3>
                      <p>📧 {app.email}</p>
                      <p>📞 {app.phone}</p>
                      <p>📍 {app.address}</p>
                    </div>
                    <span style={{
                      padding: "0.25rem 0.75rem", borderRadius: "9999px", fontSize: "0.875rem", fontWeight: 500,
                      backgroundColor: app.status === "Accepted" ? "#dcfce7" : app.status === "Rejected" ? "#fee2e2" : "#fef9c3",
                      color: app.status === "Accepted" ? "#166534" : app.status === "Rejected" ? "#991b1b" : "#854d0e",
                    }}>
                      {app.status}
                    </span>
                  </div>
                  <p style={{ marginTop: "1rem" }}><span style={{ fontWeight: 500 }}>Cover Letter:</span> {app.coverLetter}</p>
                  {app.resume?.url && (
                    <a href={app.resume.url} target="_blank" rel="noopener noreferrer" style={{ color: "#2563eb", textDecoration: "underline", display: "block", marginTop: "0.75rem" }}>
                      View Resume
                    </a>
                  )}
                  {app.status === "Pending" && (
                    <div style={{ marginTop: "1rem", display: "flex", gap: "0.75rem" }}>
                      <button onClick={() => handleUpdateApplicationStatus(app._id, "Accepted")} style={{ padding: "0.5rem 1.5rem", backgroundColor: "#16a34a", color: "white", border: "none", borderRadius: "0.375rem", cursor: "pointer" }}>Accept</button>
                      <button onClick={() => handleUpdateApplicationStatus(app._id, "Rejected")} style={{ padding: "0.5rem 1.5rem", backgroundColor: "#dc2626", color: "white", border: "none", borderRadius: "0.375rem", cursor: "pointer" }}>Reject</button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="myJobs page">
      <div className="container">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
          <h1>Your Posted Jobs</h1>
          {connectionIndicator}
        </div>
        {myJobs.length > 0 ? (
          <div className="banner">
            {myJobs.map((element) => (
              <div className="card" key={element._id} style={{ position: "relative" }}>
                {jobsWithNewApps.has(element._id) && (
                  <div style={{ position: "absolute", top: 10, right: 10, backgroundColor: "#ef4444", color: "white", padding: "0.25rem 0.75rem", borderRadius: "9999px", fontSize: "0.75rem", fontWeight: "bold", zIndex: 10 }}>
                    NEW APPLICATIONS
                  </div>
                )}
                <div className="content">
                  <div className="short_fields">
                    <div><span>Title:</span><input type="text" disabled={editingMode !== element._id} value={element.title} onChange={(e) => handleInputChange(element._id, "title", e.target.value)} /></div>
                    <div><span>Country:</span><input type="text" disabled={editingMode !== element._id} value={element.country} onChange={(e) => handleInputChange(element._id, "country", e.target.value)} /></div>
                    <div><span>City:</span><input type="text" disabled={editingMode !== element._id} value={element.city} onChange={(e) => handleInputChange(element._id, "city", e.target.value)} /></div>
                    <div>
                      <span>Category:</span>
                      <select value={element.category} onChange={(e) => handleInputChange(element._id, "category", e.target.value)} disabled={editingMode !== element._id}>
                        <option value="Graphics & Design">Graphics & Design</option>
                        <option value="Mobile App Development">Mobile App Development</option>
                        <option value="Frontend Web Development">Frontend Web Development</option>
                        <option value="MERN Stack Development">MERN STACK Development</option>
                        <option value="Account & Finance">Account & Finance</option>
                        <option value="Artificial Intelligence">Artificial Intelligence</option>
                        <option value="Video Animation">Video Animation</option>
                        <option value="MEAN Stack Development">MEAN STACK Development</option>
                        <option value="MEVN Stack Development">MEVN STACK Development</option>
                        <option value="Data Entry Operator">Data Entry Operator</option>
                      </select>
                    </div>
                    <div>
                      <span>Salary:</span>
                      {element.fixedSalary ? (
                        <input type="number" disabled={editingMode !== element._id} value={element.fixedSalary} onChange={(e) => handleInputChange(element._id, "fixedSalary", parseInt(e.target.value) || 0)} />
                      ) : (
                        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                          <input type="number" disabled={editingMode !== element._id} value={element.salaryFrom || ""} onChange={(e) => handleInputChange(element._id, "salaryFrom", parseInt(e.target.value) || 0)} />
                          <span>-</span>
                          <input type="number" disabled={editingMode !== element._id} value={element.salaryTo || ""} onChange={(e) => handleInputChange(element._id, "salaryTo", parseInt(e.target.value) || 0)} />
                        </div>
                      )}
                    </div>
                    <div>
                      <span>Expired:</span>
                      <select value={element.expired ? "true" : "false"} onChange={(e) => handleInputChange(element._id, "expired", e.target.value === "true")} disabled={editingMode !== element._id}>
                        <option value="true">TRUE</option>
                        <option value="false">FALSE</option>
                      </select>
                    </div>
                  </div>
                  <div className="long_field">
                    <div><span>Description:</span><textarea rows={5} value={element.description} disabled={editingMode !== element._id} onChange={(e) => handleInputChange(element._id, "description", e.target.value)} /></div>
                    <div><span>Location:</span><textarea value={element.location} rows={5} disabled={editingMode !== element._id} onChange={(e) => handleInputChange(element._id, "location", e.target.value)} /></div>
                  </div>
                </div>
                <div className="button_wrapper">
                  <div className="edit_btn_wrapper">
                    {editingMode === element._id ? (
                      <>
                        <button onClick={() => handleUpdateJob(element._id)} className="check_btn"><FaCheck /></button>
                        <button onClick={handleDisableEdit} className="cross_btn"><RxCross2 /></button>
                      </>
                    ) : (
                      <button onClick={() => handleEnableEdit(element._id)} className="edit_btn">Edit</button>
                    )}
                  </div>
                  <button onClick={() => handleViewApplications(element._id)} style={{ backgroundColor: "#3b82f6", color: "white", padding: "0.5rem 1rem", border: "none", borderRadius: "0.375rem", cursor: "pointer" }}>
                    View Applications {jobsWithNewApps.has(element._id) && "✨"}
                  </button>
                  <button onClick={() => handleDeleteJob(element._id)} className="delete_btn">Delete</button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p>You haven't posted any jobs yet.</p>
        )}
      </div>
    </div>
  );
};

export default MyJobs;