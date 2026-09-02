"use client";

import {
  useRef,
  useState,
  useCallback,
  type DragEvent,
  type ChangeEvent,
} from "react";
import {
  ImageUp,
  UploadCloud,
  X,
  FileImage,
  CheckCircle2,
  ScanSearch,
} from "lucide-react";
import { validateImageFile, fileToBase64, cn } from "@/lib/utils";
import Button from "@/components/ui/Button";

interface ImageUploaderProps {
  onAnalyze: (base64: string, mimeType: string, previewUrl: string) => void;
  isAnalyzing: boolean;
}

export default function ImageUploader({ onAnalyze, isAnalyzing }: ImageUploaderProps) {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string>("");
  const [fileSize, setFileSize] = useState<string>("");
  const [error, setError] = useState<string>("");
  const [isDragging, setIsDragging] = useState(false);
  const [mimeType, setMimeType] = useState<string>("image/jpeg");
  const [base64Data, setBase64Data] = useState<string>("");
  const inputRef = useRef<HTMLInputElement>(null);

  const processFile = useCallback(async (file: File) => {
    setError("");
    const validationError = validateImageFile(file);
    if (validationError) {
      setError(validationError);
      return;
    }

    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
    setFileName(file.name);
    setMimeType(file.type);
    setFileSize(
      file.size < 1024 * 1024
        ? `${(file.size / 1024).toFixed(1)} KB`
        : `${(file.size / (1024 * 1024)).toFixed(2)} MB`
    );

    try {
      const b64 = await fileToBase64(file);
      setBase64Data(b64);
    } catch {
      setError("Failed to read the image file. Please try again.");
    }
  }, []);

  function handleFileChange(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) processFile(file);
    // Reset so same file can be re-selected
    e.target.value = "";
  }

  function handleDrop(e: DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) processFile(file);
  }

  function handleDragOver(e: DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setIsDragging(true);
  }

  function handleDragLeave(e: DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setIsDragging(false);
  }

  function clearImage() {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(null);
    setFileName("");
    setFileSize("");
    setBase64Data("");
    setMimeType("image/jpeg");
    setError("");
  }

  function handleAnalyze() {
    if (!base64Data || !previewUrl) {
      setError("Please select an image before analyzing.");
      return;
    }
    onAnalyze(base64Data, mimeType, previewUrl);
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Header */}
      <div className="flex items-center gap-2.5">
        <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-blue-500/15 border border-blue-500/30">
          <ImageUp className="w-5 h-5 text-blue-400" />
        </div>
        <div>
          <h3 className="text-sm font-semibold text-slate-100">Upload Flood Image</h3>
          <p className="text-xs text-slate-400">JPEG, PNG, WEBP or GIF · Max 10 MB</p>
        </div>
      </div>

      {/* Drop zone / preview */}
      {!previewUrl ? (
        <div
          role="button"
          tabIndex={0}
          onClick={() => inputRef.current?.click()}
          onKeyDown={(e) => e.key === "Enter" && inputRef.current?.click()}
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          aria-label="Click or drag to upload a flood image"
          className={cn(
            "relative flex flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed cursor-pointer transition-all duration-200 py-10 px-6 text-center",
            isDragging
              ? "border-blue-400 bg-blue-500/10 scale-[1.01]"
              : "border-slate-600 hover:border-blue-500/60 hover:bg-slate-700/30 bg-slate-800/40"
          )}
        >
          <div
            className={cn(
              "flex items-center justify-center w-14 h-14 rounded-full border-2 transition-colors",
              isDragging
                ? "border-blue-400 bg-blue-500/20 text-blue-300"
                : "border-slate-600 bg-slate-700/40 text-slate-400"
            )}
          >
            <UploadCloud className="w-7 h-7" />
          </div>
          <div>
            <p className="text-sm font-medium text-slate-200">
              {isDragging ? "Release to upload" : "Drop image here"}
            </p>
            <p className="text-xs text-slate-500 mt-1">
              or{" "}
              <span className="text-blue-400 underline underline-offset-2">
                browse files
              </span>
            </p>
          </div>
        </div>
      ) : (
        <div className="relative rounded-xl overflow-hidden border border-slate-700/60 bg-slate-900/40">
          {/* Preview image */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={previewUrl}
            alt="Flood scene preview"
            className="w-full max-h-72 object-cover"
          />

          {/* Overlay badge */}
          <div className="absolute top-3 left-3 flex items-center gap-1.5 px-2.5 py-1 bg-slate-900/80 backdrop-blur-sm rounded-full border border-green-500/40">
            <CheckCircle2 className="w-3.5 h-3.5 text-green-400" />
            <span className="text-xs text-green-300 font-medium">Image Ready</span>
          </div>

          {/* Remove button */}
          <button
            onClick={clearImage}
            disabled={isAnalyzing}
            aria-label="Remove image"
            className="absolute top-3 right-3 p-1.5 bg-slate-900/80 hover:bg-red-900/60 backdrop-blur-sm rounded-full border border-slate-700 text-slate-400 hover:text-red-300 transition-colors disabled:opacity-50"
          >
            <X className="w-4 h-4" />
          </button>

          {/* File info bar */}
          <div className="flex items-center gap-2 px-3 py-2 bg-slate-900/70 border-t border-slate-700/50">
            <FileImage className="w-4 h-4 text-slate-400 shrink-0" />
            <span className="text-xs text-slate-300 truncate flex-1">{fileName}</span>
            <span className="text-xs text-slate-500 shrink-0">{fileSize}</span>
          </div>
        </div>
      )}

      {/* Error message */}
      {error && (
        <p className="text-xs text-red-400 flex items-center gap-1.5 bg-red-900/20 border border-red-800/40 rounded-lg px-3 py-2">
          <span aria-hidden="true" className="shrink-0">⚠</span>
          {error}
        </p>
      )}

      {/* Analyze button */}
      <Button
        variant="primary"
        size="lg"
        fullWidth
        onClick={handleAnalyze}
        disabled={!previewUrl || isAnalyzing}
        loading={isAnalyzing}
        className="gap-2"
      >
        <ScanSearch className="w-4 h-4" />
        {isAnalyzing ? "Analyzing Scene…" : "Analyze Flood Image"}
      </Button>

      {/* Change image link when preview shown */}
      {previewUrl && !isAnalyzing && (
        <button
          onClick={() => inputRef.current?.click()}
          className="text-xs text-blue-400 hover:text-blue-300 underline underline-offset-2 text-center transition-colors"
        >
          Change image
        </button>
      )}
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif"
        onChange={handleFileChange}
        className="sr-only"
        aria-hidden="true"
        tabIndex={-1}
      />
    </div>
  );
}
