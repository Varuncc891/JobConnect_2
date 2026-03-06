import API from "../../utils/api";
import React, { useContext, useState } from "react";
import toast from "react-hot-toast";
import { useNavigate, useParams } from "react-router-dom";
import { Context } from "../../main";

interface FormData {
  name: string;
  email: string;
  phone: string;
  address: string;
  coverLetter: string;
}

const Application = () => {
  const [formData, setFormData] = useState<FormData>({ name: "", email: "", phone: "", address: "", coverLetter: "" });
  const [resume, setResume] = useState<File | null>(null);
  const [isParsing, setIsParsing] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [cloudinaryUrl, setCloudinaryUrl] = useState("");
  const [parsedSkills, setParsedSkills] = useState<string[]>([]);

  const { isAuthorized, user } = useContext(Context);
  const navigateTo = useNavigate();
  const { id } = useParams<{ id: string }>();

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] || null;
    if (!file) { setResume(null); return; }

    const allowedTypes = ["application/pdf", "image/png", "image/jpeg", "image/jpg", "image/webp"];
    if (!allowedTypes.includes(file.type)) { toast.error("Please upload a PDF or image file"); return; }
    if (file.size > 5 * 1024 * 1024) { toast.error("File size should be less than 5MB"); return; }

    setResume(file);
    setIsParsing(true);
    toast.loading("🤖 AI is reading your resume...", { id: "parse" });

    const parseFormData = new FormData();
    parseFormData.append("resume", file);

    try {
      const { data } = await API.post("/resume/parse", parseFormData, {
        headers: { "Content-Type": "multipart/form-data" },
        onUploadProgress: (progressEvent: any) => {
          if (progressEvent.total) {
            setUploadProgress(Math.round((progressEvent.loaded * 100) / progressEvent.total));
          }
        },
      });

      setFormData((prev) => ({
        ...prev,
        name: data.parsed.name && data.parsed.name !== "Not found" ? data.parsed.name : prev.name,
        email: data.parsed.email && data.parsed.email !== "Not found" ? data.parsed.email : prev.email,
        phone: data.parsed.phone && data.parsed.phone !== "Not found" ? data.parsed.phone : prev.phone,
        address: data.parsed.address || prev.address,
      }));

      setCloudinaryUrl(data.cloudinary?.url || "");
      setParsedSkills(data.parsed.skills || []);

      const hasName = data.parsed.name && data.parsed.name !== "Not found";
      const hasEmail = data.parsed.email && data.parsed.email !== "Not found";
      const hasPhone = data.parsed.phone && data.parsed.phone !== "Not found";

      if (!hasName && !hasEmail && !hasPhone) {
        toast.error("❌ Couldn't extract data. Please fill manually.", { id: "parse" });
      } else if (hasName && hasEmail && hasPhone) {
        toast.success("✅ Resume parsed! All fields auto-filled.", { id: "parse" });
      } else {
        const filledFields = [hasName && "Name", hasEmail && "Email", hasPhone && "Phone"].filter(Boolean);
        toast.success(`✅ Partially filled: ${filledFields.join(", ")}. Please complete rest.`, { id: "parse", duration: 5000 });
      }

      if (data.parsed.skills?.length > 0) {
        toast.success(`🎯 Skills detected: ${data.parsed.skills.slice(0, 5).join(", ")}`, { duration: 4000 });
      }
    } catch {
      toast.error("❌ Failed to parse resume. Please fill manually.", { id: "parse" });
    } finally {
      setIsParsing(false);
      setUploadProgress(0);
    }
  };

  const handleApplication = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.email || !formData.phone || !formData.address || !formData.coverLetter) {
      toast.error("Please fill in all fields"); return;
    }
    if (!resume) { toast.error("Please upload your resume"); return; }

    const submitFormData = new FormData();
    submitFormData.append("name", formData.name);
    submitFormData.append("email", formData.email);
    submitFormData.append("phone", formData.phone);
    submitFormData.append("address", formData.address);
    submitFormData.append("coverLetter", formData.coverLetter);
    submitFormData.append("resume", resume);
    submitFormData.append("jobId", id!);

    try {
      await API.post("/application/post", submitFormData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      setFormData({ name: "", email: "", phone: "", address: "", coverLetter: "" });
      setResume(null);
      setParsedSkills([]);
      toast.success("🎉 Application submitted successfully!");
      navigateTo("/job/getall");
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Submission failed");
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  if (!isAuthorized || (user && user.role === "Employer")) { navigateTo("/"); return null; }

  return (
    <section className="application page">
      <div className="container">
        <h3>📋 Apply for Job</h3>
        <div className="resume-upload-card">
          <label htmlFor="resume-upload">
            <strong>📄 Upload Resume (PDF or Image)</strong>
            <p className="hint">We'll auto-fill your details using AI ✨</p>
          </label>
          <input id="resume-upload" type="file" accept=".pdf,.png,.jpg,.jpeg,.webp" onChange={handleFileChange} disabled={isParsing} />
          {uploadProgress > 0 && uploadProgress < 100 && (
            <div className="progress-bar">
              <div className="progress-fill" style={{ width: `${uploadProgress}%` }} />
              <span>{uploadProgress}%</span>
            </div>
          )}
          {isParsing && (
            <div className="parsing-status">
              <div className="spinner"></div>
              <p>🔍 AI is reading your resume...</p>
            </div>
          )}
          {!isParsing && cloudinaryUrl && <p className="success-message">✅ Resume uploaded and parsed successfully!</p>}
          {parsedSkills.length > 0 && (
            <div className="skills-detected">
              <p><strong>🎯 Skills detected:</strong></p>
              <div className="skills-tags">
                {parsedSkills.map((skill, index) => <span key={index} className="skill-tag">{skill}</span>)}
              </div>
            </div>
          )}
        </div>

        <form onSubmit={handleApplication}>
          <div className="form-row">
            <input type="text" name="name" placeholder="Full Name *" value={formData.name} onChange={handleInputChange} required className={formData.name ? "auto-filled" : ""} />
            {formData.name && <span className="auto-filled-badge">✨ Auto-filled</span>}
          </div>
          <div className="form-row">
            <input type="email" name="email" placeholder="Email Address *" value={formData.email} onChange={handleInputChange} required className={formData.email ? "auto-filled" : ""} />
          </div>
          <div className="form-row">
            <input type="tel" name="phone" placeholder="Phone Number *" value={formData.phone} onChange={handleInputChange} required className={formData.phone ? "auto-filled" : ""} />
          </div>
          <div className="form-row">
            <input type="text" name="address" placeholder="Your Address *" value={formData.address} onChange={handleInputChange} required className={formData.address ? "auto-filled" : ""} />
          </div>
          <div className="form-row">
            <textarea name="coverLetter" placeholder="Cover Letter *" value={formData.coverLetter} onChange={handleInputChange} required rows={6} />
          </div>
          {Object.values(formData).some((val) => val) && <p className="edit-hint">✎ You can edit any field if needed</p>}
          <button type="submit" disabled={!resume} className="submit-btn">
            {!resume ? "📄 Upload resume first" : "📨 Submit Application"}
          </button>
        </form>
      </div>
    </section>
  );
};

export default Application;