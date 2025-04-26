import React, { useEffect, useRef, useState, useCallback } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  FaPlay,
  FaPause,
  FaArrowLeft,
  FaStepBackward,
  FaStepForward,
  FaDownload,
} from "react-icons/fa";
import cornerstone from "cornerstone-core";
import cornerstoneWADOImageLoader from "cornerstone-wado-image-loader";
import dicomParser from "dicom-parser";

cornerstoneWADOImageLoader.external.cornerstone = cornerstone;
cornerstoneWADOImageLoader.external.dicomParser = dicomParser;

interface ReturnedFile {
  url: string;
  filename: string;
}

const ResultContent: React.FC = () => {
  const { state } = useLocation();
  const navigate = useNavigate();
  const files: ReturnedFile[] = state?.files ?? [];

  /* refs & timers */
  const dicomRef = useRef<HTMLDivElement>(null);
  const playTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  const resizeObs = useRef<ResizeObserver | null>(null);

  /* ui state */
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  const baseURL = import.meta.env.VITE_BACKEND ?? "http://127.0.0.1:8000";

  /* helpers */
  const showSlice = useCallback(
    async (idx: number) => {
      if (!dicomRef.current || files.length === 0) return;
      const element = dicomRef.current;
      const imageId = `wadouri:${baseURL}${files[idx].url}`;
      try {
        const image = await cornerstone.loadImage(imageId);
        cornerstone.displayImage(element, image);
        cornerstone.setViewport(element, {
          voi: { windowWidth: 3000, windowCenter: 500 },
        });
        cornerstone.fitToWindow(element);
      } catch (err) {
        // eslint-disable-next-line no-console
        console.error("Cornerstone loadImage error:", err);
      }
    },
    [files, baseURL]
  );

  const handlePrev = useCallback(
    () => setCurrentIndex((i) => (i - 1 + files.length) % files.length),
    [files.length]
  );
  const handleNext = useCallback(
    () => setCurrentIndex((i) => (i + 1) % files.length),
    [files.length]
  );

  /* EXPORT ALL DICOM FILES AS ZIP */
  const handleExportAll = async () => {
    if (files.length === 0 || isExporting) return;
    setIsExporting(true);
    try {
      const JSZip = (await import("jszip")).default;
      const zip = new JSZip();

      await Promise.all(
        files.map(async (f) => {
          const resp = await fetch(`${baseURL}${f.url}`);
          if (!resp.ok) throw new Error(`Failed to fetch ${f.filename}`);
          const buf = await resp.arrayBuffer();
          zip.file(f.filename, buf);
        })
      );

      const blob = await zip.generateAsync({ type: "blob" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "all_dicom.zip";
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error("Export error", err);
      alert("Failed to export DICOM files. See console for details.");
    } finally {
      setIsExporting(false);
    }
  };

  /* cornerstone init + slice change */
  useEffect(() => {
    if (!dicomRef.current || files.length === 0) return;
    cornerstone.enable(dicomRef.current);
    showSlice(currentIndex);
  }, [currentIndex, files, showSlice]);

  /* keep canvas size in sync */
  useEffect(() => {
    const element = dicomRef.current;
    if (!element) return;

    cornerstone.resize(element, true);
    resizeObs.current = new ResizeObserver(() => cornerstone.resize(element, true));
    resizeObs.current.observe(element);

    return () => resizeObs.current?.disconnect();
  }, []);

  /* play / pause */
  useEffect(() => {
    if (isPlaying) {
      playTimer.current = setInterval(handleNext, 120);
      return () => {
        if (playTimer.current) clearInterval(playTimer.current);
      };
    }
    if (playTimer.current) clearInterval(playTimer.current);
  }, [isPlaying, handleNext]);

  /* keyboard shortcuts */
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.code === "Space") {
        setIsPlaying((p) => !p);
        e.preventDefault();
      } else if (e.key === "ArrowLeft") {
        handlePrev();
      } else if (e.key === "ArrowRight") {
        handleNext();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [handlePrev, handleNext]);

  /* no files guard */
  if (files.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-10 text-gray-700">
        <p className="text-lg">No DICOM files returned.</p>
        <button
          onClick={() => navigate(-1)}
          className="mt-6 inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded shadow"
        >
          <FaArrowLeft /> Back
        </button>
      </div>
    );
  }

  /* render */
  return (
    <div className="relative pt-6 pb-20 px-4 flex flex-col items-center min-h-[calc(100vh-64px)]">
      <div className="bg-white/80 backdrop-blur-md h-[70vh] md:h-[80vh] w-full max-w-5xl flex flex-col shadow-lg rounded-3xl overflow-hidden">
        {/* Toolbar */}
        <div className="flex items-center justify-between px-6 py-3 bg-white/70 backdrop-blur border-b">
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrev}
              className="p-2 hover:bg-gray-100 rounded-full"
              title="Previous slice"
            >
              <FaStepBackward />
            </button>
            <button
              onClick={() => setIsPlaying((p) => !p)}
              className="p-2 hover:bg-gray-100 rounded-full"
              title={isPlaying ? "Pause" : "Play"}
            >
              {isPlaying ? <FaPause /> : <FaPlay />}
            </button>
            <button
              onClick={handleNext}
              className="p-2 hover:bg-gray-100 rounded-full"
              title="Next slice"
            >
              <FaStepForward />
            </button>
          </div>

          <div className="flex items-center gap-4 w-full max-w-sm mx-4">
            <input
              type="range"
              min={0}
              max={files.length - 1}
              value={currentIndex}
              onChange={(e) => setCurrentIndex(Number(e.target.value))}
              className="flex-grow accent-[#FD662E] cursor-pointer"
            />
            <span className="text-sm text-gray-600 whitespace-nowrap">
              {currentIndex + 1} / {files.length}
            </span>
          </div>

          {/* Export button */}
          <button
            onClick={handleExportAll}
            disabled={isExporting}
            className="inline-flex items-center gap-2 px-3 py-2 bg-[#FD662E] hover:bg-[#FD662E] disabled:opacity-50 disabled:cursor-not-allowed text-white rounded"
          >
            <FaDownload /> {isExporting ? "Exporting…" : "Export All"}
          </button>
        </div>

        {/* Viewport */}
        <div className="relative bg-black flex-1">
          <div ref={dicomRef} className="w-full h-full" />
        </div>
      </div>
    </div>
  );
};

export default ResultContent;
