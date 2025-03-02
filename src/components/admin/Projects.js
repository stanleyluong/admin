import React, { useState, useEffect, useCallback } from 'react';
import { DragDropContext, Droppable, Draggable } from 'react-beautiful-dnd';
import { storage } from '../../firebase/config';
import { collection, getDocs } from 'firebase/firestore';
import { 
  fetchProjects, 
  uploadFileToStorage, 
  saveNewProject, 
  updateProject, 
  deleteProject,
  updateProjectDisplayOrder
} from '../../utils/firebaseUtils';
import MessageDisplay from './MessageDisplay';
import useMessage from '../../hooks/useMessage';

const Projects = ({ db, auth }) => {
  const [projects, setProjects] = useState([]);
  const [projectsLoading, setProjectsLoading] = useState(true); // Start with loading state
  const [editingProject, setEditingProject] = useState(null);
  const [newProject, setNewProject] = useState({
    title: '',
    category: '',
    url: '',
    displayOrder: '', // Add default displayOrder field
    images: [],
    tags: []
  });
  const [newTag, setNewTag] = useState('');
  const [uploadingImages, setUploadingImages] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  
  const { message, messageType, showMessage } = useMessage();
  
  // Load projects from Firestore - define before using in useEffect
  const loadProjects = useCallback(async () => {
    setProjectsLoading(true);
    setError(null);
    
    try {
      console.log('Projects component: Loading projects...');
      
      // Try using the fetchProjects util function first
      try {
        const projectsList = await fetchProjects(db, showMessage, auth);
        
        console.log('Projects component: Received projects:', projectsList?.length || 0);
        
        // Check if projectsList is valid 
        if (!projectsList || projectsList.length === 0) {
          console.warn('Projects component: No projects received from fetchProjects, trying direct approach');
          throw new Error('No projects returned from fetchProjects');
        } else {
          // Ensure all projects have valid IDs
          const validProjects = projectsList.filter(project => project && project.id);
          
          if (validProjects.length !== projectsList.length) {
            console.warn(`Projects component: Filtered out ${projectsList.length - validProjects.length} invalid projects`);
          }
          
          // Set state with valid projects
          setProjects(validProjects);
          
          if (validProjects.length > 0) {
            showMessage(`Loaded ${validProjects.length} projects successfully`, 'success');
          }
          return; // Exit early if successful
        }
      } catch (utilError) {
        console.error('Projects component: Failed using fetchProjects util:', utilError);
        
        // EMERGENCY FALLBACK: Try to get the data directly if the util function fails
        console.warn('Projects component: Trying emergency direct fetch fallback');
        
        const projectsCollection = collection(db, 'projects');
        const simpleSnapshot = await getDocs(projectsCollection);
        
        if (simpleSnapshot.empty) {
          console.warn('Projects component: Direct fetch returned empty collection');
          setProjects([]);
          showMessage('No projects found. Use the form above to create your first project.', 'info');
        } else {
          console.log('Direct fetch found', simpleSnapshot.size, 'projects');
          
          // Map documents to data objects with IDs
          const directProjects = simpleSnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
          }));
          
          console.log('Direct projects list created with', directProjects.length, 'items');
          
          // Check for valid projects
          const validDirectProjects = directProjects.filter(p => p && p.id);
          setProjects(validDirectProjects);
          
          showMessage(`Loaded ${validDirectProjects.length} projects (emergency fallback)`, 'success');
        }
      }
    } catch (error) {
      console.error('Projects component: Critical error in loadProjects:', error);
      setError(error.message || 'Unknown error loading projects');
      showMessage('Critical error loading projects: ' + error.message, 'error');
      // Reset to empty array to avoid undefined errors
      setProjects([]);
    } finally {
      setProjectsLoading(false);
    }
  }, [db, auth, showMessage]);
  
  // Load projects on component mount
  useEffect(() => {
    loadProjects();
  }, [loadProjects]);
  
  // Handle image upload for projects
  const handleProjectImageUpload = async (event, isThumb = false) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;
    
    setUploadingImages(true);
    setUploadProgress(0);
    
    try {
      const folder = isThumb ? 'portfolio/thumbnails' : 'portfolio/details';
      const updatedEntity = editingProject ? { ...editingProject } : { ...newProject };
      
      // Create or update images array if it doesn't exist
      if (!updatedEntity.images) {
        updatedEntity.images = [];
      }
      
      // Process each file
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        
        try {
          const fileInfo = await uploadFileToStorage(storage, file, folder);
          
          // Update progress
          setUploadProgress(Math.round(((i + 1) / files.length) * 100));
          
          if (isThumb) {
            // Set as thumbnail
            updatedEntity.thumbnail = fileInfo.url;
          } else {
            // Add to images array
            updatedEntity.images.push(fileInfo.url);
          }
        } catch (error) {
          console.error(`Failed to upload file ${file.name}:`, error);
          showMessage(`Failed to upload ${file.name}: ${error.message}`, 'error');
        }
      }
      
      // Update state based on edit mode
      if (editingProject) {
        setEditingProject(updatedEntity);
      } else {
        setNewProject(updatedEntity);
      }
      
      showMessage('Images uploaded successfully!', 'success');
    } catch (error) {
      console.error('Error handling image upload:', error);
      showMessage('Error uploading images: ' + error.message, 'error');
    } finally {
      setUploadingImages(false);
      setUploadProgress(0);
    }
  };
  
  // Save a new project
  const handleSaveNewProject = async () => {
    setLoading(true);
    
    try {
      // Validate required fields
      if (!newProject.title || !newProject.category) {
        showMessage('Title and category are required', 'error');
        setLoading(false);
        return;
      }
      
      await saveNewProject(db, newProject);
      
      // Reset form and reload projects
      setNewProject({
        title: '',
        category: '',
        url: '',
        images: [],
        tags: []
      });
      
      await loadProjects();
      showMessage('Project created successfully!', 'success');
    } catch (error) {
      console.error('Error creating project:', error);
      showMessage('Error creating project: ' + error.message, 'error');
    } finally {
      setLoading(false);
    }
  };
  
  // Update an existing project
  const handleUpdateProject = async () => {
    if (!editingProject || !editingProject.id) {
      showMessage('No project selected for update', 'error');
      return;
    }
    
    setLoading(true);
    
    try {
      // Validate required fields
      if (!editingProject.title || !editingProject.category) {
        showMessage('Title and category are required', 'error');
        setLoading(false);
        return;
      }
      
      // Ensure tags array is initialized
      if (!editingProject.tags) {
        editingProject.tags = [];
      }
      
      await updateProject(db, editingProject);
      
      // Reset editing state and reload projects
      setEditingProject(null);
      await loadProjects();
      showMessage('Project updated successfully!', 'success');
    } catch (error) {
      console.error('Error updating project:', error);
      showMessage('Error updating project: ' + error.message, 'error');
    } finally {
      setLoading(false);
    }
  };
  
  // Delete a project
  const handleDeleteProject = async (projectId) => {
    if (!projectId) return;
    
    // Confirm with user
    const confirmed = window.confirm('Are you sure you want to delete this project? This cannot be undone.');
    if (!confirmed) return;
    
    setLoading(true);
    
    try {
      await deleteProject(db, projectId);
      
      // Reload projects
      await loadProjects();
      showMessage('Project deleted successfully', 'success');
    } catch (error) {
      console.error('Error deleting project:', error);
      showMessage('Error deleting project: ' + error.message, 'error');
    } finally {
      setLoading(false);
    }
  };
  
  // Add a tag to a project
  const handleAddTag = (isEditMode = false, e) => {
    e.preventDefault();
    if (!newTag.trim()) return;
    
    if (isEditMode && editingProject) {
      // Add tag to editing project
      const updatedTags = [...(editingProject.tags || [])];
      if (!updatedTags.includes(newTag.trim())) {
        updatedTags.push(newTag.trim());
        setEditingProject({...editingProject, tags: updatedTags});
      }
    } else {
      // Add tag to new project
      const updatedTags = [...(newProject.tags || [])];
      if (!updatedTags.includes(newTag.trim())) {
        updatedTags.push(newTag.trim());
        setNewProject({...newProject, tags: updatedTags});
      }
    }
    setNewTag('');
  };
  
  // Remove a tag from a project
  const handleRemoveTag = (tag, isEditMode = false) => {
    if (isEditMode && editingProject) {
      // Remove tag from editing project
      const updatedTags = editingProject.tags.filter(t => t !== tag);
      setEditingProject({...editingProject, tags: updatedTags});
    } else {
      // Remove tag from new project
      const updatedTags = newProject.tags.filter(t => t !== tag);
      setNewProject({...newProject, tags: updatedTags});
    }
  };
  
  // Handle drag end for reordering projects
  const handleDragEnd = async (result) => {
    console.log('Drag end result:', result);
    
    // Dropped outside the list
    if (!result.destination) {
      console.log('Dropped outside list, ignoring');
      return;
    }
    
    const { source, destination } = result;
    
    // If dropped in the same position
    if (source.index === destination.index) {
      console.log('Dropped in same position, ignoring');
      return;
    }
    
    // Validate projects array has items
    if (!projects || projects.length === 0) {
      console.error('Cannot reorder - projects array is empty');
      showMessage('Cannot reorder - no projects to reorder', 'error');
      return;
    }
    
    // Validate source and destination indexes
    if (source.index < 0 || source.index >= projects.length ||
        destination.index < 0 || destination.index >= projects.length) {
      console.error('Invalid source or destination index', source.index, destination.index, 'projects length', projects.length);
      showMessage('Invalid reordering operation', 'error');
      return;
    }
    
    console.log('Reordering project from index', source.index, 'to', destination.index);
    
    // Create a deep copy of the projects array to avoid reference issues
    const newProjects = JSON.parse(JSON.stringify(projects));
    
    // Reorder the projects list
    const [removed] = newProjects.splice(source.index, 1);
    newProjects.splice(destination.index, 0, removed);
    
    // Update local state immediately for responsive UI
    setProjects(newProjects);
    
    // Update display order for affected projects
    try {
      setLoading(true);
      console.log('Updating display order for', newProjects.length, 'projects');
      
      // Update all projects with new display order
      for (let i = 0; i < newProjects.length; i++) {
        if (!newProjects[i] || !newProjects[i].id) {
          console.error('Invalid project at index', i, newProjects[i]);
          continue;
        }
        
        console.log('Setting display order', i + 1, 'for project', newProjects[i].id);
        await updateProjectDisplayOrder(db, newProjects[i].id, i + 1);
      }
      
      showMessage('Project order updated successfully!', 'success');
    } catch (error) {
      console.error('Error updating project order:', error);
      showMessage('Error updating project order: ' + error.message, 'error');
      // Reload projects to reset order in case of error
      await loadProjects();
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <div className="bg-lightBlue bg-opacity-30 p-6 rounded-lg">
      <h3 className="text-2xl font-semibold text-lightestSlate mb-6">Manage Projects</h3>
      
      <MessageDisplay message={message} messageType={messageType} />
      
      {/* Create New Project Form */}
      <div className="mb-8 bg-lightBlue bg-opacity-50 p-4 rounded-lg">
        <h4 className="text-lg font-medium text-green mb-4">Create New Project</h4>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <div>
            <label className="block text-lightSlate mb-1">Title</label>
            <input
              type="text"
              value={newProject.title}
              onChange={(e) => setNewProject({...newProject, title: e.target.value})}
              className="w-full p-2 bg-darkBlue border border-lightBlue rounded"
            />
          </div>
          
          <div>
            <label className="block text-lightSlate mb-1">Category</label>
            <input
              type="text"
              value={newProject.category}
              onChange={(e) => setNewProject({...newProject, category: e.target.value})}
              className="w-full p-2 bg-darkBlue border border-lightBlue rounded"
            />
          </div>
          
          <div>
            <label className="block text-lightSlate mb-1">URL (Website or leave empty)</label>
            <input
              type="text"
              value={newProject.url}
              onChange={(e) => setNewProject({...newProject, url: e.target.value})}
              className="w-full p-2 bg-darkBlue border border-lightBlue rounded"
            />
          </div>
          
          <div>
            <label className="block text-lightSlate mb-1">Display Order (Optional)</label>
            <input
              type="number"
              value={newProject.displayOrder || ''}
              onChange={(e) => {
                const value = e.target.value ? parseInt(e.target.value) : '';
                setNewProject({...newProject, displayOrder: value});
              }}
              placeholder="Leave empty for auto-assign"
              className="w-full p-2 bg-darkBlue border border-lightBlue rounded"
            />
            <p className="text-xs text-lightSlate mt-1">Projects will be displayed in this order (lowest first)</p>
          </div>
        </div>
        
        {/* Tags Section */}
        <div className="mb-4 p-3 bg-lightBlue bg-opacity-50 rounded-lg border border-green">
          <label className="block text-green font-medium mb-2">Project Tags</label>
          <p className="text-sm text-lightSlate mb-2">Add technology tags to highlight skills used (HTML, CSS, React, etc.)</p>
          <div className="flex flex-wrap items-center">
            <form onSubmit={(e) => handleAddTag(false, e)} className="flex w-full">
              <input
                type="text"
                value={newTag}
                onChange={(e) => setNewTag(e.target.value)}
                placeholder="Add a tag (e.g., html, css)"
                className="flex-grow p-2 bg-darkBlue border border-lightBlue rounded-l"
              />
              <button
                type="submit"
                className="py-2 px-3 bg-green text-darkBlue rounded-r hover:bg-opacity-90"
              >
                Add
              </button>
            </form>
          </div>
          
          {/* Display Tags */}
          <div className="mt-3">
            <span className="text-sm text-lightSlate">Current tags:</span>
            {newProject.tags && newProject.tags.length > 0 ? (
              <div className="flex flex-wrap gap-2 mt-2">
                {newProject.tags.map((tag, index) => (
                  <div 
                    key={index} 
                    className="flex items-center bg-green bg-opacity-20 text-green px-2 py-1 rounded"
                  >
                    <span className="text-sm">{tag}</span>
                    <button
                      onClick={() => handleRemoveTag(tag, false)}
                      className="ml-2 text-green hover:text-white"
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-sm text-lightSlate mt-1 italic">No tags added yet</div>
            )}
          </div>
        </div>
        
        {/* Thumbnail Upload */}
        <div className="mb-4">
          <label className="block text-lightSlate mb-1">Thumbnail Image</label>
          <div className="flex items-center">
            <input
              type="file"
              accept="image/*"
              onChange={(e) => handleProjectImageUpload(e, true)}
              className="hidden"
              id="thumbnail-upload"
              disabled={uploadingImages}
            />
            <label
              htmlFor="thumbnail-upload"
              className="cursor-pointer py-2 px-4 bg-green bg-opacity-20 text-green rounded hover:bg-opacity-30"
            >
              Upload Thumbnail
            </label>
            
            {newProject.thumbnail && (
              <div className="ml-4 flex items-center">
                <img 
                  src={newProject.thumbnail} 
                  alt="Thumbnail" 
                  className="h-10 w-10 object-cover rounded"
                />
                <span className="ml-2 text-lightSlate text-sm">Thumbnail uploaded</span>
              </div>
            )}
          </div>
        </div>
        
        {/* Gallery Images Upload */}
        <div className="mb-4">
          <label className="block text-lightSlate mb-1">Gallery Images</label>
          <div className="flex items-center">
            <input
              type="file"
              accept="image/*"
              multiple
              onChange={(e) => handleProjectImageUpload(e, false)}
              className="hidden"
              id="gallery-upload"
              disabled={uploadingImages}
            />
            <label
              htmlFor="gallery-upload"
              className="cursor-pointer py-2 px-4 bg-green bg-opacity-20 text-green rounded hover:bg-opacity-30"
            >
              Upload Gallery Images
            </label>
            
            {uploadingImages && (
              <div className="ml-4 flex items-center">
                <div className="w-40 h-2 bg-darkBlue rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-green"
                    style={{ width: `${uploadProgress}%` }}
                  ></div>
                </div>
                <span className="ml-2 text-lightSlate text-sm">{uploadProgress}%</span>
              </div>
            )}
          </div>
          
          {/* Gallery Preview */}
          {newProject.images && newProject.images.length > 0 && (
            <div className="mt-4">
              <h5 className="text-lightSlate text-sm mb-2">Gallery Images ({newProject.images.length})</h5>
              <div className="flex flex-wrap gap-2">
                {newProject.images.map((img, index) => (
                  <div key={index} className="relative">
                    <img 
                      src={img} 
                      alt={`Gallery ${index}`} 
                      className="h-16 w-16 object-cover rounded"
                    />
                    <button
                      onClick={() => {
                        const newImages = [...newProject.images];
                        newImages.splice(index, 1);
                        setNewProject({...newProject, images: newImages});
                      }}
                      className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs"
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
        
        <div className="flex justify-end gap-3 mt-6">
          <button
            onClick={handleSaveNewProject}
            disabled={loading}
            className="py-2 px-4 bg-green text-darkBlue rounded hover:bg-opacity-90"
          >
            {loading ? 'Saving...' : 'Create Project'}
          </button>
        </div>
      </div>
      
      {/* Projects List with Drag and Drop */}
      <div>
        <h4 className="text-lg font-medium text-green mb-4">Projects List (Drag to Reorder)</h4>
        
        {error && (
          <div className="bg-red-900 bg-opacity-20 p-4 mb-4 rounded-lg border border-red-500">
            <h5 className="text-red-400 font-medium mb-2">Error Loading Projects</h5>
            <p className="text-lightSlate">{error}</p>
            <button 
              onClick={loadProjects}
              className="mt-3 py-1 px-3 bg-red-600 text-white rounded hover:bg-red-700"
            >
              Retry
            </button>
          </div>
        )}
        
        {projectsLoading ? (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-green mx-auto"></div>
            <p className="mt-2 text-lightSlate">Loading projects...</p>
          </div>
        ) : projects.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-lightSlate mb-4">No projects found. Create your first project above.</p>
            <button 
              onClick={loadProjects}
              className="py-1 px-3 bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              Refresh Projects List
            </button>
          </div>
        ) : (
          <DragDropContext onDragEnd={handleDragEnd}>
            <Droppable droppableId="projects-list">
              {(provided) => (
                <div 
                  {...provided.droppableProps}
                  ref={provided.innerRef}
                  className="space-y-4"
                >
                  {projects.map((project, index) => {
                    // Ensure we have valid project data
                    if (!project || !project.id) {
                      console.warn('Invalid project data:', project);
                      return null;
                    }
                    
                    // Ensure project.id is a string for react-beautiful-dnd
                    const draggableId = String(project.id);
                    console.log(`Setting up draggable for project: ${project.title}, ID: ${draggableId}`);
                    
                    return (
                    <Draggable key={draggableId} draggableId={draggableId} index={index}>
                      {(provided, snapshot) => (
                        <div
                          ref={provided.innerRef}
                          {...provided.draggableProps}
                          className={`bg-lightBlue ${snapshot.isDragging ? 'bg-opacity-40' : 'bg-opacity-20'} p-4 rounded-lg flex flex-wrap md:flex-nowrap gap-4`}
                        >
                          {/* Drag Handle */}
                          <div 
                            {...provided.dragHandleProps}
                            className="w-8 flex-shrink-0 flex items-center justify-center cursor-grab"
                          >
                            <div className="w-4 h-12 flex flex-col justify-between">
                              <div className="w-full h-0.5 bg-green"></div>
                              <div className="w-full h-0.5 bg-green"></div>
                              <div className="w-full h-0.5 bg-green"></div>
                              <div className="w-full h-0.5 bg-green"></div>
                            </div>
                          </div>
                          
                          {/* Thumbnail */}
                          <div className="w-32 h-32 bg-darkBlue rounded overflow-hidden flex-shrink-0 relative">
                            {project.thumbnail || project.image ? (
                              <div className="cursor-pointer" 
                                   onClick={() => window.open(project.thumbnail || project.image, '_blank')}>
                                <img 
                                  src={project.thumbnail || project.image} 
                                  alt={project.title} 
                                  className="w-full h-full object-contain hover:scale-110 transition-transform" 
                                  title="Click to view full-size image"
                                />
                                <div className="absolute bottom-0 right-0 p-1 bg-black bg-opacity-50 text-white text-xs">
                                  🔍 Zoom
                                </div>
                              </div>
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-lightSlate text-xs">No image</div>
                            )}
                          </div>
                          
                          {/* Project Info or Edit Form */}
                          {editingProject && editingProject.id === project.id ? (
                            <div className="flex-grow bg-darkBlue bg-opacity-50 p-3 rounded">
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                <div>
                                  <label className="block text-lightSlate text-xs mb-1">Title</label>
                                  <input
                                    type="text"
                                    value={editingProject.title}
                                    onChange={(e) => setEditingProject({...editingProject, title: e.target.value})}
                                    className="w-full p-1 text-sm bg-darkBlue border border-lightBlue rounded"
                                  />
                                </div>
                                <div>
                                  <label className="block text-lightSlate text-xs mb-1">Category</label>
                                  <input
                                    type="text"
                                    value={editingProject.category}
                                    onChange={(e) => setEditingProject({...editingProject, category: e.target.value})}
                                    className="w-full p-1 text-sm bg-darkBlue border border-lightBlue rounded"
                                  />
                                </div>
                                <div>
                                  <label className="block text-lightSlate text-xs mb-1">URL</label>
                                  <input
                                    type="text"
                                    value={editingProject.url || ''}
                                    onChange={(e) => setEditingProject({...editingProject, url: e.target.value})}
                                    className="w-full p-1 text-sm bg-darkBlue border border-lightBlue rounded"
                                  />
                                </div>
                                <div>
                                  <label className="block text-lightSlate text-xs mb-1">Thumbnail</label>
                                  <div className="flex items-center">
                                    <input
                                      type="file"
                                      accept="image/*"
                                      onChange={(e) => handleProjectImageUpload(e, true)}
                                      className="hidden"
                                      id={`thumbnail-upload-${project.id}`}
                                      disabled={uploadingImages}
                                    />
                                    <label
                                      htmlFor={`thumbnail-upload-${project.id}`}
                                      className="cursor-pointer py-1 px-2 text-xs bg-green bg-opacity-20 text-green rounded hover:bg-opacity-30"
                                    >
                                      Upload
                                    </label>
                                  </div>
                                </div>
                              </div>
                              
                              <div className="mt-3 px-2 py-2 bg-darkBlue bg-opacity-70 rounded border border-lightBlue">
                                <label className="block text-green text-xs font-medium mb-1">Project Tags</label>
                                <div className="flex flex-wrap items-center">
                                  <form onSubmit={(e) => handleAddTag(true, e)} className="flex w-full">
                                    <input
                                      type="text"
                                      value={newTag}
                                      onChange={(e) => setNewTag(e.target.value)}
                                      placeholder="Add a tag (e.g., html, css)"
                                      className="flex-grow p-1 text-sm bg-darkBlue border border-lightBlue rounded-l"
                                    />
                                    <button
                                      type="submit"
                                      className="py-1 px-2 text-xs bg-green text-darkBlue rounded-r hover:bg-opacity-90"
                                    >
                                      Add
                                    </button>
                                  </form>
                                </div>
                                
                                {/* Display Tags */}
                                <div className="mt-2">
                                  <span className="text-xs text-lightSlate">Current tags:</span>
                                  {editingProject.tags && editingProject.tags.length > 0 ? (
                                    <div className="flex flex-wrap gap-1 mt-1">
                                      {editingProject.tags.map((tag, idx) => (
                                        <div 
                                          key={idx} 
                                          className="flex items-center bg-green bg-opacity-20 text-green px-2 py-0.5 rounded text-xs"
                                        >
                                          <span>{tag}</span>
                                          <button
                                            onClick={() => handleRemoveTag(tag, true)}
                                            className="ml-1 text-green hover:text-white"
                                          >
                                            ×
                                          </button>
                                        </div>
                                      ))}
                                    </div>
                                  ) : (
                                    <div className="text-xs text-lightSlate mt-1 italic">No tags added yet</div>
                                  )}
                                </div>
                              </div>
                              
                              <div className="mt-3">
                                <label className="block text-lightSlate text-xs mb-1">Gallery Images</label>
                                <div className="flex items-center">
                                  <input
                                    type="file"
                                    accept="image/*"
                                    multiple
                                    onChange={(e) => handleProjectImageUpload(e, false)}
                                    className="hidden"
                                    id={`gallery-upload-${project.id}`}
                                    disabled={uploadingImages}
                                  />
                                  <label
                                    htmlFor={`gallery-upload-${project.id}`}
                                    className="cursor-pointer py-1 px-2 text-xs bg-green bg-opacity-20 text-green rounded hover:bg-opacity-30"
                                  >
                                    Upload Gallery
                                  </label>
                                </div>
                                
                                {editingProject.images && editingProject.images.length > 0 && (
                                  <div className="flex flex-wrap gap-1 mt-2 max-h-16 overflow-y-auto">
                                    {editingProject.images.map((img, idx) => (
                                      <div key={idx} className="relative w-8 h-8">
                                        <img 
                                          src={img} 
                                          alt={`Gallery ${idx}`} 
                                          className="w-full h-full object-cover rounded"
                                        />
                                        <button
                                          onClick={() => {
                                            const newImages = [...editingProject.images];
                                            newImages.splice(idx, 1);
                                            setEditingProject({...editingProject, images: newImages});
                                          }}
                                          className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full w-3 h-3 flex items-center justify-center text-xs"
                                        >
                                          ×
                                        </button>
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </div>
                              
                              <div className="flex justify-end gap-2 mt-3">
                                <button
                                  onClick={() => setEditingProject(null)}
                                  className="py-1 px-2 text-xs border border-lightSlate text-lightSlate rounded hover:bg-lightBlue hover:bg-opacity-30"
                                >
                                  Cancel
                                </button>
                                <button
                                  onClick={handleUpdateProject}
                                  disabled={loading}
                                  className="py-1 px-2 text-xs bg-green text-darkBlue rounded hover:bg-opacity-90"
                                >
                                  {loading ? 'Saving...' : 'Update'}
                                </button>
                              </div>
                            </div>
                          ) : (
                            <div className="flex-grow">
                              <h5 className="text-lg font-medium text-lightestSlate">{project.title}</h5>
                              <p className="text-sm text-green mb-2">{project.category}</p>
                              <p className="text-xs text-lightSlate mb-1">Display Order: {project.displayOrder || 'Not set'}</p>
                              {project.url && (
                                <p className="text-xs text-lightSlate mb-1 truncate">
                                  URL: {project.url.substring(0, 50)}{project.url.length > 50 ? '...' : ''}
                                </p>
                              )}
                              <p className="text-xs text-lightSlate mb-1">
                                {project.images && project.images.length > 0 ? 
                                  `${project.images.length} gallery images` : 
                                  'No gallery images'}
                              </p>
                              
                              {/* Display tags */}
                              {project.tags && project.tags.length > 0 && (
                                <div className="mt-2">
                                  <p className="text-xs text-lightSlate mb-1">Tags:</p>
                                  <div className="flex flex-wrap gap-1">
                                    {project.tags.map((tag, idx) => (
                                      <span key={idx} className="text-xs bg-green bg-opacity-20 text-green px-2 py-0.5 rounded">
                                        {tag}
                                      </span>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </div>
                          )}
                          
                          {/* Actions */}
                          <div className="flex flex-col justify-center gap-2">
                            {editingProject && editingProject.id === project.id ? (
                              null
                            ) : (
                              <>
                                <button
                                  onClick={() => {
                                    // Initialize tags array if it doesn't exist
                                    const projectToEdit = { ...project };
                                    if (!projectToEdit.tags) {
                                      projectToEdit.tags = [];
                                    }
                                    setEditingProject(projectToEdit);
                                  }}
                                  className="py-1 px-3 text-sm bg-green bg-opacity-20 text-green rounded hover:bg-opacity-30"
                                >
                                  Edit
                                </button>
                                <button
                                  onClick={() => handleDeleteProject(project.id)}
                                  className="py-1 px-3 text-sm bg-red-500 bg-opacity-20 text-red-400 rounded hover:bg-opacity-30"
                                >
                                  Delete
                                </button>
                              </>
                            )}
                          </div>
                        </div>
                      )}
                    </Draggable>
                  );
                  })}
                  {provided.placeholder}
                </div>
              )}
            </Droppable>
          </DragDropContext>
        )}
      </div>
    </div>
  );
};

export default Projects;