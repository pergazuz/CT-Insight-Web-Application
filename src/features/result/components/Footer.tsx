import { Link } from "react-router-dom";
import { FaRetweet } from "react-icons/fa";

const Footer = () => {
  return (
    <nav className="fixed bottom-0 left-0 w-full bg-[#FD662E] shadow-md py-2 flex justify-end items-center border-t border-gray-200 px-4">
      <Link to="/synthesis" className="flex items-center gap-2">
        <FaRetweet className="text-white text-3xl" />
        <span className="text-white font-semibold">Restart CT Insight</span>
      </Link>
    </nav>
  );
};

export default Footer;
