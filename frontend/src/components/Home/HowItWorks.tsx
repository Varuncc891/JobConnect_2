import React from "react";
import { FaUserPlus } from "react-icons/fa";
import { MdFindInPage } from "react-icons/md";
import { IoMdSend } from "react-icons/io";

const HowItWorks = () => {
  return (
    <div className="howitworks">
      <div className="container">
        <h3>How Career Connect Works</h3>
        <div className="banner">
          <div className="card">
            <FaUserPlus />
            <p>Create Account</p>
            <p>Sign up with your username, password, email, and phone number to get started.</p>
          </div>
          <div className="card">
            <MdFindInPage />
            <p>Find a Job/Post a Job</p>
            <p>Browse jobs, choose your relevancy, and take the next step in your career effortlessly.</p>
          </div>
          <div className="card">
            <IoMdSend />
            <p>Apply For Job/Recruit Suitable Candidates</p>
            <p>Apply to jobs that fit you or find the right candidates—quickly and easily.</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default HowItWorks;