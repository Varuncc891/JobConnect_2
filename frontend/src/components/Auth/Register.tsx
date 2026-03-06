import React, { useContext, useState } from "react";
import { FaRegUser } from "react-icons/fa";
import { MdOutlineMailOutline } from "react-icons/md";
import { RiLock2Fill } from "react-icons/ri";
import { FaPencilAlt } from "react-icons/fa";
import { FaPhoneFlip } from "react-icons/fa6";
import { Link, Navigate } from "react-router-dom";
import API from "../../utils/api";
import toast from "react-hot-toast";
import { Context } from "../../main";
import Footer from "../Layout/Footer";

const EMPLOYER_PIN = "1234";

const Register = () => {
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("");
  const [showPinModal, setShowPinModal] = useState(false);
  const [pinInput, setPinInput] = useState("");
  const [pinVerified, setPinVerified] = useState(false);

  const { isAuthorized, setIsAuthorized, isLoading } = useContext(Context);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (role === "Employer" && !pinVerified) {
      setShowPinModal(true);
      return;
    }
    try {
      const { data } = await API.post(
        "/user/register",
        { name, phone, email, role, password }
      );
      toast.success(data.message);
      setName("");
      setEmail("");
      setPassword("");
      setPhone("");
      setRole("");
      setPinVerified(false);
      setIsAuthorized(true);
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Registration failed");
    }
  };

  const handlePinSubmit = () => {
    if (pinInput === EMPLOYER_PIN) {
      setPinVerified(true);
      setShowPinModal(false);
      setPinInput("");
      toast.success("PIN verified! You can now register as Employer.");
    } else {
      toast.error("Incorrect PIN. Please try again.");
      setPinInput("");
    }
  };

  if (isLoading) return null;
  if (isAuthorized) return <Navigate to="/home" />;

  return (
    <div className="registerPage">
      <header className="registerHeader">
        <h1>JobConnect</h1>
      </header>
      <div className="registerImage">
        <img src="/loginpage.png" alt="Login" />
      </div>
      <section className="registerSection">
        <div className="registerContent">
          <div className="registerBox">
            <div className="registerHeader">
              <h3>Create a new account</h3>
            </div>
            <form onSubmit={handleRegister}>
              <div className="inputTag">
                <label>Register As</label>
                <div>
                  <select value={role} onChange={(e) => { setRole(e.target.value); setPinVerified(false); }}>
                    <option value="">Select Role</option>
                    <option value="Employer">Employer</option>
                    <option value="Job Seeker">Job Seeker</option>
                  </select>
                  <FaRegUser />
                </div>
              </div>
              <div className="inputTag">
                <label>Name</label>
                <div>
                  <input type="text" placeholder="Enter your name" value={name} onChange={(e) => setName(e.target.value)} />
                  <FaPencilAlt />
                </div>
              </div>
              <div className="inputTag">
                <label>Email Address</label>
                <div>
                  <input type="email" placeholder="Enter your email" value={email} onChange={(e) => setEmail(e.target.value)} />
                  <MdOutlineMailOutline />
                </div>
              </div>
              <div className="inputTag">
                <label>Phone Number</label>
                <div>
                  <input type="number" placeholder="Enter your phone" value={phone} onChange={(e) => setPhone(e.target.value)} />
                  <FaPhoneFlip />
                </div>
              </div>
              <div className="inputTag">
                <label>Password</label>
                <div>
                  <input type="password" placeholder="Enter your password" value={password} onChange={(e) => setPassword(e.target.value)} />
                  <RiLock2Fill />
                </div>
              </div>
              {role === "Employer" && pinVerified && (
                <p style={{ color: "#059669", fontWeight: "600", fontSize: "14px", background: "#d1fae5", padding: "8px 12px", borderRadius: "8px" }}>
                  ✅ Employer PIN verified
                </p>
              )}
              <button type="submit">Register</button>
              <Link to="/login">Login Now</Link>
            </form>
          </div>
        </div>
      </section>

      {showPinModal && (
        <div className="pinModalOverlay">
          <div className="pinModal">
            <h3>Employer Verification</h3>
            <p>Enter the employer access PIN to register as an Employer.</p>
            <input
              type="password"
              placeholder="Enter PIN"
              value={pinInput}
              onChange={(e) => setPinInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handlePinSubmit()}
              autoFocus
            />
            <div className="pinModalButtons">
              <button onClick={handlePinSubmit} className="pinConfirmBtn">Confirm</button>
              <button onClick={() => { setShowPinModal(false); setPinInput(""); }} className="pinCancelBtn">Cancel</button>
            </div>
          </div>
        </div>
      )}
      <Footer />
    </div>
  );
};

export default Register;