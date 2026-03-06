import React, { useState, useEffect, useContext, useCallback } from "react";
import { Context } from "../../main";
import { useSSE } from "../../hooks/useSSE";
import API from "../../utils/api";
import toast from "react-hot-toast";
import { Application } from "../../types";
import { useNavigate } from "react-router-dom";

const EmployerDashboard = () => {
  const { isAuthorized, user } = useContext(Context);
  const navigate = useNavigate();
  const [applications, setApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ total: 0, pending: 0, accepted: 0, rejected: 0 });

  const fetchApplications = async () => {
    try {
      setLoading(true);
      const { data } = await API.get("/application/employer/getall");
      setApplications(data.applications);
      setStats({
        total: data.applications.length,
        pending: data.applications.filter((a: Application) => a.status === "Pending").length,
        accepted: data.applications.filter((a: Application) => a.status === "Accepted").length,
        rejected: data.applications.filter((a: Application) => a.status === "Rejected").length,
      });
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Failed to fetch applications");
    } finally {
      setLoading(false);
    }
  };

  const handleSSEMessage = useCallback((data: any) => {
    if (data.type === "NEW_APPLICATION") {
      toast.custom(() => (
        <div style={{ background: "#f0fdf4", borderLeft: "4px solid #22c55e", padding: "1rem", borderRadius: "0.5rem" }}>
          <p style={{ fontWeight: 600 }}>New Application!</p>
          <p>{data.application?.applicantName} applied for {data.application?.jobTitle}</p>
        </div>
      ), { duration: 5000 });
      fetchApplications();
    }
  }, []);

  const { isConnected } = useSSE({
    url: `${import.meta.env.VITE_API_URL}/api/v1/events`,
    onMessage: handleSSEMessage,
  });

  useEffect(() => {
    if (!isAuthorized || user?.role !== "Employer") { navigate("/"); return; }
    fetchApplications();
  }, [isAuthorized, user, navigate]);

  const handleStatusChange = async (applicationId: string, status: "Accepted" | "Rejected") => {
    try {
      await API.put(`/application/status/${applicationId}`, { status });
      toast.success(`Application ${status.toLowerCase()}`);
      fetchApplications();
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Failed to update status");
    }
  };

  if (loading) {
    return (
      <div style={{ display: "flex", justifyContent: "center", alignItems: "center", height: "16rem" }}>
        <p>Loading...</p>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: "1200px", margin: "0 auto", padding: "2rem" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "2rem" }}>
        <h1 style={{ fontSize: "1.875rem", fontWeight: "bold" }}>Employer Dashboard</h1>
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", background: "#f3f4f6", padding: "0.5rem 1rem", borderRadius: "9999px" }}>
          <div style={{ width: 12, height: 12, borderRadius: "50%", backgroundColor: isConnected ? "#22c55e" : "#ef4444" }} />
          <span style={{ fontSize: "0.875rem", color: "#4b5563" }}>{isConnected ? "Live Updates Active" : "Reconnecting..."}</span>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "1.5rem", marginBottom: "2rem" }}>
        {[
          { label: "Total Applications", value: stats.total, color: "#3b82f6" },
          { label: "Pending", value: stats.pending, color: "#f59e0b" },
          { label: "Accepted", value: stats.accepted, color: "#22c55e" },
          { label: "Rejected", value: stats.rejected, color: "#ef4444" },
        ].map((stat) => (
          <div key={stat.label} style={{ background: "white", padding: "1.5rem", borderRadius: "0.5rem", boxShadow: "0 1px 3px rgba(0,0,0,0.1)", borderLeft: `4px solid ${stat.color}` }}>
            <p style={{ fontSize: "0.875rem", color: "#6b7280" }}>{stat.label}</p>
            <p style={{ fontSize: "1.875rem", fontWeight: "bold", color: stat.color }}>{stat.value}</p>
          </div>
        ))}
      </div>

      <div style={{ background: "white", borderRadius: "0.5rem", boxShadow: "0 1px 3px rgba(0,0,0,0.1)", overflow: "hidden" }}>
        <div style={{ padding: "1rem 1.5rem", borderBottom: "1px solid #e5e7eb" }}>
          <h2 style={{ fontSize: "1.25rem", fontWeight: "600" }}>Recent Applications</h2>
        </div>
        {applications.length === 0 ? (
          <div style={{ textAlign: "center", padding: "3rem" }}>
            <p style={{ color: "#6b7280" }}>No applications yet</p>
            <p style={{ fontSize: "0.875rem", color: "#9ca3af", marginTop: "0.5rem" }}>
              {isConnected ? "Waiting for applicants... (Live updates active)" : "Reconnecting to live updates..."}
            </p>
          </div>
        ) : (
          applications.map((app) => (
            <div key={app._id} style={{ padding: "1.5rem", borderBottom: "1px solid #e5e7eb" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                <div style={{ flex: 1 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <h3 style={{ fontSize: "1.125rem", fontWeight: "500" }}>{app.name}</h3>
                    <span style={{
                      padding: "0.25rem 0.75rem", borderRadius: "9999px", fontSize: "0.875rem",
                      backgroundColor: app.status === "Accepted" ? "#dcfce7" : app.status === "Rejected" ? "#fee2e2" : "#fef9c3",
                      color: app.status === "Accepted" ? "#166534" : app.status === "Rejected" ? "#991b1b" : "#854d0e",
                    }}>
                      {app.status}
                    </span>
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.5rem 1rem", marginTop: "0.5rem", fontSize: "0.875rem", color: "#4b5563" }}>
                    <p>📧 {app.email}</p>
                    <p>📞 {app.phone}</p>
                    <p style={{ gridColumn: "1 / -1" }}>📍 {app.address}</p>
                  </div>
                  <p style={{ marginTop: "0.75rem", fontSize: "0.875rem", color: "#374151" }}>
                    <span style={{ fontWeight: "500" }}>Cover Letter:</span> {app.coverLetter}
                  </p>
                  {app.resume?.url && (
                    <a href={app.resume.url} target="_blank" rel="noopener noreferrer" style={{ display: "block", marginTop: "0.75rem", color: "#2563eb", fontSize: "0.875rem" }}>
                      📎 View Resume
                    </a>
                  )}
                  {app.status === "Pending" && (
                    <div style={{ display: "flex", gap: "0.75rem", marginTop: "1rem" }}>
                      <button onClick={() => handleStatusChange(app._id, "Accepted")} style={{ padding: "0.5rem 1rem", background: "#16a34a", color: "white", border: "none", borderRadius: "0.375rem", cursor: "pointer" }}>Accept</button>
                      <button onClick={() => handleStatusChange(app._id, "Rejected")} style={{ padding: "0.5rem 1rem", background: "#dc2626", color: "white", border: "none", borderRadius: "0.375rem", cursor: "pointer" }}>Reject</button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default EmployerDashboard;