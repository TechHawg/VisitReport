import React, { useRef, useState } from 'react';
import { Camera, Upload, X, Eye, Edit3, Check } from 'lucide-react';
import Button from './Button';

const PhotoUpload = ({ 
  photos = [], 
  onPhotosChange, 
  maxPhotos = 10, 
  label = "Photos",
  acceptedTypes = "image/*",
  multiple = true 
}) => {
  const fileInputRef = useRef(null);
  const [dragOver, setDragOver] = useState(false);
  const [viewingPhoto, setViewingPhoto] = useState(null);
  const [editingPhoto, setEditingPhoto] = useState(null);
  const [editName, setEditName] = useState('');

  const handleFileSelect = (files) => {
    const fileArray = Array.from(files);
    const validFiles = fileArray.filter(file => file.type.startsWith('image/'));
    
    if (validFiles.length === 0) return;
    
    const remainingSlots = maxPhotos - photos.length;
    const filesToProcess = validFiles.slice(0, remainingSlots);
    
    const newPhotos = filesToProcess.map(file => ({
      id: Date.now() + Math.random(),
      file,
      url: URL.createObjectURL(file),
      name: file.name,
      size: file.size
    }));
    
    onPhotosChange([...photos, ...newPhotos]);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    handleFileSelect(e.dataTransfer.files);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setDragOver(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    setDragOver(false);
  };

  const removePhoto = (photoId) => {
    const updatedPhotos = photos.filter(photo => photo.id !== photoId);
    onPhotosChange(updatedPhotos);
  };

  const startEditingPhoto = (photo) => {
    setEditingPhoto(photo.id);
    setEditName(photo.name);
  };

  const savePhotoName = () => {
    const updatedPhotos = photos.map(photo => 
      photo.id === editingPhoto 
        ? { ...photo, name: editName.trim() || photo.name }
        : photo
    );
    onPhotosChange(updatedPhotos);
    setEditingPhoto(null);
    setEditName('');
  };

  const cancelEditingPhoto = () => {
    setEditingPhoto(null);
    setEditName('');
  };

  const openFileDialog = () => {
    fileInputRef.current?.click();
  };

  const canAddMore = photos.length < maxPhotos;

  return (
    <div className="space-y-4">
      {label && (
        <label className="block text-sm font-medium text-gray-600 dark:text-gray-300">
          {label} ({photos.length}/{maxPhotos})
        </label>
      )}
      
      {/* Upload Area */}
      {canAddMore && (
        <div
          className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors ${
            dragOver 
              ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20' 
              : 'border-gray-300 dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-500'
          }`}
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
        >
          <div className="space-y-4">
            <div className="flex justify-center">
              <Camera className="h-12 w-12 text-gray-400" />
            </div>
            <div className="space-y-2">
              <p className="text-gray-600 dark:text-gray-300">
                Drag and drop photos here, or
              </p>
              <Button
                variant="outline"
                onClick={openFileDialog}
                className="mx-auto"
              >
                <Upload size={16} />
                Choose Files
              </Button>
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              {multiple ? 'Multiple files supported' : 'Single file only'} • Max {maxPhotos} photos
            </p>
          </div>
        </div>
      )}

      {/* Photo Grid */}
      {photos.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {photos.map((photo) => (
            <div key={photo.id} className="relative group">
              <div className="aspect-square bg-gray-200 dark:bg-gray-700 rounded-lg overflow-hidden">
                <img
                  src={photo.url}
                  alt={photo.name}
                  className="w-full h-full object-cover"
                />
              </div>
              
              {/* Overlay with actions */}
              <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-50 transition-opacity rounded-lg flex items-center justify-center opacity-0 group-hover:opacity-100">
                <div className="flex space-x-2">
                  <button
                    onClick={() => setViewingPhoto(photo)}
                    className="p-2 bg-white text-gray-800 rounded-full hover:bg-gray-100 transition-colors"
                    title="View"
                  >
                    <Eye size={16} />
                  </button>
                  <button
                    onClick={() => startEditingPhoto(photo)}
                    className="p-2 bg-blue-500 text-white rounded-full hover:bg-blue-600 transition-colors"
                    title="Edit Name"
                  >
                    <Edit3 size={16} />
                  </button>
                  <button
                    onClick={() => removePhoto(photo.id)}
                    className="p-2 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors"
                    title="Remove"
                  >
                    <X size={16} />
                  </button>
                </div>
              </div>
              
              {/* File name or editing input */}
              {editingPhoto === photo.id ? (
                <div className="mt-1 flex items-center space-x-1">
                  <input
                    type="text"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') savePhotoName();
                      if (e.key === 'Escape') cancelEditingPhoto();
                    }}
                    className="flex-1 text-xs p-1 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                    autoFocus
                  />
                  <button
                    onClick={savePhotoName}
                    className="p-1 text-green-600 hover:text-green-700"
                    title="Save"
                  >
                    <Check size={12} />
                  </button>
                  <button
                    onClick={cancelEditingPhoto}
                    className="p-1 text-red-600 hover:text-red-700"
                    title="Cancel"
                  >
                    <X size={12} />
                  </button>
                </div>
              ) : (
                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400 truncate">
                  {photo.name}
                </p>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept={acceptedTypes}
        multiple={multiple}
        className="hidden"
        onChange={(e) => handleFileSelect(e.target.files)}
      />

      {/* Photo viewer modal */}
      {viewingPhoto && (
        <div className="fixed inset-0 bg-black bg-opacity-80 z-50 flex items-center justify-center p-4">
          <div className="relative max-w-4xl max-h-full">
            <button
              onClick={() => setViewingPhoto(null)}
              className="absolute top-4 right-4 p-2 bg-black bg-opacity-50 text-white rounded-full hover:bg-opacity-70 transition-colors z-10"
            >
              <X size={20} />
            </button>
            <img
              src={viewingPhoto.url}
              alt={viewingPhoto.name}
              className="max-w-full max-h-full object-contain rounded-lg"
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default PhotoUpload;