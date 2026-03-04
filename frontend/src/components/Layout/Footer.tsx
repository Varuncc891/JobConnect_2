import { useContext } from "react";
import { Context } from "../../main";
import { Link } from "react-router-dom";
import { FaGithub, FaLinkedin } from "react-icons/fa";
import { SiLeetcode } from "react-icons/si";

const Footer = () => {
  const { isAuthorized } = useContext(Context);

  return (
    <footer className={isAuthorized ? "footerShow" : "footerHide"}>
      <div>Open for learning and collaboration</div>
      <div>
        <Link to="https://github.com/Varuncc891" target="github"><FaGithub /></Link>
        <Link to="https://leetcode.com/u/varunlce4513/" target="leetcode"><SiLeetcode /></Link>
        <Link to="https://www.linkedin.com/in/varun-mandava-3b8750235/" target="linkedin"><FaLinkedin /></Link>
      </div>
    </footer>
  );
};

export default Footer;