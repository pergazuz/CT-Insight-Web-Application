import { useState } from "react";
import { FaArrowRight, FaCaretDown, FaTimes } from "react-icons/fa";
// Import your CT image asset (adjust the path as needed)
import CTImage from "../../../assets/sCBCT.png";

const ResultContent = () => {
  // State to control modal visibility
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Open modal
  const openModal = () => setIsModalOpen(true);
  // Close modal (stop propagation so clicking the close button doesn't trigger the overlay's onClick)
  const closeModal = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsModalOpen(false);
  };

  return (
    <div className="flex justify-center items-center min-h-screen">
      {/* Outer flex container to position the two sections */}
      <div className="flex w-3/4 max-w-4xl gap-4">
        {/* Right side: Processing status */}
        <div className="flex-1 flex flex-col justify-center items-center">
          <p className="text-2xl font-medium mb-2">Here! your sCT image</p>
          <FaArrowRight className="text-orange-500 text-3xl" />
        </div>

        {/* Left side: Display image and download link inside a white card */}
        <div className="flex-1 p-6">
          <div className="max-w-md mx-auto bg-white border rounded-md shadow-md overflow-hidden">
            {/* Top bar with download link */}
            <div className="bg-orange-500 h-12 flex items-center justify-end px-4 text-white">
              <a
                href={CTImage}
                download
                className="flex items-center mr-2 hover:text-gray-200"
              >
                Please save your CT image
              </a>
              <FaCaretDown />
            </div>

            {/* Main content area (preview) */}
            <div className="flex items-center justify-center">
              <img
                src={CTImage}
                alt="CT Image"
                className="max-w-full max-h-full object-contain p-6 rounded-2xl cursor-pointer"
                onClick={openModal}
              />
            </div>

            {/* Bottom label */}
            <div className="text-center py-6 font-medium text-xl">CT image</div>
          </div>
        </div>
      </div>

      {/* Modal overlay */}
      {isModalOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50"
          onClick={closeModal}
        >
          <div className="relative" onClick={(e) => e.stopPropagation()}>
            <img
              src={CTImage}
              alt="Full CT Image"
              className="max-w-full max-h-screen object-contain rounded"
            />
            {/* Close button */}
            <button
              onClick={closeModal}
              className="absolute top-2 right-2 text-white text-3xl"
            >
              <FaTimes />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default ResultContent;
