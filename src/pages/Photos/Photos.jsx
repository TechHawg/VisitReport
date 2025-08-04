import React, { useState } from 'react';
import { Camera, Plus, Edit, Trash2, Save, X, Eye, Download, Upload } from 'lucide-react';
import Section from '../../components/ui/Section';
import Input from '../../components/ui/Input';
import Textarea from '../../components/ui/Textarea';
import Select from '../../components/ui/Select';
import Button from '../../components/ui/Button';
import Modal from '../../components/ui/Modal';
import ConfirmDialog from '../../components/ui/ConfirmDialog';
import PhotoUpload from '../../components/ui/PhotoUpload';
import { useApp } from '../../context/AppContext';

const Photos = () => {
  const { reportData, updateReportData, addNotification } = useApp();
  
  // Initialize photos data
  const photosData = reportData.photos || [];
  
  const [editingPhoto, setEditingPhoto] = useState(null);
  const [showDeleteDialog, setShowDeleteDialog] = useState(null);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [uploadingPhotos, setUploadingPhotos] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState('');

  const updatePhotosData = (photos) => {
    updateReportData('photos', photos);
  };

  const photoCategories = [
    'Data Closet',
    'Server Room',
    'Workstations',
    'Network Equipment',
    'General Office',
    'Training Room',
    'Reception Area',
    'Storage Areas',
    'Issues Found',
    'Completed Work',
    'Before/After',
    'Other'
  ];

  const handleUploadPhotos = () => {
    if (uploadingPhotos.length === 0) {
      addNotification({
        type: 'warning',
        message: 'Please select photos to upload',
        duration: 3000
      });
      return;
    }

    const newPhotos = uploadingPhotos.map(photo => ({
      id: Date.now() + Math.random(),
      name: photo.file.name.replace(/\.[^/.]+$/, ""), // Remove file extension
      category: selectedCategory || 'Other',
      description: '',
      file: photo.file,
      url: photo.url,
      size: photo.size,
      uploadDate: new Date().toISOString().split('T')[0]
    }));

    updatePhotosData([...photosData, ...newPhotos]);
    setUploadingPhotos([]);
    setShowUploadModal(false);
    setSelectedCategory('');
    
    addNotification({
      type: 'success',
      message: `${newPhotos.length} photo(s) uploaded successfully`,
      duration: 3000
    });
  };

  const handleEditPhoto = (photo) => {
    setEditingPhoto({ ...photo });
  };

  const handleSavePhoto = () => {
    if (!editingPhoto.name.trim()) {
      addNotification({
        type: 'error',
        message: 'Photo name is required',
        duration: 3000
      });
      return;
    }

    const updatedPhotos = photosData.map(photo => 
      photo.id === editingPhoto.id ? editingPhoto : photo
    );

    updatePhotosData(updatedPhotos);
    setEditingPhoto(null);
    
    addNotification({
      type: 'success',
      message: 'Photo updated successfully',
      duration: 3000
    });
  };

  const handleDeletePhoto = (id) => {
    const updatedPhotos = photosData.filter(photo => photo.id !== id);
    updatePhotosData(updatedPhotos);
    setShowDeleteDialog(null);
    
    addNotification({
      type: 'info',
      message: 'Photo deleted successfully',
      duration: 3000
    });
  };

  const getPhotosByCategory = () => {
    const grouped = {};
    photoCategories.forEach(category => {
      grouped[category] = photosData.filter(photo => photo.category === category);
    });
    return grouped;
  };

  const groupedPhotos = getPhotosByCategory();
  const totalPhotos = photosData.length;

  return (
    <div className="space-y-6">
      <Section 
        title="Photo Documentation" 
        icon={<Camera className="text-indigo-500" />}
        helpText="Upload and organize photos from your office visit with custom names and descriptions."
      >
        <div className="space-y-6">
          {/* Upload Section */}
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-600">
            <div className="flex justify-between items-center mb-4">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                  Photo Library ({totalPhotos} photos)
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Organize your visit photos with custom names and categories
                </p>
              </div>
              <Button onClick={() => setShowUploadModal(true)}>
                <Plus size={16} />
                Upload Photos
              </Button>
            </div>

            {totalPhotos === 0 ? (
              <div className="text-center py-12 text-gray-500 dark:text-gray-400">
                <Camera size={48} className="mx-auto mb-4 opacity-50" />
                <p className="text-lg font-medium mb-2">No photos uploaded yet</p>
                <p className="text-sm mb-4">Start documenting your visit by uploading photos</p>
                <Button onClick={() => setShowUploadModal(true)}>
                  <Camera size={16} />
                  Upload First Photos
                </Button>
              </div>
            ) : (
              <div className="space-y-6">
                {Object.entries(groupedPhotos).map(([category, categoryPhotos]) => {
                  if (categoryPhotos.length === 0) return null;
                  
                  return (
                    <div key={category} className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4">
                      <h4 className="text-md font-medium text-gray-900 dark:text-gray-100 mb-3 flex items-center">
                        <span className="bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300 px-2 py-1 rounded-full text-xs font-medium mr-2">
                          {categoryPhotos.length}
                        </span>
                        {category}
                      </h4>
                      
                      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                        {categoryPhotos.map(photo => (
                          <div key={photo.id} className="relative group bg-white dark:bg-gray-800 rounded-lg overflow-hidden border border-gray-200 dark:border-gray-600">
                            <div className="aspect-square">
                              <img
                                src={photo.url}
                                alt={photo.name}
                                className="w-full h-full object-cover"
                              />
                            </div>
                            
                            {/* Photo overlay with actions */}
                            <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-50 transition-opacity flex items-center justify-center opacity-0 group-hover:opacity-100">
                              <div className="flex space-x-2">
                                <button
                                  onClick={() => handleEditPhoto(photo)}
                                  className="p-2 bg-white text-gray-800 rounded-full hover:bg-gray-100 transition-colors"
                                  title="Edit"
                                >
                                  <Edit size={14} />
                                </button>
                                <button
                                  onClick={() => setShowDeleteDialog(photo)}
                                  className="p-2 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors"
                                  title="Delete"
                                >
                                  <Trash2 size={14} />
                                </button>
                              </div>
                            </div>
                            
                            {/* Photo info */}
                            <div className="p-3">
                              <h5 className="font-medium text-gray-900 dark:text-gray-100 text-sm truncate">
                                {photo.name}
                              </h5>
                              {photo.description && (
                                <p className="text-xs text-gray-600 dark:text-gray-400 mt-1 line-clamp-2">
                                  {photo.description}
                                </p>
                              )}
                              <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                                {new Date(photo.uploadDate).toLocaleDateString()}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </Section>

      {/* Upload Modal */}
      <Modal
        isOpen={showUploadModal}
        onClose={() => setShowUploadModal(false)}
        title="Upload Photos"
        size="lg"
      >
        <div className="space-y-4">
          <Select
            label="Category"
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            required
          >
            <option value="">Select Category</option>
            {photoCategories.map(category => (
              <option key={category} value={category}>{category}</option>
            ))}
          </Select>

          <PhotoUpload
            photos={uploadingPhotos}
            onPhotosChange={setUploadingPhotos}
            maxPhotos={20}
            label="Select Photos to Upload"
          />

          <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200 dark:border-gray-700">
            <Button variant="outline" onClick={() => setShowUploadModal(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleUploadPhotos}
              disabled={uploadingPhotos.length === 0 || !selectedCategory}
            >
              <Upload size={16} />
              Upload {uploadingPhotos.length} Photo{uploadingPhotos.length !== 1 ? 's' : ''}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Edit Photo Modal */}
      <Modal
        isOpen={!!editingPhoto}
        onClose={() => setEditingPhoto(null)}
        title="Edit Photo Details"
        size="md"
      >
        {editingPhoto && (
          <div className="space-y-4">
            <div className="aspect-video bg-gray-100 dark:bg-gray-700 rounded-lg overflow-hidden">
              <img
                src={editingPhoto.url}
                alt={editingPhoto.name}
                className="w-full h-full object-contain"
              />
            </div>

            <Input
              label="Photo Name *"
              value={editingPhoto.name}
              onChange={(e) => setEditingPhoto({ ...editingPhoto, name: e.target.value })}
              placeholder="Enter a descriptive name for this photo"
              required
            />

            <Select
              label="Category"
              value={editingPhoto.category}
              onChange={(e) => setEditingPhoto({ ...editingPhoto, category: e.target.value })}
            >
              {photoCategories.map(category => (
                <option key={category} value={category}>{category}</option>
              ))}
            </Select>

            <Textarea
              label="Description"
              value={editingPhoto.description}
              onChange={(e) => setEditingPhoto({ ...editingPhoto, description: e.target.value })}
              placeholder="Add a description or notes about this photo..."
              rows={3}
            />

            <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200 dark:border-gray-700">
              <Button variant="outline" onClick={() => setEditingPhoto(null)}>
                <X size={16} />
                Cancel
              </Button>
              <Button onClick={handleSavePhoto}>
                <Save size={16} />
                Save Changes
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        isOpen={!!showDeleteDialog}
        onClose={() => setShowDeleteDialog(null)}
        onConfirm={() => handleDeletePhoto(showDeleteDialog?.id)}
        title="Delete Photo"
        message={`Are you sure you want to delete "${showDeleteDialog?.name}"? This action cannot be undone.`}
        confirmText="Delete Photo"
        cancelText="Cancel"
        variant="danger"
      />
    </div>
  );
};

export default Photos;