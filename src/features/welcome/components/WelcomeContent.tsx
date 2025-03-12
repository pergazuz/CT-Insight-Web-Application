import { Link } from "react-router-dom";
import CTImage from "../../../assets/logo.svg";

const WelcomeContent = () => {
  return (
    <div className="flex flex-col items-center text-center mb-20">
      <h1 className="text-4xl font-semibold mb-4">Welcome</h1>
      <img src={CTImage} alt="CT Insight" className="mb-4 w-60 h-auto" />
      <h2 className="text-5xl font-bold mb-2">CT Insight</h2>
      <p className="text-gray-700 mb-8">Let's start to find your CT!</p>
      <Link
        to="/synthesis"
        className="flex items-center gap-2 px-6 py-2 bg-[#FD662E] text-white font-semibold rounded-full hover:bg-orange-600 transition-colors shadow-md animate-vibrate hover:animate-none"
      >
        <span>Get Started</span>
      </Link>
    </div>
  );
};

export default WelcomeContent;
