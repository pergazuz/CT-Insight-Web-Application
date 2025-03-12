import React, { useState, useEffect, useRef } from "react";
import { FaCaretRight, FaImage, FaSpinner } from "react-icons/fa";
import { useNavigate } from "react-router-dom";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

// Import Cornerstone libraries for DICOM rendering
import cornerstone from "cornerstone-core";
import cornerstoneWADOImageLoader from "cornerstone-wado-image-loader";
import dicomParser from "dicom-parser";

// Configure the WADO Image Loader for Cornerstone
cornerstoneWADOImageLoader.external.dicomParser = dicomParser;
cornerstoneWADOImageLoader.configure({});

const ResultContent = () => {
  // State for selected files (supports folder uploads)
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  // Array of object URLs for previewing the files
  const [previewUrls, setPreviewUrls] = useState<string[]>([]);
  // Current index for the slider preview
  const [currentIndex, setCurrentIndex] = useState(0);
  // State for tracking drag events
  const [isDragging, setIsDragging] = useState(false);
  // State for processing/loading animation
  const [isLoading, setIsLoading] = useState(false);
  // State to toggle the preview view
  const [showPreview, setShowPreview] = useState(false);
  // Ref for the hidden file input
  const fileInputRef = useRef<HTMLInputElement>(null);
  // Ref for the DICOM rendering element (Cornerstone requires a DOM element)
  const dicomElementRef = useRef<HTMLDivElement>(null);
  // React Router's navigation hook
  const navigate = useNavigate();

  /**
   * Generate object URLs for each uploaded file.
   * Reset slider index and clean up URLs when files change.
   */
  useEffect(() => {
    if (selectedFiles.length > 0) {
      const urls = selectedFiles.map((file) => URL.createObjectURL(file));
      setPreviewUrls(urls);
      setCurrentIndex(0);
      return () => urls.forEach((url) => URL.revokeObjectURL(url));
    } else {
      setPreviewUrls([]);
    }
  }, [selectedFiles]);

  /**
   * When a DICOM file is to be previewed, load and render it using Cornerstone.
   */
  useEffect(() => {
    if (
      showPreview &&
      selectedFiles.length > 0 &&
      selectedFiles[currentIndex].name.toLowerCase().endsWith(".dcm") &&
      dicomElementRef.current
    ) {
      const imageId = "wadouri:" + previewUrls[currentIndex];
      // Enable the element for Cornerstone rendering
      cornerstone.enable(dicomElementRef.current);
      // Load the DICOM image and display it
      cornerstone
        .loadImage(imageId)
        .then((image) => {
          if (dicomElementRef.current) {
            cornerstone.displayImage(dicomElementRef.current, image);
          }
        })
        .catch((err) => {
          console.error(err);
          toast.error("Failed to load DICOM image");
        });
    }
  }, [showPreview, currentIndex, selectedFiles, previewUrls]);

  /**
   * Handle file drop events by converting FileList into an array.
   */
  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      setSelectedFiles(Array.from(files));
    }
  };

  /**
   * Allow dropping by preventing default behavior and updating drag state.
   */
  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(true);
  };

  /**
   * Reset the drag state when leaving the drop zone.
   */
  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
  };

  /**
   * Handle changes from the file input (supports folder uploads).
   */
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setSelectedFiles(Array.from(e.target.files));
    }
  };

  /**
   * Trigger the file input when the drop zone is clicked.
   */
  const handleZoneClick = () => {
    fileInputRef.current?.click();
  };

  /**
   * Process the files when the arrow button is clicked.
   */
  const handleArrowClick = () => {
    if (selectedFiles.length === 0) {
      toast.error("Please upload DICOM files!");
      return;
    }
    setIsLoading(true);
    // Simulate a delay before navigation
    setTimeout(() => {
      navigate("/result");
    }, 2000);
  };

  /**
   * Toggle the preview view.
   */
  const handlePreviewToggle = () => {
    setShowPreview((prev) => !prev);
  };

  /**
   * Navigate to the next image in the slider.
   */
  const handleNext = () => {
    if (previewUrls.length > 0) {
      setCurrentIndex((prevIndex) => (prevIndex + 1) % previewUrls.length);
    }
  };

  /**
   * Navigate to the previous image in the slider.
   */
  const handlePrev = () => {
    if (previewUrls.length > 0) {
      setCurrentIndex(
        (prevIndex) => (prevIndex - 1 + previewUrls.length) % previewUrls.length
      );
    }
  };

  return (
    <div className="flex flex-col items-center min-h-screen">
      {/* Main container for upload and processing sections */}
      <div className="flex w-3/4 max-w-4xl gap-4 mt-8">
        {/* Left side: Upload/Preview section */}
        <div className="flex-1 bg-white shadow-xl rounded-lg p-6">
          <div className="flex flex-col items-center justify-center">
            {/* Drop zone */}
            <div
              className={`w-full h-96 flex items-center justify-center border-2 border-dashed rounded-lg p-4 transition-colors cursor-pointer ${
                isDragging ? "border-blue-400" : "border-gray-300"
              }`}
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onClick={handleZoneClick}
            >
              {/* Hidden file input supporting folder selection */}
              <input
                type="file"
                ref={fileInputRef}
                className="hidden"
                accept="image/*,.dcm"
                webkitdirectory="true"
                directory="true"
                multiple
                onChange={handleFileChange}
              />
              {/* If a single non-DICOM file is selected, show its preview */}
              {previewUrls.length === 1 &&
              !selectedFiles[0].name.toLowerCase().endsWith(".dcm") ? (
                <img
                  src={previewUrls[0]}
                  alt="Preview"
                  className="w-full h-full object-cover rounded"
                />
              ) : (
                <FaImage className="text-gray-400 text-6xl" />
              )}
            </div>
            <h2 className="text-md font-semibold mt-4">
              Please upload the CBCT DICOM files or folder
            </h2>
          </div>
        </div>

        {/* Right side: Processing status and actions */}
        <div className="flex-1 flex flex-col justify-center items-center">
          {isLoading ? (
            <>
              <p className="text-2xl font-medium mb-2">Processing ...</p>
              <p className="text-gray-600 mb-4">Please wait for your CT</p>
            </>
          ) : selectedFiles.length > 0 ? (
            <>
              <p className="text-2xl font-medium mb-2">
                {selectedFiles.length === 1
                  ? "CT Image Uploaded"
                  : "CT Images Uploaded"}
              </p>
              <p className="text-gray-600 mb-4">Ready to process your CT</p>
            </>
          ) : (
            <>
              <p className="text-2xl font-medium mb-2">Awaiting CT Image</p>
              <p className="text-gray-600 mb-4">
                Please upload your CT image or folder
              </p>
            </>
          )}
          <div className="flex flex-col items-center">
            <button onClick={handleArrowClick} className="focus:outline-none">
              {isLoading ? (
                <FaSpinner className="text-orange-500 text-6xl animate-spin" />
              ) : (
                <FaCaretRight className="text-orange-500 text-6xl" />
              )}
            </button>
            {selectedFiles.length > 0 && (
              <button
                onClick={handlePreviewToggle}
                className="mt-4 px-4 py-2 bg-blue-500 text-white rounded focus:outline-none"
              >
                {showPreview ? "Hide Preview" : "Preview DICOM Files"}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Preview section: Slider for images */}
      {showPreview && previewUrls.length > 0 && (
        <div className="mt-6 w-3/4 max-w-4xl bg-gray-100 p-4 rounded shadow-md">
          <h3 className="text-lg font-semibold mb-2">DICOM Files Preview</h3>
          <div className="relative">
            {selectedFiles[currentIndex].name.toLowerCase().endsWith(".dcm") ? (
              // Render a div for DICOM preview using Cornerstone
              <div
                ref={dicomElementRef}
                style={{ width: "100%", height: "500px" }}
                className="dicomViewport bg-black"
              ></div>
            ) : (
              // For non-DICOM images, display using an img tag
              <img
                src={previewUrls[currentIndex]}
                alt={`Preview ${currentIndex + 1}`}
                className="w-full h-auto object-cover rounded"
              />
            )}
            {/* Navigation buttons */}
            {previewUrls.length > 1 && (
              <>
                <button
                  onClick={handlePrev}
                  className="absolute left-0 top-1/2 transform -translate-y-1/2 bg-gray-700 text-white px-2 py-1 rounded"
                >
                  Prev
                </button>
                <button
                  onClick={handleNext}
                  className="absolute right-0 top-1/2 transform -translate-y-1/2 bg-gray-700 text-white px-2 py-1 rounded"
                >
                  Next
                </button>
              </>
            )}
          </div>
        </div>
      )}
      <ToastContainer position="bottom-right" />
    </div>
  );
};

export default ResultContent;
