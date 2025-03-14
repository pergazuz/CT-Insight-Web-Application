import React, { useState, useEffect, useRef } from "react";
import { FaCaretRight, FaImage, FaSpinner, FaPlay, FaPause } from "react-icons/fa";
import { useNavigate } from "react-router-dom";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import cornerstone from "cornerstone-core";
import cornerstoneWADOImageLoader from "cornerstone-wado-image-loader";
import dicomParser from "dicom-parser";

// Configure DICOM dependencies
cornerstoneWADOImageLoader.external.cornerstone = cornerstone;
cornerstoneWADOImageLoader.external.dicomParser = dicomParser;
cornerstoneWADOImageLoader.configure({
  useWebWorkers: true,
  webWorkerPath: "/dicomweb-worker.js",
});

type DICOMFile = File & {
  instanceNumber?: number;
  rescaleSlope?: number;
  rescaleIntercept?: number;
  pixelData?: Float32Array;
  imagePosition?: number[];
  sliceLocation?: number;
};

const ResultContent = () => {
  const [selectedFiles, setSelectedFiles] = useState<DICOMFile[]>([]);
  const [sortedFiles, setSortedFiles] = useState<DICOMFile[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dicomElementRef = useRef<HTMLDivElement>(null);
  const playIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const navigate = useNavigate();



// Updated DICOM processing section in processDICOMFiles function
const processDICOMFiles = async (files: File[]) => {
  try {
    const processedFiles = await Promise.all(
      files.map(async (file) => {
        try {
          const arrayBuffer = await file.arrayBuffer();
          const byteArray = new Uint8Array(arrayBuffer);
          const dataSet = dicomParser.parseDicom(byteArray);
          
          // Check for required DICOM elements
          if (!dataSet.elements['x7fe00010'] || 
              !dataSet.elements['x00280010'] || 
              !dataSet.elements['x00280011']) {
            return null;
          }

          const dicomFile: DICOMFile = file;

          // Parse ImagePositionPatient (0020,0032)
          const imagePositionPatientStr = dataSet.string('x00200032');
          if (imagePositionPatientStr) {
            const parts = imagePositionPatientStr.split('\\').map(p => parseFloat(p));
            if (parts.length === 3) {
              dicomFile.imagePosition = parts;
            }
          }

          // Parse SliceLocation (0020,1041)
          const sliceLocationStr = dataSet.string('x00201041');
          if (sliceLocationStr) {
            dicomFile.sliceLocation = parseFloat(sliceLocationStr);
          }

          // Parse InstanceNumber (0020,0013)
          const instanceNumberStr = dataSet.string('x00200013');
          if (instanceNumberStr) {
            const instanceNumber = parseInt(instanceNumberStr, 10);
            if (!isNaN(instanceNumber)) {
              dicomFile.instanceNumber = instanceNumber;
            }
          }

          // Parse Rescale parameters
          dicomFile.rescaleSlope = 1;
          const slopeStr = dataSet.string('x00281053');
          if (slopeStr) {
            const slope = parseFloat(slopeStr);
            if (!isNaN(slope)) dicomFile.rescaleSlope = slope;
          }

          dicomFile.rescaleIntercept = 0;
          const interceptStr = dataSet.string('x00281052');
          if (interceptStr) {
            const intercept = parseFloat(interceptStr);
            if (!isNaN(intercept)) dicomFile.rescaleIntercept = intercept;
          }

          // Process pixel data with HU conversion
          const pixelDataElement = dataSet.elements['x7fe00010'];
          const pixelData = new Int16Array(
            byteArray.buffer,
            pixelDataElement.dataOffset,
            pixelDataElement.length / 2
          );

          dicomFile.pixelData = new Float32Array(pixelData.length);
          for (let i = 0; i < pixelData.length; i++) {
            let huValue = pixelData[i] * dicomFile.rescaleSlope + dicomFile.rescaleIntercept;
            dicomFile.pixelData[i] = Math.max(-1000, Math.min(huValue, 3000));
          }

          return dicomFile;
        } catch (error) {
          console.error("Error processing file:", file.name, error);
          return null;
        }
      })
    );

    // Filter and sort with enhanced logic
    const validFiles = processedFiles.filter(Boolean) as DICOMFile[];
    
    // Enhanced sorting logic with proper fallbacks
    const sorted = [...validFiles].sort((a, b) => {
      // Compare ImagePositionPatient z-coordinate
      const aPosZ = a.imagePosition?.[2];
      const bPosZ = b.imagePosition?.[2];
      if (aPosZ !== undefined && bPosZ !== undefined) {
        return aPosZ - bPosZ;
      }
      if (aPosZ !== undefined) return -1;
      if (bPosZ !== undefined) return 1;

      // Compare SliceLocation
      const aSlice = a.sliceLocation ?? Infinity;
      const bSlice = b.sliceLocation ?? Infinity;
      if (aSlice !== Infinity && bSlice !== Infinity) {
        return aSlice - bSlice;
      }
      if (aSlice !== Infinity) return -1;
      if (bSlice !== Infinity) return 1;

      // Compare InstanceNumber
      const aInst = a.instanceNumber ?? Infinity;
      const bInst = b.instanceNumber ?? Infinity;
      if (aInst !== Infinity && bInst !== Infinity) {
        return aInst - bInst;
      }
      if (aInst !== Infinity) return -1;
      if (bInst !== Infinity) return 1;

      // Fallback to natural filename sort
      return a.name.localeCompare(b.name, undefined, { numeric: true });
    });

    setSortedFiles(sorted);
    if (sorted.length !== files.length) {
      toast.warning(`${files.length - sorted.length} invalid/malformed DICOM files filtered`);
    }
  } catch (error) {
    toast.error("Error processing DICOM files");
    console.error(error);
  }
};

  useEffect(() => {
    if (selectedFiles.length > 0) {
      processDICOMFiles(selectedFiles);
    }
  }, [selectedFiles]);

  useEffect(() => {
    if (showPreview && sortedFiles.length > 0 && dicomElementRef.current) {
      const loadImage = async () => {
        try {
          const file = sortedFiles[currentIndex];
          const imageId = URL.createObjectURL(file);
          
          await cornerstone.loadImage(`wadouri:${imageId}`).then((image) => {
            cornerstone.displayImage(dicomElementRef.current!, image);
            cornerstone.setViewport(dicomElementRef.current!, {
              voi: {
                windowWidth: 3000,  // Wider window for CBCT compatibility
                windowCenter: 500,  // Adjusted center position
              },
              invert: false
            });
            cornerstone.resize(dicomElementRef.current!, true);
          });
        } catch (err) {
          console.error("Error loading DICOM image:", err);
          toast.error("Failed to load DICOM image");
        }
      };

      cornerstone.enable(dicomElementRef.current);
      loadImage();
    }
  }, [showPreview, currentIndex, sortedFiles]);

  // Event handlers remain the same as previous version
  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const files = Array.from(e.dataTransfer.files).filter((file) =>
      file.name.toLowerCase().endsWith(".dcm")
    );
    if (files.length > 0) {
      setSelectedFiles(files as DICOMFile[]);
    } else {
      toast.error("No DICOM files found in dragged content");
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const files = Array.from(e.target.files).filter((file) =>
        file.name.toLowerCase().endsWith(".dcm")
      ) as DICOMFile[];
      if (files.length > 0) {
        setSelectedFiles(files);
      } else {
        toast.error("No DICOM files selected");
      }
    }
  };

  const handlePlayPause = () => {
    if (!isPlaying) {
      playIntervalRef.current = setInterval(() => {
        setCurrentIndex(prev => (prev + 1) % sortedFiles.length);
      }, 150);
    } else {
      if (playIntervalRef.current) clearInterval(playIntervalRef.current);
    }
    setIsPlaying(!isPlaying);
  };

  return (
    <div className="flex flex-col items-center min-h-screen p-8">
      <div className="flex flex-col lg:flex-row w-full max-w-7xl gap-8">
        {/* Upload Section */}
        <div className="flex-1 bg-white rounded-xl shadow-lg p-6">
          <div className="flex flex-col items-center space-y-4">
            <div
              className="w-full h-64 border-2 border-dashed border-gray-300 rounded-lg flex flex-col items-center justify-center cursor-pointer hover:border-blue-500 hover:bg-blue-50 transition-colors"
              onDrop={handleDrop}
              onDragOver={e => e.preventDefault()}
              onClick={() => fileInputRef.current?.click()}
            >
              <input
                type="file"
                ref={fileInputRef}
                className="hidden"
                accept=".dcm"
                multiple
                webkitdirectory=""
                directory=""
                onChange={handleFileChange}
              />
              <FaImage className="text-gray-400 text-4xl mb-2" />
              <p className="text-gray-600 text-center">
                {sortedFiles.length > 0
                  ? `${sortedFiles.length} DICOM files loaded`
                  : "Drag DICOM folder here or click to browse"}
              </p>
            </div>

            <div className="flex flex-col items-center space-y-4 w-full mt-4">
              <button
                onClick={() => {
                  if (sortedFiles.length === 0) {
                    toast.error("Please upload DICOM files!");
                    return;
                  }
                  setIsLoading(true);
                  setTimeout(() => navigate("/result"), 2000);
                }}
                className="w-full max-w-xs bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 rounded-lg transition-colors flex items-center justify-center"
                disabled={isLoading}
              >
                {isLoading ? (
                  <FaSpinner className="animate-spin h-6 w-6" />
                ) : (
                  <>
                    <span>Process DICOM</span>
                    <FaCaretRight className="ml-2" />
                  </>
                )}
              </button>

              {sortedFiles.length > 0 && (
                <button
                  onClick={() => setShowPreview(!showPreview)}
                  className="text-blue-600 hover:text-blue-700 font-medium"
                >
                  {showPreview ? "Hide Preview" : "Show Preview"}
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Preview Section */}
        {showPreview && sortedFiles.length > 0 && (
          <div className="flex-1 bg-white rounded-xl shadow-lg p-6">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-semibold">DICOM Preview</h3>
                <div className="flex items-center space-x-4">
                  <button
                    onClick={handlePlayPause}
                    className="p-2 bg-blue-500 text-white rounded hover:bg-blue-600"
                  >
                    {isPlaying ? <FaPause /> : <FaPlay />}
                  </button>
                  <span className="text-gray-600">
                    {currentIndex + 1} / {sortedFiles.length}
                  </span>
                </div>
              </div>

              <div
                ref={dicomElementRef}
                className="w-full h-96 bg-black rounded-lg overflow-hidden"
              />

              <div className="grid grid-cols-4 gap-2 max-h-96 overflow-y-auto">
                {sortedFiles.map((file, index) => (
                  <div
                    key={index}
                    onClick={() => setCurrentIndex(index)}
                    className={`p-2 border rounded cursor-pointer ${
                      index === currentIndex
                        ? "border-blue-500 bg-blue-50"
                        : "border-gray-200 hover:border-blue-300"
                    }`}
                  >
                    <div className="text-sm text-gray-600 truncate">
                      {file.name}
                    </div>
                    <div className="text-xs text-gray-400">
                      {file.imagePosition?.[2]?.toFixed(1) ?? 
                       file.sliceLocation?.toFixed(1) ??
                       `Instance: ${file.instanceNumber ?? 'N/A'}`}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
      <ToastContainer position="bottom-right" autoClose={3000} />
    </div>
  );
};

export default ResultContent;