import { 
  collection, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  doc, 
  getDocs,
  query,
  orderBy
} from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';

/**
 * Upload a file to Firebase Storage
 * @param {Object} storage - Firebase storage reference
 * @param {File} file - File to upload
 * @param {String} folder - Target folder
 * @returns {Promise<Object>} - File info with path and URL
 */
export const uploadFileToStorage = async (storage, file, folder) => {
  try {
    const storageRef = ref(storage, `${folder}/${file.name}`);
    const uploadTask = uploadBytes(storageRef, file);
    
    // Wait for upload to complete
    const snapshot = await uploadTask;
    
    // Get download URL
    const downloadURL = await getDownloadURL(snapshot.ref);
    
    return {
      name: file.name,
      path: snapshot.ref.fullPath,
      url: downloadURL
    };
  } catch (error) {
    console.error('Error uploading file:', error);
    throw error;
  }
};

/**
 * Fetch projects from Firestore with optional ordering by displayOrder
 * @param {Object} db - Firestore database reference
 * @param {Function} showMessage - Function to display messages
 * @param {Object} auth - Firebase auth reference
 * @returns {Promise<Array>} - Array of projects
 */
export const fetchProjects = async (db, showMessage, auth) => {
  try {
    console.log('Fetching projects from Firestore...');
    console.log('Firebase config:', db._app.options);
    console.log('Current user:', auth.currentUser?.email || 'No user');
    
    // Verify database connection
    try {
      const testDoc = await addDoc(collection(db, "connection_test"), {
        timestamp: new Date(),
        message: "Testing connection"
      });
      console.log("Database connection test successful:", testDoc.id);
      // Delete test doc to keep database clean
      await deleteDoc(doc(db, "connection_test", testDoc.id));
    } catch (connError) {
      console.error("Database connection test failed:", connError);
      throw new Error(`Database connection failed: ${connError.message}`);
    }
    
    const projectsCollection = collection(db, 'projects');
    console.log('Projects collection reference:', projectsCollection);
    
    // First try to get all projects without ordering - this ensures we get all projects even if the index fails
    const simpleSnapshot = await getDocs(projectsCollection);
    console.log('Got projects snapshot, empty?', simpleSnapshot.empty, 'size:', simpleSnapshot.size);
    
    // Debug: Look at the raw data from first 3 documents
    if (!simpleSnapshot.empty) {
      const firstFew = simpleSnapshot.docs.slice(0, 3);
      console.log('First few raw documents:');
      firstFew.forEach((doc, i) => {
        const data = doc.data();
        console.log(`Document ${i+1} - ID: ${doc.id}, Data:`, data);
        console.log(`Has displayOrder: ${data.displayOrder !== undefined}, Value: ${data.displayOrder}`);
        console.log(`Has createdAt: ${data.createdAt !== undefined}, Type: ${typeof data.createdAt}`);
      });
    }
    
    let projectsList = [];
    let needsDisplayOrderUpdate = false;
    
    // Now try with ordering by display order first, then createdAt
    if (!simpleSnapshot.empty) {
      try {
        // Get all projects without ordering first
        const allProjectsSnapshot = await getDocs(projectsCollection);
        projectsList = allProjectsSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        
        console.log('All projects (unordered):', projectsList.length);
        
        // Sort projects in JavaScript - first by displayOrder (if available), then by createdAt
        projectsList.sort((a, b) => {
          // If both have displayOrder, sort by it (asc)
          if (a.displayOrder !== undefined && b.displayOrder !== undefined) {
            return Number(a.displayOrder) - Number(b.displayOrder);
          }
          
          // If only one has displayOrder, it comes first
          if (a.displayOrder !== undefined) return -1;
          if (b.displayOrder !== undefined) return 1;
          
          // Otherwise sort by createdAt (desc)
          const aCreated = a.createdAt?.toDate?.() || new Date(a.createdAt || 0);
          const bCreated = b.createdAt?.toDate?.() || new Date(b.createdAt || 0);
          return bCreated - aCreated; // newest first when no displayOrder
        });
        
        console.log('Projects sorted client-side:', projectsList.length);
        console.log('Display orders after sorting:', projectsList.map(p => p.displayOrder || 'none'));
        
        // Check if any project is missing displayOrder or has invalid value
        const needsOrderUpdate = projectsList.some(p => 
          p.displayOrder === undefined || 
          p.displayOrder === null || 
          isNaN(p.displayOrder)
        );
        
        if (needsOrderUpdate) {
          needsDisplayOrderUpdate = true;
          console.warn('Some projects have missing or invalid displayOrder fields');
        }
      } catch (orderError) {
        console.warn('Error ordering projects - using unordered data instead:', orderError);
        
        // Map the raw documents to our projects list as a fallback
        console.log('Using unordered data as fallback, docs count:', simpleSnapshot.docs.length);
        projectsList = simpleSnapshot.docs.map(doc => {
          const data = doc.data();
          // Add proper ID to the data for React keys
          return {
            id: doc.id,
            ...data
          };
        });
        
        console.log('Created fallback projectsList with length:', projectsList.length);
        
        // Print first few items for debugging
        if (projectsList.length > 0) {
          console.log('First few fallback projects:');
          projectsList.slice(0, 3).forEach((item, i) => {
            console.log(`Fallback project ${i+1}:`, item);
          });
        }
        
        needsDisplayOrderUpdate = true;
      }
      
      // Auto-fix display orders if needed - this helps rebuild the index
      if (needsDisplayOrderUpdate && projectsList.length > 0) {
        console.log('Auto-fixing display orders for projects...');
        try {
          // Sort by createdAt first to have a consistent order
          projectsList.sort((a, b) => {
            const aCreated = a.createdAt?.toDate?.() || new Date(a.createdAt || 0);
            const bCreated = b.createdAt?.toDate?.() || new Date(b.createdAt || 0);
            return bCreated - aCreated; // newest first
          });
          
          // Update display orders
          for (let i = 0; i < projectsList.length; i++) {
            if (!projectsList[i].id) continue;
            
            const newDisplayOrder = i + 1;
            if (projectsList[i].displayOrder !== newDisplayOrder) {
              console.log(`Updating displayOrder for project ${projectsList[i].id}: ${projectsList[i].displayOrder} -> ${newDisplayOrder}`);
              
              // Update in Firestore
              const projectRef = doc(db, 'projects', projectsList[i].id);
              await updateDoc(projectRef, { 
                displayOrder: newDisplayOrder,
                updatedAt: new Date()
              });
              
              // Update in our local list
              projectsList[i].displayOrder = newDisplayOrder;
            }
          }
          
          console.log('Display orders updated successfully');
          showMessage('Project display orders updated successfully', 'success');
        } catch (updateError) {
          console.error('Failed to update display orders:', updateError);
        }
      }
    } else {
      console.warn('No projects found in the collection. Collection might be empty or permissions issue.');
    }
    
    // Make sure we're not returning an empty array if we have data
    if (projectsList.length === 0 && !simpleSnapshot.empty) {
      // Return the unordered data if we couldn't process it correctly
      const fallbackList = simpleSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      console.log('Returning fallback unordered list with length:', fallbackList.length);
      return fallbackList;
    }
    
    console.log('Fetched projects:', projectsList);
    return projectsList;
  } catch (error) {
    console.error('Error fetching projects:', error);
    showMessage('Error loading projects: ' + error.message, 'error');
    throw error;
  }
};

/**
 * Save or update project's display order
 * @param {Object} db - Firestore database reference
 * @param {String} projectId - Project ID to update
 * @param {Number} displayOrder - New display order value
 */
export const updateProjectDisplayOrder = async (db, projectId, displayOrder) => {
  try {
    const projectRef = doc(db, 'projects', projectId);
    await updateDoc(projectRef, { 
      displayOrder,
      updatedAt: new Date()
    });
    return true;
  } catch (error) {
    console.error('Error updating project display order:', error);
    throw error;
  }
};

/**
 * Save a new project to Firestore
 * @param {Object} db - Firestore database reference
 * @param {Object} projectData - Project data
 * @returns {Promise<String>} - New project ID
 */
export const saveNewProject = async (db, projectData) => {
  // Add timestamps and display order if needed
  const data = {
    ...projectData,
    createdAt: new Date(),
    updatedAt: new Date()
  };
  
  // If displayOrder isn't provided, get the highest current order and add 1
  if (data.displayOrder === undefined) {
    try {
      const projectsQuery = query(collection(db, 'projects'), orderBy('displayOrder', 'desc'));
      const snapshot = await getDocs(projectsQuery);
      
      if (!snapshot.empty) {
        const highestOrder = snapshot.docs[0].data().displayOrder || 0;
        data.displayOrder = parseInt(highestOrder) + 1;
      } else {
        data.displayOrder = 1; // First project
      }
    } catch (error) {
      console.warn('Error determining display order, setting to 999:', error);
      data.displayOrder = 999; // Fallback
    }
  }
  
  // Save to Firestore
  const docRef = await addDoc(collection(db, 'projects'), data);
  
  // Update with ID
  await updateDoc(docRef, { id: docRef.id });
  
  return docRef.id;
};

/**
 * Update an existing project
 * @param {Object} db - Firestore database reference
 * @param {Object} project - Project data with ID
 */
export const updateProject = async (db, project) => {
  if (!project || !project.id) {
    throw new Error('No project ID provided for update');
  }
  
  // Update timestamp
  const projectData = {
    ...project,
    updatedAt: new Date()
  };
  
  // Ensure displayOrder is a number if it exists
  if (projectData.displayOrder !== undefined && projectData.displayOrder !== null) {
    projectData.displayOrder = Number(projectData.displayOrder);
    console.log(`Project update: converted displayOrder to number: ${projectData.displayOrder}, type: ${typeof projectData.displayOrder}`);
  }
  
  // Update in Firestore
  await updateDoc(doc(db, 'projects', project.id), projectData);
  
  return true;
};

/**
 * Delete a project
 * @param {Object} db - Firestore database reference
 * @param {String} projectId - Project ID to delete
 */
export const deleteProject = async (db, projectId) => {
  if (!projectId) throw new Error('No project ID provided for deletion');
  
  // Delete from Firestore
  await deleteDoc(doc(db, 'projects', projectId));
  
  return true;
};