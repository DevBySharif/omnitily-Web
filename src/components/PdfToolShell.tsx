// Shared header + drag-and-drop zone used by the wave-1 PDF tools, matching
// the look of PdfCompiler / ImageConverter (dark zinc panels, emerald accent).
import React, { useRef, useState } from 'react';
import { Upload } from '@phosphor-icons/react';

interface PdfToolHeaderProps {
  onBack: () => void;
  icon: React.ReactNode;
  title: string;
  subtitle: string;
  action?: React.ReactNode;
}

export function PdfToolHeader({ onBack, icon, title, subtitle, action }: PdfToolHeaderProps) {
  return (
    <div className="flex items-center justify-between mb-8 pb-4 border-b border-[#2a2a2a]">
      <div>
        <button
          onClick={onBack}
          className="text-sm font-medium text-gray-400 hover:text-[#10b981] mb-2 inline-flex items-center gap-1 transition-colors cursor-pointer"
        >
          &larr; Back to Dashboard
        </button>
        <h1 className="text-3xl font-sans text-white tracking-tight flex items-center gap-3">
          {icon}
          {title}
        </h1>
        <p className="text-gray-400 text-sm mt-1">{subtitle}</p>
      </div>
      {action}
    </div>
  );
}

interface PdfDropzoneProps {
  accept: string;
  multiple?: boolean;
  label: string;
  hint: string;
  buttonLabel: string;
  ariaLabel: string;
  disabled?: boolean;
  onFiles: (files: File[]) => void;
}

export function PdfDropzone({
  accept,
  multiple = false,
  label,
  hint,
  buttonLabel,
  ariaLabel,
  disabled = false,
  onFiles,
}: PdfDropzoneProps) {
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  return (
    <div
      onDragOver={(e) => {
        e.preventDefault();
        if (!disabled) setIsDragging(true);
      }}
      onDragLeave={() => setIsDragging(false)}
      onDrop={(e) => {
        e.preventDefault();
        setIsDragging(false);
        if (disabled) return;
        if (e.dataTransfer.files) onFiles(Array.from(e.dataTransfer.files));
      }}
      onClick={() => {
        if (!disabled) fileInputRef.current?.click();
      }}
      onKeyDown={(e) => {
        if ((e.key === 'Enter' || e.key === ' ') && !disabled) {
          e.preventDefault();
          fileInputRef.current?.click();
        }
      }}
      role="button"
      tabIndex={0}
      aria-label={ariaLabel}
      className={`border-2 border-dashed rounded-xl p-8 text-center flex flex-col items-center justify-center transition-all select-none group min-h-[180px] focus:outline-none focus:border-[#10b981]/70 ${
        disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'
      } ${
        isDragging
          ? 'border-[#10b981] bg-[#10b981]/10'
          : 'border-[#2a2a2a] hover:border-[#10b981]/40 bg-[#0d0d0d]'
      }`}
    >
      <input
        type="file"
        ref={fileInputRef}
        onChange={(e) => {
          if (e.target.files) onFiles(Array.from(e.target.files));
          e.target.value = '';
        }}
        multiple={multiple}
        accept={accept}
        aria-label={ariaLabel}
        className="hidden"
      />
      <div className="p-3 bg-[#151515] border border-[#2a2a2a] rounded-xl shadow-sm mb-3 group-hover:scale-105 transition-transform text-[#10b981]">
        <Upload className="w-6 h-6" />
      </div>
      <h3 className="text-white font-sans text-base">{label}</h3>
      <p className="text-gray-500 text-xs mt-1 mb-3">{hint}</p>
      <span className="text-[11px] font-bold text-[#0a0a0a] bg-[#10b981] px-3 py-1.5 rounded uppercase tracking-wider hover:bg-[#059669] transition-all">
        {buttonLabel}
      </span>
    </div>
  );
}

/** Shared primary action button (emerald) and its disabled twin. */
export function primaryButtonClassName(enabled: boolean): string {
  return `w-full py-3 px-4 rounded font-bold text-xs uppercase tracking-widest shadow-sm flex items-center justify-center gap-2 transition-all cursor-pointer ${
    enabled
      ? 'bg-[#10b981] hover:bg-[#059669] text-[#0a0a0a] hover:shadow-md'
      : 'bg-[#151515] text-gray-600 border border-[#2a2a2a] cursor-not-allowed'
  }`;
}
