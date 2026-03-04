import React, { useContext } from "react";
import { Context } from "../../main";
import { Navigate } from "react-router-dom";
import { Link } from "react-router-dom";
import HeroSection from "./HeroSection";
import HowItWorks from "./HowItWorks";

const Home = () => {
  const { isAuthorized, isLoading } = useContext(Context);

  if (isLoading) return null;
  if (isAuthorized) return <Navigate to="/home" />;

  return (
    <div>
      <div className="landingHero">
        <div className="landingHeroContent">
          <h1>JobConnect</h1>
          <p>Find a job that suits your interests and skills</p>
          <div className="landingHeroButtons">
            <Link to="/login" className="landingBtn loginBtn">Login</Link>
            <Link to="/register" className="landingBtn registerBtn">Register</Link>
          </div>
        </div>
      </div>
      <HeroSection />
      <HowItWorks />
    </div>
  );
};

export default Home;