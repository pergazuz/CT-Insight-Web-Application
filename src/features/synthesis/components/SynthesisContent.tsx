import React, { useState, useEffect, useRef } from "react";
import { FaCaretRight, FaImage, FaSpinner, FaPlay, FaPause, FaCheckCircle, FaFileMedical } from "react-icons/fa";
import { useNavigate } from "react-router-dom";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import cornerstone from "cornerstone-core";
import cornerstoneWADOImageLoader from "cornerstone-wado-image-loader";
import dicomParser from "dicom-parser";
import { motion, AnimatePresence } from "framer-motion";

declare global {
  namespace React {
    interface InputHTMLAttributes<T> {
      webkitdirectory?: string;
      directory?: string;
    }
  }
}

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

const SynthesisContent = () => {
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

  const processDICOMFiles = async (files: File[]) => {
    try {
      const processedFiles = await Promise.all(
        files.map(async (file) => {
          try {
            const arrayBuffer = await file.arrayBuffer();
            const byteArray = new Uint8Array(arrayBuffer);
            const dataSet = dicomParser.parseDicom(byteArray);
            
            if (!dataSet.elements['x7fe00010'] || 
                !dataSet.elements['x00280010'] || 
                !dataSet.elements['x00280011']) {
              return null;
            }

            const dicomFile: DICOMFile = file;

            const imagePositionPatientStr = dataSet.string('x00200032');
            if (imagePositionPatientStr) {
              const parts = imagePositionPatientStr.split('\\').map(p => parseFloat(p));
              if (parts.length === 3) {
                dicomFile.imagePosition = parts;
              }
            }

            const sliceLocationStr = dataSet.string('x00201041');
            if (sliceLocationStr) {
              dicomFile.sliceLocation = parseFloat(sliceLocationStr);
            }

            const instanceNumberStr = dataSet.string('x00200013');
            if (instanceNumberStr) {
              const instanceNumber = parseInt(instanceNumberStr, 10);
              if (!isNaN(instanceNumber)) {
                dicomFile.instanceNumber = instanceNumber;
              }
            }

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

      const validFiles = processedFiles.filter(Boolean) as DICOMFile[];
      const sorted = [...validFiles].sort((a, b) => {
        const aPosZ = a.imagePosition?.[2];
        const bPosZ = b.imagePosition?.[2];
        if (aPosZ !== undefined && bPosZ !== undefined) return aPosZ - bPosZ;
        if (aPosZ !== undefined) return -1;
        if (bPosZ !== undefined) return 1;

        const aSlice = a.sliceLocation ?? Infinity;
        const bSlice = b.sliceLocation ?? Infinity;
        if (aSlice !== Infinity && bSlice !== Infinity) return aSlice - bSlice;
        if (aSlice !== Infinity) return -1;
        if (bSlice !== Infinity) return 1;

        const aInst = a.instanceNumber ?? Infinity;
        const bInst = b.instanceNumber ?? Infinity;
        if (aInst !== Infinity && bInst !== Infinity) return aInst - bInst;
        if (aInst !== Infinity) return -1;
        if (bInst !== Infinity) return 1;

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
              voi: { windowWidth: 3000, windowCenter: 500 },
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

  const handleProcessDICOM = async () => {
    if (sortedFiles.length === 0) {
      toast.error("Please upload DICOM files!");
      return;
    }
  
    setIsLoading(true);
    try {
      const formData = new FormData();
      
      // Append all DICOM files to FormData
      sortedFiles.forEach((file) => {
        formData.append("dicomFiles", file);
      });
  
      // Send to backend endpoint
      const response = await fetch("http://127.0.0.1:8000/process-dicom", {
        method: "POST",
        body: formData,

      });
  
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
  
      const result = await response.json();
      navigate("/result", { state: { files: result.files } });
    } catch (error) {
      console.error("Upload error:", error);
      toast.error("Failed to process DICOM files");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col items-center min-h-screen p-8">
      <div className="flex flex-col lg:flex-row w-full max-w-7xl gap-8 h-[35em]">
        {/* Upload Section */}
        <div className="flex-1 bg-white rounded-xl shadow-lg p-6 flex flex-col">
          <div className="flex flex-col items-center space-y-4 h-full">
            <motion.div
              className="w-full h-full border-2 border-dashed rounded-lg flex flex-col items-center justify-center cursor-pointer relative group"
              onDrop={handleDrop}
              onDragOver={e => e.preventDefault()}
              onClick={() => fileInputRef.current?.click()}
              initial={false}
              animate={{
                borderColor: sortedFiles.length > 0 ? '#10B981' : '#CBD5E1',
                backgroundColor: sortedFiles.length > 0 ? '#ECFDF5' : '#FFFFFF'
              }}
              transition={{ duration: 0.3 }}
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
              
              <motion.div
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ type: 'spring', stiffness: 100 }}
              >
                {sortedFiles.length > 0 ? (
                  <div className="flex flex-col items-center">
                    <FaCheckCircle className="text-green-500 text-4xl mb-2" />
                    <p className="text-green-600 font-medium text-center">
                      {sortedFiles.length} DICOM files loaded!
                    </p>
                  </div>
                ) : (
                  <div className="flex flex-col items-center">
                    <FaImage className="text-gray-400 text-4xl mb-2 group-hover:text-blue-500 transition-colors duration-300" />
                    <p className="text-gray-600 text-center group-hover:text-blue-600 transition-colors duration-300">
                      Drag DICOM folder here or click to browse
                    </p>
                  </div>
                )}
              </motion.div>

              {sortedFiles.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="absolute bottom-4 w-full px-4"
                >
                  <div className="bg-green-50 p-2 rounded-lg flex items-center space-x-2">
                    <FaCheckCircle className="text-green-500 flex-shrink-0" />
                    <div className="flex-1 overflow-hidden">
                      <p className="text-sm text-green-800 truncate">
                        Folder contains {sortedFiles.length} DICOM files
                      </p>
                      <div className="h-1 bg-green-200 rounded-full mt-1">
                        <div
                          className="h-full bg-green-500 rounded-full transition-all duration-500"
                          style={{ width: '100%' }}
                        />
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}
            </motion.div>

            {sortedFiles.length > 0 && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                className="w-full space-y-2 flex-1"
              >
                <h4 className="text-sm font-medium text-gray-600">Uploaded Files:</h4>
                <div className="border rounded-lg p-2 h-40 overflow-y-auto">
                  {sortedFiles.map((file, index) => (
                    <motion.div
                      key={index}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.05 }}
                      className="flex items-center space-x-2 p-1 hover:bg-gray-50 rounded"
                    >
                      <FaFileMedical className="text-blue-500 flex-shrink-0" />
                      <span className="text-sm text-gray-600 truncate">{file.name}</span>
                    </motion.div>
                  ))}
                </div>
              </motion.div>
            )}

            <div className="flex flex-col items-center space-y-4 w-full mt-4">
              <button
                onClick={handleProcessDICOM}
                className="w-full max-w-xs bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 rounded-lg transition-colors duration-300 flex items-center justify-center"
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
                  className="text-blue-600 hover:text-blue-700 font-medium transition-colors duration-300"
                >
                  {showPreview ? "Hide Preview" : "Show Preview"}
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Preview Section */}
        <AnimatePresence>
          {showPreview && sortedFiles.length > 0 && (
            <motion.div
              initial={{ opacity: 0, x: 50 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 50 }}
              className="flex-1 bg-white rounded-xl shadow-lg p-6 flex flex-col h-full"
            >
              <div className="space-y-4 h-full flex flex-col">
                <div className="flex items-center justify-between">
                  <motion.h3 
                    className="text-xl font-semibold"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.2 }}
                  >
                    DICOM Preview
                  </motion.h3>
                  <div className="flex items-center space-x-4">
                    <button
                      onClick={handlePlayPause}
                      className="p-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors duration-300"
                    >
                      {isPlaying ? <FaPause /> : <FaPlay />}
                    </button>
                    <span className="text-gray-600">
                      {currentIndex + 1} / {sortedFiles.length}
                    </span>
                  </div>
                </div>

                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="w-full flex-1 bg-black rounded-lg overflow-hidden"
                >
                  <div ref={dicomElementRef} className="w-full h-full" />
                </motion.div>

                <div className="grid grid-cols-4 gap-2 h-32 overflow-y-auto">
                  {sortedFiles.map((file, index) => (
                    <motion.div
                      key={index}
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.9 }}
                      transition={{ duration: 0.2 }}
                      onClick={() => setCurrentIndex(index)}
                      className={`p-2 border rounded cursor-pointer transition-colors duration-300 ${
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
                    </motion.div>
                  ))}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
      <ToastContainer position="bottom-right" autoClose={3000} />
    </div>
  );
};

export default SynthesisContent;