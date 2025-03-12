import { useState, useEffect } from "react";
import LaptopImage from "../../../assets/laptop.png";

const TopNav = () => {
  // State to control whether the main content is expanded (open) or collapsed (closed)
  const [isOpen, setIsOpen] = useState(true);

  // On mount, collapse the content after 1 second
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsOpen(false);
    }, 1000);
    return () => clearTimeout(timer);
  }, []);

  // Expand the content on hover, collapse when not hovered
  const handleMouseEnter = () => setIsOpen(true);
  const handleMouseLeave = () => setIsOpen(false);

  return (
    // Adding a minimum height (min-h-16 equals 64px) ensures the header remains visible and hoverable,
    // even when the content is collapsed.
    <header
      className="relative w-full bg-[#D9D9D9] overflow-hidden min-h-16"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {/* Always visible: Three orange circles at the top-right */}
      <div className="absolute top-4 right-4 flex items-center gap-2 z-10">
        <span className="w-5 h-5 bg-orange-500 rounded-full"></span>
        <span className="w-5 h-5 bg-orange-500 rounded-full"></span>
        <span className="w-5 h-5 bg-orange-500 rounded-full"></span>
      </div>

      {/* Main content container with transition effects */}
      <div
        className={`relative flex flex-col md:flex-row items-center max-w-6xl mx-auto px-4 transition-all duration-1000
          ${
            isOpen
              ? "py-8 md:gap-4 max-h-[500px] opacity-100"
              : "py-0 md:gap-0 max-h-0 opacity-0 overflow-hidden"
          }`}
      >
        {/* Left side: Image */}
        <div className="w-1/3 md:w-1/2 flex justify-start">
          <img
            src={LaptopImage}
            alt="Laptop illustration"
            className="flex-shrink-0 w-1/2 h-auto"
          />
        </div>

        {/* Right side: Text content */}
        <div className="w-full md:w-1/2 text-center md:text-left">
          <h1 className="text-4xl md:text-5xl font-bold mb-2">
            Result
          </h1>
        </div>
      </div>
    </header>
  );
};

export default TopNav;
