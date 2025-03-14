import { useState, useEffect, useRef, FC } from "react";
import LaptopImage from "../../../assets/laptop.png";

const TopNav: FC = () => {
  const [isOpen, setIsOpen] = useState<boolean>(true);
  const initialTimerRef = useRef<NodeJS.Timeout | null>(null);
  const hoverTimerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    initialTimerRef.current = setTimeout(() => {
      setIsOpen(false);
    }, 1000);

    return () => {
      initialTimerRef.current && clearTimeout(initialTimerRef.current);
      hoverTimerRef.current && clearTimeout(hoverTimerRef.current);
    };
  }, []);

  const handleMouseEnter = () => {
    initialTimerRef.current && clearTimeout(initialTimerRef.current);
    
    if (!isOpen) {
      hoverTimerRef.current && clearTimeout(hoverTimerRef.current);
      hoverTimerRef.current = setTimeout(() => {
        setIsOpen(true);
      }, 2000);
    }
  };

  const handleMouseLeave = () => {
    hoverTimerRef.current && clearTimeout(hoverTimerRef.current);
    setIsOpen(false);
  };

  return (
    <header
      className="relative w-full bg-[#D9D9D9] overflow-hidden min-h-16"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <div className="absolute top-4 right-4 flex items-center gap-2 z-10">
        <span className="w-5 h-5 bg-orange-500 rounded-full"></span>
        <span className="w-5 h-5 bg-orange-500 rounded-full"></span>
        <span className="w-5 h-5 bg-orange-500 rounded-full"></span>
      </div>

      <div
        className={`relative flex flex-col md:flex-row items-center max-w-6xl mx-auto px-4 transition-all duration-1000 ${
          isOpen
            ? "py-8 md:gap-4 max-h-[500px] opacity-100"
            : "py-0 md:gap-0 max-h-0 opacity-0 overflow-hidden"
        }`}
      >
        <div className="w-1/3 md:w-1/2 flex justify-start">
          <img
            src={LaptopImage}
            alt="Laptop illustration"
            className="flex-shrink-0 w-1/2 h-auto"
          />
        </div>

        <div className="w-full md:w-1/2 text-center md:text-left">
          <h1 className="text-xl md:text-3xl font-bold mb-2">
            Cone Beam Computed Tomography,
          </h1>
          <p className="text-md md:text-base text-gray-800">
            which is a medical imaging technique that generates 3D images of structures within the body.
          </p>
        </div>
      </div>
    </header>
  );
};

export default TopNav;