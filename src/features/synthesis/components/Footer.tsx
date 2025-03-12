import { Link } from "react-router-dom";

const Footer = () => {
  return (
    <nav className="fixed bottom-0 left-0 w-full bg-[#FD662E] shadow-md py-2 flex justify-end border-t border-gray-200 px-4">
      <Link to="/" className="text-white font-semibold mr-4">
      <div className="text-white font-semibold">CT Insight</div>
      </Link>
    </nav>
  );
};

export default Footer;
