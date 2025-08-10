import React, { useCallback, useState, useRef } from 'react';
import { useApp } from '../context/AppContext';
import { FileService } from '../services/fileService';

interface FileUploadProps {
  className?: string;
}

const FileUpload: React.FC<FileUploadProps> = ({ className = '' }) => {
  const { dispatch } = useApp();
  const [isDragOver, setIsDragOver] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = useCallback(async (files: FileList) => {
    if (files.length === 0) return;
    
    const file = files[0];
    const validExtensions = ['.pptx', '.odp'];
    const fileExtension = file.name.toLowerCase().substring(file.name.lastIndexOf('.'));
    
    if (!validExtensions.includes(fileExtension)) {
      setUploadError('Please upload a valid PowerPoint (.pptx) or OpenDocument (.odp) file.');
      return;
    }

    setIsUploading(true);
    setUploadError(null);
    
    try {
      dispatch({ type: 'SET_LOADING', payload: true });
      
      const result = await FileService.importFile(file);
      
      if (result.success && result.presentation) {
        dispatch({ type: 'SET_PRESENTATION', payload: result.presentation });
        
        if (result.warnings && result.warnings.length > 0) {
          // Show warnings to user
          console.warn('Import warnings:', result.warnings);
        }
      } else {
        setUploadError(result.error || 'Failed to import file');
      }
    } catch (error) {
      setUploadError(`Upload failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsUploading(false);
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  }, [dispatch]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
    
    const files = e.dataTransfer.files;
    handleFileUpload(files);
  }, [handleFileUpload]);

  const handleFileInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files) {
      handleFileUpload(files);
    }
  }, [handleFileUpload]);

  const handleClick = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  return (
    <div className={`file-upload ${className}`}>
      <div
        className={`upload-area ${isDragOver ? 'drag-over' : ''} ${isUploading ? 'uploading' : ''}`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={handleClick}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".pptx,.odp"
          onChange={handleFileInput}
          style={{ display: 'none' }}
        />
        
        {isUploading ? (
          <div className="upload-loading">
            <div className="loading-spinner" />
            <p>Importing presentation...</p>
          </div>
        ) : (
          <div className="upload-content">
            <div className="upload-icon">📁</div>
            <h3>Import Presentation</h3>
            <p>
              Drag and drop your PowerPoint (.pptx) or OpenDocument (.odp) file here,<br />
              or click to browse and select a file.
            </p>
            <button className="browse-button">
              Browse Files
            </button>
            <div className="supported-formats">
              Supported formats: .pptx, .odp
            </div>
          </div>
        )}
      </div>
      
      {uploadError && (
        <div className="upload-error">
          <div className="error-icon">⚠️</div>
          <p>{uploadError}</p>
          <button 
            className="error-dismiss"
            onClick={() => setUploadError(null)}
          >
            Dismiss
          </button>
        </div>
      )}
    </div>
  );
};

export default FileUpload;