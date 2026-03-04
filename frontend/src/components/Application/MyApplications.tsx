import React, { useContext, useEffect, useState, useCallback } from "react";
import { Context } from "../../main";
import toast from "react-hot-toast";
import { useNavigate } from "react-router-dom";
import ResumeModal from "./ResumeModal";
import { Application } from "../../types";
import API from "../../utils/api";
import { useSSE } from "../../hooks/useSSE";

const MyApplications = () => {
  const { user, isAuthorized } = useContext(Context);
  const [applications, setApplications] = useState<Application[]>([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [resumeImageUrl, setResumeImageUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const navigateTo = useNavigate();

  const fetchApplications = useCallback(async () => {
    setLoading(true);
    try {
      if (user && user.role === "Employer") {
        const { data } = await API.get("/application/employer/getall");
        setApplications(data.applications);
      } else {
        const { data } = await API.get("/application/jobseeker/getall");
        setApplications(data.applications);
      }
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Failed to fetch applications");
    } finally {
      setLoading(false);
    }
  }, [user]);

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
  }, [fetchApplications]);

  const { isConnected } = useSSE({
    url: "http://localhost:4000/api/v1/events",
    onMessage: handleSSEMessage,
    autoConnect: user?.role === "Employer",
  });

  useEffect(() => {
    if (isAuthorized) fetchApplications();
  }, [isAuthorized, fetchApplications]);

  if (!isAuthorized) { navigateTo("/"); return null; }

  const deleteApplication = async (id: string) => {
    try {
      const { data } = await API.delete(`/application/delete/${id}`);
      toast.success(data.message);
      setApplications((prev) => prev.filter((app) => app._id !== id));
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Failed to delete application");
    }
  };

  const updateStatus = async (id: string, status: "Accepted" | "Rejected") => {
    try {
      const { data } = await API.put(`/application/status/${id}`, { status });
      toast.success(data.message);
      setApplications((prev) => prev.map((app) => app._id === id ? { ...app, status } : app));
    } catch (error: any) {
      toast.error(error.response?.data?.message || `Failed to ${status.toLowerCase()} application`);
    }
  };

  const handleResumeClick = (url: string) => window.open(url, "_blank");
  const closeModal = () => setModalOpen(false);

  const statusOrder: { [key: string]: number } = { Pending: 1, Accepted: 2, Rejected: 3 };
  const sortedApplications = [...applications].sort((a, b) => statusOrder[a.status || "Pending"] - statusOrder[b.status || "Pending"]);

  const styles = {
    page: { padding: "2rem", backgroundColor: "#f8f9fa", minHeight: "calc(100vh - 80px)" },
    container: { maxWidth: "1200px", margin: "0 auto" },
    heading: { textAlign: "center" as const, color: "#333", marginBottom: "2rem" },
    card: { background: "white", borderRadius: "8px", padding: "1.5rem", marginBottom: "1.5rem", boxShadow: "0 2px 4px rgba(0,0,0,0.1)", display: "grid", gridTemplateColumns: "1fr auto", gap: "1.5rem", position: "relative" as const, borderLeft: "4px solid", transition: "opacity 0.3s" },
    pendingCard: { borderLeftColor: "#ffc107" },
    acceptedCard: { borderLeftColor: "#28a745" },
    rejectedCard: { borderLeftColor: "#dc3545", opacity: 0.8 },
    statusBadge: { position: "absolute" as const, top: "1rem", right: "1rem", padding: "0.25rem 0.75rem", borderRadius: "20px", fontSize: "0.875rem", fontWeight: "600" as const },
    pendingBadge: { backgroundColor: "#fff3cd", color: "#856404" },
    acceptedBadge: { backgroundColor: "#d4edda", color: "#155724" },
    rejectedBadge: { backgroundColor: "#f8d7da", color: "#721c24" },
    detail: { gridColumn: 1 },
    detailText: { margin: "0.5rem 0", lineHeight: "1.6" },
    label: { fontWeight: "600" as const, color: "#495057", minWidth: "100px", display: "inline-block" },
    resume: { gridColumn: 2, width: "120px", height: "160px", cursor: "pointer", border: "2px solid #dee2e6", borderRadius: "4px", overflow: "hidden" as const },
    resumeImg: { width: "100%", height: "100%", objectFit: "cover" as const, transition: "transform 0.2s" },
    actionButtons: { gridColumn: "1 / -1", display: "flex", gap: "1rem", justifyContent: "flex-start", marginTop: "1rem" },
    button: { padding: "0.5rem 1.5rem", border: "none", borderRadius: "4px", fontSize: "0.875rem", fontWeight: "500" as const, cursor: "pointer", transition: "all 0.2s" },
    acceptBtn: { backgroundColor: "#28a745", color: "white" },
    rejectBtn: { backgroundColor: "#dc3545", color: "white" },
    disabledBtn: { opacity: 0.6, cursor: "not-allowed" },
    messageBox: { padding: "0.75rem", borderRadius: "4px", fontWeight: "500" as const, marginTop: "1rem" },
    successMessage: { backgroundColor: "#d4edda", color: "#155724" },
    errorMessage: { backgroundColor: "#f8d7da", color: "#721c24" },
    emptyState: { textAlign: "center" as const, color: "#666", padding: "3rem" },
  };

  if (loading) {
    return (
      <section style={styles.page}>
        <div style={styles.container}>
          <div style={styles.emptyState}><h2>Loading applications...</h2></div>
        </div>
      </section>
    );
  }

  return (
    <section style={styles.page}>
      {user && user.role === "Job Seeker" ? (
        <div style={styles.container}>
          <h1 style={styles.heading}>My Applications</h1>
          {applications.length <= 0 ? (
            <div style={styles.emptyState}><h4>No Applications Found</h4></div>
          ) : (
            sortedApplications.map((element) => (
              <JobSeekerCard key={element._id} element={element} deleteApplication={deleteApplication} openModal={handleResumeClick} styles={styles} />
            ))
          )}
        </div>
      ) : (
        <div style={styles.container}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
            <h2 style={styles.heading}>Applications From Job Seekers</h2>
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", background: "#f1f1f1", padding: "0.4rem 1rem", borderRadius: "20px" }}>
              <div style={{ width: 10, height: 10, borderRadius: "50%", backgroundColor: isConnected ? "#28a745" : "#dc3545" }} />
              <span style={{ fontSize: "0.85rem", color: "#555" }}>{isConnected ? "Live Updates Active" : "Reconnecting..."}</span>
            </div>
          </div>
          {applications.length <= 0 ? (
            <div style={styles.emptyState}><h5>No Applications Found</h5></div>
          ) : (
            sortedApplications.map((element) => (
              <EmployerCard key={element._id} element={element} openModal={handleResumeClick} updateStatus={updateStatus} styles={styles} />
            ))
          )}
        </div>
      )}
      {modalOpen && <ResumeModal imageUrl={resumeImageUrl} onClose={closeModal} />}
    </section>
  );
};

export default MyApplications;

interface JobSeekerCardProps {
  element: Application;
  deleteApplication: (id: string) => void;
  openModal: (url: string) => void;
  styles: any;
}

const JobSeekerCard: React.FC<JobSeekerCardProps> = ({ element, deleteApplication, openModal, styles }) => {
  const status = element.status || "Pending";

  const getCardStyle = () => {
    if (status === "Accepted") return { ...styles.card, ...styles.acceptedCard };
    if (status === "Rejected") return { ...styles.card, ...styles.rejectedCard };
    return { ...styles.card, ...styles.pendingCard };
  };

  const getBadgeStyle = () => {
    if (status === "Accepted") return { ...styles.statusBadge, ...styles.acceptedBadge };
    if (status === "Rejected") return { ...styles.statusBadge, ...styles.rejectedBadge };
    return { ...styles.statusBadge, ...styles.pendingBadge };
  };

  return (
    <div style={getCardStyle()}>
      <div style={getBadgeStyle()}>
        {status === "Accepted" && "✅ Accepted"}
        {status === "Rejected" && "❌ Rejected"}
        {status === "Pending" && "⏳ Pending"}
      </div>
      <div style={styles.detail}>
        <p style={styles.detailText}><span style={styles.label}>Name:</span> {element.name}</p>
        <p style={styles.detailText}><span style={styles.label}>Email:</span> {element.email}</p>
        <p style={styles.detailText}><span style={styles.label}>Phone:</span> {element.phone}</p>
        <p style={styles.detailText}><span style={styles.label}>Address:</span> {element.address}</p>
        <p style={styles.detailText}><span style={styles.label}>Cover Letter:</span> {element.coverLetter.substring(0, 100)}...</p>
      </div>
      <div style={styles.resume} onClick={() => openModal(element.resume.url)}>
        {element.resume.url.toLowerCase().includes(".pdf") ? (
          <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", backgroundColor: "#f8f9fa" }}>
            <span style={{ fontSize: "2rem" }}>📄</span>
            <p style={{ fontSize: "0.75rem", color: "#666" }}>Click to view PDF</p>
          </div>
        ) : (
          <img src={element.resume.url} alt="resume" style={styles.resumeImg}
            onMouseEnter={(e) => e.currentTarget.style.transform = "scale(1.05)"}
            onMouseLeave={(e) => e.currentTarget.style.transform = "scale(1)"}
          />
        )}
      </div>
      <div style={styles.actionButtons}>
        {status === "Pending" && (
          <button style={{ ...styles.button, ...styles.rejectBtn }} onClick={() => deleteApplication(element._id)}>Delete Application</button>
        )}
        {status === "Accepted" && <div style={{ ...styles.messageBox, ...styles.successMessage }}>🎉 Congratulations! The employer accepted your application.</div>}
        {status === "Rejected" && <div style={{ ...styles.messageBox, ...styles.errorMessage }}>😔 This application was not selected. Keep trying!</div>}
      </div>
    </div>
  );
};

interface EmployerCardProps {
  element: Application;
  openModal: (url: string) => void;
  updateStatus: (id: string, status: "Accepted" | "Rejected") => void;
  styles: any;
}

const EmployerCard: React.FC<EmployerCardProps> = ({ element, openModal, updateStatus, styles }) => {
  const status = element.status || "Pending";
  const [updating, setUpdating] = useState(false);

  const handleStatusUpdate = async (newStatus: "Accepted" | "Rejected") => {
    setUpdating(true);
    await updateStatus(element._id, newStatus);
    setUpdating(false);
  };

  const getCardStyle = () => {
    if (status === "Accepted") return { ...styles.card, ...styles.acceptedCard };
    if (status === "Rejected") return { ...styles.card, ...styles.rejectedCard };
    return { ...styles.card, ...styles.pendingCard };
  };

  const getBadgeStyle = () => {
    if (status === "Accepted") return { ...styles.statusBadge, ...styles.acceptedBadge };
    if (status === "Rejected") return { ...styles.statusBadge, ...styles.rejectedBadge };
    return { ...styles.statusBadge, ...styles.pendingBadge };
  };

  return (
    <div style={getCardStyle()}>
      <div style={getBadgeStyle()}>
        {status === "Accepted" && "✅ Accepted"}
        {status === "Rejected" && "❌ Rejected"}
        {status === "Pending" && "⏳ Pending Review"}
      </div>
      <div style={styles.detail}>
        <p style={styles.detailText}><span style={styles.label}>Name:</span> {element.name}</p>
        <p style={styles.detailText}><span style={styles.label}>Email:</span> {element.email}</p>
        <p style={styles.detailText}><span style={styles.label}>Phone:</span> {element.phone}</p>
        <p style={styles.detailText}><span style={styles.label}>Address:</span> {element.address}</p>
        <p style={styles.detailText}><span style={styles.label}>Cover Letter:</span> {element.coverLetter.substring(0, 100)}...</p>
      </div>
      <div style={styles.resume} onClick={() => openModal(element.resume.url)}>
        {element.resume.url.toLowerCase().includes(".pdf") ? (
          <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", backgroundColor: "#f8f9fa" }}>
            <span style={{ fontSize: "2rem" }}>📄</span>
            <p style={{ fontSize: "0.75rem", color: "#666" }}>Click to view PDF</p>
          </div>
        ) : (
          <img src={element.resume.url} alt="resume" style={styles.resumeImg}
            onMouseEnter={(e) => e.currentTarget.style.transform = "scale(1.05)"}
            onMouseLeave={(e) => e.currentTarget.style.transform = "scale(1)"}
          />
        )}
      </div>
      {status === "Pending" && (
        <div style={styles.actionButtons}>
          <button style={{ ...styles.button, ...styles.acceptBtn, ...(updating ? styles.disabledBtn : {}) }} onClick={() => handleStatusUpdate("Accepted")} disabled={updating}>
            {updating ? "Processing..." : "✓ Accept"}
          </button>
          <button style={{ ...styles.button, ...styles.rejectBtn, ...(updating ? styles.disabledBtn : {}) }} onClick={() => handleStatusUpdate("Rejected")} disabled={updating}>
            {updating ? "Processing..." : "✗ Reject"}
          </button>
        </div>
      )}
      {status === "Accepted" && <div style={{ ...styles.actionButtons, ...styles.messageBox, ...styles.successMessage }}>✅ You accepted this application</div>}
      {status === "Rejected" && <div style={{ ...styles.actionButtons, ...styles.messageBox, ...styles.errorMessage }}>❌ You rejected this application</div>}
    </div>
  );
};