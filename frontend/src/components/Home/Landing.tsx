import React, { useContext } from "react";
import { Link, Navigate } from "react-router-dom";
import { Context } from "../../main";

const Landing = () => {
  const { isAuthorized, isLoading } = useContext(Context);

  if (isLoading) return null;

  if (isAuthorized) {
    return <Navigate to="/home" />;
  }

  return (
    <div className="landingPage">
      <div className="landingContent">
        <h1>JobConnect</h1>
        <p>Find a job that suits you</p>
        <div className="landingButtons">
          <Link to="/login">Login</Link>
          <Link to="/register">Register</Link>
        </div>
      </div>
    </div>
  );
};

export default Landing;