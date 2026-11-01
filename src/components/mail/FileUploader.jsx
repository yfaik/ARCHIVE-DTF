import React, { useState, useRef } from 'react';
import { UploadCloud, FileText, X, CheckCircle2 } from 'lucide-react';
import toast from 'react-hot-toast';

export const FileUploader = ({ onFileSelected, selectedFile, onRemoveFile }) => {
  const [isDragging, setIsDragging] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(100);
  const fileInputRef = useRef(null);

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const validateAndSetFile = (file) => {
    if (!file) return;
    if (file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')) {
      toast.error('Seuls les fichiers PDF sont acceptés.');
      return;
    }

    if (file.size > 25 * 1024 * 1024) {
      toast.error('La taille du fichier ne doit pas dépasser 25 Mo.');
      return;
    }

    setUploadProgress(0);
    const interval = setInterval(() => {
      setUploadProgress((prev) => {
        if (prev >= 100) {
          clearInterval(interval);
          return 100;
        }
        return prev + 25;
      });
    }, 50);

    onFileSelected(file);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      validateAndSetFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      validateAndSetFile(e.target.files[0]);
    }
  };

  const formatFileSize = (bytes) => {
    if (!bytes) return '0 Mo';
    const mb = bytes / (1024 * 1024);
    return `${mb.toFixed(2)} Mo`;
  };

  return (
    <div className="w-full space-y-2">
      <label className="text-sm font-medium text-surface-700 dark:text-surface-300">
        Document PDF <span className="text-danger-500">*</span>
      </label>

      {!selectedFile ? (
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-all duration-200 ${
            isDragging
              ? 'border-primary-500 bg-primary-50 dark:bg-primary-500/5 scale-[1.005]'
              : 'border-surface-200 dark:border-surface-700 bg-surface-50 dark:bg-surface-800/50 hover:border-primary-300 dark:hover:border-primary-600 hover:bg-primary-50/50 dark:hover:bg-primary-500/5'
          }`}
        >
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            accept=".pdf,application/pdf"
            className="hidden"
          />
          <div className="w-10 h-10 rounded-lg bg-primary-50 dark:bg-primary-500/10 text-primary-500 flex items-center justify-center mx-auto mb-3">
            <UploadCloud className="w-5 h-5" />
          </div>
          <div className="text-sm font-medium text-surface-700 dark:text-surface-300">
            Glissez-déposez le PDF ici, ou{' '}
            <span className="text-primary-500 font-semibold">parcourir</span>
          </div>
          <div className="text-xs text-surface-400 mt-1">
            Format PDF uniquement (Max 25 Mo)
          </div>
        </div>
      ) : (
        <div className="flex items-center justify-between p-3 rounded-lg border border-success-200 dark:border-success-500/20 bg-success-50 dark:bg-success-500/5">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-9 h-9 rounded-lg bg-success-500 text-white flex items-center justify-center shrink-0">
              <FileText className="w-4.5 h-4.5" />
            </div>
            <div className="min-w-0">
              <div className="text-sm font-medium text-surface-900 dark:text-surface-100 truncate">
                {selectedFile.name}
              </div>
              <div className="text-xs text-success-600 dark:text-success-400 font-medium flex items-center gap-1.5">
                <span>{formatFileSize(selectedFile.size)}</span>
                <span className="flex items-center gap-0.5">
                  <CheckCircle2 className="w-3 h-3" /> Prêt
                </span>
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={onRemoveFile}
            className="p-1.5 text-surface-400 hover:text-danger-500 rounded-md hover:bg-danger-50 dark:hover:bg-danger-500/10 transition-colors ml-3"
            title="Supprimer le fichier"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Progress Bar */}
      {selectedFile && uploadProgress < 100 && (
        <div className="w-full bg-surface-100 dark:bg-surface-800 rounded-full h-1 overflow-hidden">
          <div
            className="bg-primary-500 h-1 rounded-full transition-all duration-200"
            style={{ width: `${uploadProgress}%` }}
          />
        </div>
      )}
    </div>
  );
};
