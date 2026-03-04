import React, { useContext } from "react";
import { Context } from "../../main";
import { Navigate } from "react-router-dom";
import HeroSection from "./HeroSection";
import HowItWorks from "./HowItWorks";

const AuthHome = () => {
  const { isAuthorized, isLoading, user } = useContext(Context);

  if (isLoading) return null;
  if (!isAuthorized) return <Navigate to="/login" />;
  if (user?.role === "Employer") return <Navigate to="/employer/dashboard" />;

  return (
    <section className="homePage page">
      <HeroSection />
      <HowItWorks />
    </section>
  );
};

export default AuthHome;