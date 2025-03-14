import { useState, useEffect, useRef, FC } from "react";
import LaptopImage from "../../../assets/laptop.png";

const TopNav: FC = () => {
  const [isOpen, setIsOpen] = useState<boolean>(true);
  const initialTimerRef = useRef<NodeJS.Timeout | null>(null);
  const hoverTimerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    // Initial auto-close after 1 second
    initialTimerRef.current = setTimeout(() => {
      setIsOpen(false);
    }, 1000);

    return () => {
      // Cleanup timers on unmount
      initialTimerRef.current && clearTimeout(initialTimerRef.current);
      hoverTimerRef.current && clearTimeout(hoverTimerRef.current);
    };
  }, []);

  const handleMouseEnter = () => {
    // Clear initial close timer if still pending
    initialTimerRef.current && clearTimeout(initialTimerRef.current);
    
    // Only set timer if content is closed
    if (!isOpen) {
      hoverTimerRef.current = setTimeout(() => {
        setIsOpen(true);
      }, 3000);
    }
  };

  const handleMouseLeave = () => {
    // Clear any pending hover timer
    hoverTimerRef.current && clearTimeout(hoverTimerRef.current);
    
    // Close immediately
    if (isOpen) {
      setIsOpen(false);
    }
  };

  return (
    <header
      className="relative w-full bg-[#D9D9D9] overflow-hidden min-h-16"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {/* Orange indicator circles */}
      <div className="absolute top-4 right-4 flex items-center gap-2 z-10">
        {[...Array(3)].map((_, i) => (
          <span 
            key={i}
            className="w-5 h-5 bg-orange-500 rounded-full"
          />
        ))}
      </div>

      {/* Collapsible content */}
      <div
        className={`relative flex flex-col md:flex-row items-center max-w-6xl mx-auto px-4 transition-all duration-1000 ${
          isOpen
            ? "py-8 md:gap-4 max-h-[500px] opacity-100"
            : "py-0 md:gap-0 max-h-0 opacity-0 overflow-hidden"
        }`}
      >
        {/* Image section */}
        <div className="w-1/3 md:w-1/2 flex justify-start">
          <img
            src={LaptopImage}
            alt="Laptop illustration"
            className="flex-shrink-0 w-1/2 h-auto"
          />
        </div>

        {/* Text content */}
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