import { useState, useEffect, useCallback } from 'react';
import { Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';
import { getAuth, signInWithEmailAndPassword, signOut } from 'firebase/auth';
import { db, storage } from './firebase/config';
import { 
  collection, 
  getDocs, 
  getDoc,
  addDoc, 
  updateDoc, 
  doc, 
  deleteDoc,
  query,
  orderBy,
  setDoc
} from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { setFirebaseConfig } from './firebase/config';
import Projects from './components/admin/Projects';
import MessageDisplay from './components/admin/MessageDisplay';
import Dashboard from './components/admin/Dashboard';
import AdminLayout from './components/admin/AdminLayout';

const Admin = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState(''); // 'success', 'error', or 'info'
  
  // Router hooks
  const navigate = useNavigate();
  const location = useLocation();
  
  // Projects state
  const [projects, setProjects] = useState([]);
  const [projectsLoading, setProjectsLoading] = useState(false);
  const [editingProject, setEditingProject] = useState(null);
  const [newProject, setNewProject] = useState({
    title: '',
    category: '',
    url: '',
    images: []
  });
  const [uploadingImages, setUploadingImages] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  
  // Certificates state
  const [certificates, setCertificates] = useState([]);
  const [certificatesLoading, setCertificatesLoading] = useState(false);
  const [editingCertificate, setEditingCertificate] = useState(null);
  const [newCertificate, setNewCertificate] = useState({
    school: '',
    course: '',
    date: '',
    image: ''
  });
  
  // Skills state
  const [skills, setSkills] = useState([]);
  const [skillsLoading, setSkillsLoading] = useState(false);
  const [editingSkill, setEditingSkill] = useState(null);
  const [newSkill, setNewSkill] = useState({
    name: '',
    level: '75%',
    category: 'Frontend'
  });
  
  // Work experience state
  const [workExperience, setWorkExperience] = useState([]);
  const [workLoading, setWorkLoading] = useState(false);
  const [editingWork, setEditingWork] = useState(null);
  const [newWork, setNewWork] = useState({
    company: '',
    title: '',
    years: '',
    description: ''
  });
  
  // Education state
  const [education, setEducation] = useState([]);
  const [educationLoading, setEducationLoading] = useState(false);
  const [editingEducation, setEditingEducation] = useState(null);
  const [newEducation, setNewEducation] = useState({
    school: '',
    degree: '',
    graduated: '',
    description: ''
  });
  
  // Profile state
  const [profile, setProfile] = useState(null);
  const [profileLoading, setProfileLoading] = useState(false);
  const [editingProfile, setEditingProfile] = useState(false);
  
  // Form display state
  const [showConfigForm, setShowConfigForm] = useState(false);
  const [configText, setConfigText] = useState('');

  // Get auth instance with persistence
  const auth = getAuth();
  
  // Show message function
  const showMessage = useCallback((msg, type) => {
    setMessage(msg);
    setMessageType(type);
    setTimeout(() => {
      setMessage('');
      setMessageType('');
    }, 5000);
  }, []);
  
  // Function to load all data types with proper error handling
  const loadAllData = useCallback(async () => {
    if (!user) {
      console.log("No user, can't load data");
      return;
    }
    
    console.log("User authenticated, loading data...");
    showMessage("Loading data...", "info");
    
    try {
      // Track loading state
      let successCount = 0;
      const totalDataTypes = 5; // Number of data types to load
      
      // Load projects (for dashboard display only)
      try {
        await fetchProjects();
        console.log("Projects loaded successfully");
        successCount++;
      } catch (err) {
        console.error("Projects fetch failed:", err);
        showMessage("Error loading projects: " + err.message, "error");
      }
      
      // Load certificates
      try {
        await fetchCertificates();
        console.log("Certificates loaded successfully");
        successCount++;
      } catch (err) {
        console.error("Certificates fetch failed:", err);
        showMessage("Error loading certificates: " + err.message, "error");
      }
      
      // Load profile
      try {
        await fetchProfile();
        console.log("Profile loaded successfully");
        successCount++;
      } catch (err) {
        console.error("Profile fetch failed:", err);
        showMessage("Error loading profile: " + err.message, "error");
      }
      
      // Load skills
      try {
        await fetchSkills();
        console.log("Skills loaded successfully");
        successCount++;
      } catch (err) {
        console.error("Skills fetch failed:", err);
        showMessage("Error loading skills: " + err.message, "error");
      }
      
      // Load work experience
      try {
        await fetchWorkExperience();
        console.log("Work experience loaded successfully");
        successCount++;
      } catch (err) {
        console.error("Work experience fetch failed:", err);
        showMessage("Error loading work experience: " + err.message, "error");
      }
      
      // Load education if function exists
      if (typeof fetchEducation === 'function') {
        try {
          await fetchEducation();
          console.log("Education loaded successfully");
          // Not counting this in the success count because it's optional
        } catch (err) {
          console.error("Education fetch failed:", err);
          showMessage("Error loading education: " + err.message, "error");
        }
      } else {
        console.warn("fetchEducation function not defined yet");
      }
      
      // Show final status
      if (successCount === totalDataTypes) {
        console.log("All data loaded successfully");
        showMessage("All data loaded successfully", "success");
      } else {
        console.log(`Loaded ${successCount}/${totalDataTypes} data types`);
        showMessage(`Loaded ${successCount}/${totalDataTypes} data types`, "info");
      }
      
    } catch (error) {
      console.error("Global error loading data:", error);
      showMessage("Error loading data: " + error.message, "error");
    }
  }, [user, showMessage]);

  // Handle authentication and initial data loading
  useEffect(() => {
    console.log("Admin component mounted, setting up auth listener");
    
    // Check if user is already logged in
    const unsubscribe = auth.onAuthStateChanged((authUser) => {
      if (authUser) {
        console.log("User authenticated:", authUser.email);
        setUser(authUser);
        // Load data after authentication
        loadAllData();
      } else {
        setUser(null);
        console.log("No authenticated user");
      }
    });

    return () => {
      console.log("Admin component unmounting, unsubscribing from auth");
      unsubscribe();
    };
  }, [auth, loadAllData]);
  
  // Simple fetch projects from Firestore (for dashboard counts only)
  const fetchProjects = async () => {
    try {
      const projectsCollection = collection(db, 'projects');
      const snapshot = await getDocs(projectsCollection);
      const projectsList = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setProjects(projectsList);
      return projectsList;
    } catch (error) {
      console.error('Error fetching projects:', error);
      showMessage('Error loading projects: ' + error.message, 'error');
      return [];
    }
  };
  
  // Fetch certificates from Firestore
  const fetchCertificates = async () => {
    setCertificatesLoading(true);
    try {
      const certificatesQuery = query(collection(db, 'certificates'), orderBy('createdAt', 'desc'));
      const snapshot = await getDocs(certificatesQuery);
      const certificatesList = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setCertificates(certificatesList);
    } catch (error) {
      console.error('Error fetching certificates:', error);
      showMessage('Error loading certificates: ' + error.message, 'error');
    } finally {
      setCertificatesLoading(false);
    }
  };
  
  // Fetch profile from Firestore
  const fetchProfile = async () => {
    setProfileLoading(true);
    try {
      const profileDoc = await getDoc(doc(db, 'main', 'profile'));
      if (profileDoc.exists()) {
        setProfile(profileDoc.data());
      } else {
        console.log('No profile document found');
      }
    } catch (error) {
      console.error('Error fetching profile:', error);
      showMessage('Error loading profile: ' + error.message, 'error');
    } finally {
      setProfileLoading(false);
    }
  };
  
  // Fetch skills from Firestore
  const fetchSkills = async () => {
    setSkillsLoading(true);
    try {
      const skillsQuery = query(collection(db, 'skills'), orderBy('category', 'asc'));
      const snapshot = await getDocs(skillsQuery);
      const skillsList = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setSkills(skillsList);
    } catch (error) {
      console.error('Error fetching skills:', error);
      showMessage('Error loading skills: ' + error.message, 'error');
    } finally {
      setSkillsLoading(false);
    }
  };
  
  // Fetch work experience from Firestore
  const fetchWorkExperience = async () => {
    setWorkLoading(true);
    try {
      const workQuery = query(collection(db, 'work'), orderBy('years', 'desc'));
      const snapshot = await getDocs(workQuery);
      const workList = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setWorkExperience(workList);
    } catch (error) {
      console.error('Error fetching work experience:', error);
      showMessage('Error loading work experience: ' + error.message, 'error');
    } finally {
      setWorkLoading(false);
    }
  };
  
  // Fetch education from Firestore
  const fetchEducation = async () => {
    setEducationLoading(true);
    try {
      // Try with 'graduated' field first
      let educationQuery;
      try {
        educationQuery = query(collection(db, 'education'), orderBy('graduated', 'desc'));
      } catch (e) {
        // If ordering by 'graduated' fails, fetch without ordering
        educationQuery = collection(db, 'education');
      }
      
      const snapshot = await getDocs(educationQuery);
      if (snapshot.empty) {
        console.log('No education documents found');
        setEducation([]);
      } else {
        const educationList = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        
        // Sort client-side if we couldn't sort in the query
        const sortedList = educationList.sort((a, b) => {
          // If both have 'graduated' field
          if (a.graduated && b.graduated) {
            return String(b.graduated).localeCompare(String(a.graduated));
          }
          // Ensure items with missing 'graduated' field appear at the end
          if (!a.graduated) return 1;
          if (!b.graduated) return -1;
          return 0;
        });
        
        setEducation(sortedList);
        console.log(`Education data: ${educationList.length} records`);
      }
    } catch (error) {
      console.error('Error fetching education:', error);
      showMessage('Error loading education: ' + error.message, 'error');
      setEducation([]); // Set to empty array to avoid undefined errors
    } finally {
      setEducationLoading(false);
    }
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      setUser(userCredential.user);
      showMessage('Logged in successfully!', 'success');
      
      // Explicitly load data after login
      setTimeout(() => {
        console.log("Initiating data load after login");
        loadAllData();
      }, 500); // Small delay to ensure auth state is fully processed
    } catch (error) {
      console.error('Error logging in:', error);
      showMessage('Error logging in: ' + error.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
      setUser(null);
      showMessage('Logged out successfully!', 'success');
    } catch (error) {
      console.error('Error logging out:', error);
      showMessage('Error logging out: ' + error.message, 'error');
    }
  };

  // Upload a file to Firebase Storage
  const uploadFileToStorage = async (file, folder) => {
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
  
  // Generic image upload handler for any type of content
  const handleImageUpload = async (event, entityType, isThumb = false) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;
    
    setUploadingImages(true);
    setUploadProgress(0);
    
    try {
      let folder;
      let updatedEntity;
      
      // Determine folder and entity based on type
      switch (entityType) {
        case 'project':
          folder = isThumb ? 'portfolio/thumbnails' : 'portfolio/details';
          updatedEntity = editingProject ? { ...editingProject } : { ...newProject };
          // Create or update images array if it doesn't exist
          if (!updatedEntity.images) {
            updatedEntity.images = [];
          }
          break;
        case 'certificate':
          folder = 'certificates';
          updatedEntity = editingCertificate ? { ...editingCertificate } : { ...newCertificate };
          break;
        case 'profile':
          folder = 'profile';
          updatedEntity = { ...profile };
          break;
        default:
          folder = 'misc';
          break;
      }
      
      // Process each file
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        
        try {
          const fileInfo = await uploadFileToStorage(file, folder);
          
          // Update progress
          setUploadProgress(Math.round(((i + 1) / files.length) * 100));
          
          // Update entity based on type
          switch (entityType) {
            case 'project':
              if (isThumb) {
                // Set as thumbnail
                updatedEntity.thumbnail = fileInfo.url;
              } else {
                // Add to images array
                updatedEntity.images.push(fileInfo.url);
              }
              break;
            case 'certificate':
              // For certificates, just set the image URL
              updatedEntity.image = fileInfo.url;
              break;
            case 'profile':
              // For profile, set the image URL
              updatedEntity.image = fileInfo.url;
              console.log('Setting profile image to:', fileInfo.url);
              break;
            default:
              break;
          }
        } catch (error) {
          console.error(`Failed to upload file ${file.name}:`, error);
          showMessage(`Failed to upload ${file.name}: ${error.message}`, 'error');
        }
      }
      
      // Update state based on entity type
      switch (entityType) {
        case 'project':
          if (editingProject) {
            setEditingProject(updatedEntity);
          } else {
            setNewProject(updatedEntity);
          }
          break;
        case 'certificate':
          if (editingCertificate) {
            setEditingCertificate(updatedEntity);
          } else {
            setNewCertificate(updatedEntity);
          }
          break;
        case 'profile':
          setProfile(updatedEntity);
          break;
        default:
          break;
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
  
  // Note: Project handling functions have been moved to Projects.js component
  
  const handleUpdateFirebaseConfig = () => {
    try {
      if (!configText.trim()) {
        showMessage('Please enter a valid Firebase configuration', 'error');
        return;
      }
      
      const config = JSON.parse(configText);
      if (!config.apiKey || !config.projectId || !config.storageBucket) {
        showMessage('Configuration is missing required fields', 'error');
        return;
      }
      
      setFirebaseConfig(config);
      showMessage('Firebase configuration updated. Please refresh the page.', 'success');
    } catch (error) {
      console.error('Error parsing Firebase config:', error);
      showMessage('Invalid JSON format: ' + error.message, 'error');
    }
  };

  // Sidebar menu with nav options using routes
  const renderSidebar = () => {
    const currentPath = location.pathname;
    
    // Function to check if current path matches a route 
    // (including the base /admin path for proper highlighting)
    const isActive = (path) => {
      if (path === '/') {
        return currentPath === '/admin' || currentPath === '/admin/';
      }
      return currentPath === `/admin${path}`;
    };
    
    return (
      <div className="w-64 bg-lightBlue bg-opacity-30 p-4 rounded-lg">
        <h3 className="text-xl font-semibold text-lightestSlate mb-4">Navigation</h3>
        <nav className="space-y-2">
          <button
            onClick={() => navigate('/admin')}
            className={`w-full text-left py-2 px-3 rounded ${isActive('/') ? 'bg-green text-darkBlue' : 'hover:bg-lightBlue hover:bg-opacity-50'}`}
          >
            Dashboard
          </button>
          <button
            onClick={() => navigate('/admin/profile')}
            className={`w-full text-left py-2 px-3 rounded ${isActive('/profile') ? 'bg-green text-darkBlue' : 'hover:bg-lightBlue hover:bg-opacity-50'}`}
          >
            Profile
          </button>
          <button
            onClick={() => navigate('/admin/projects')}
            className={`w-full text-left py-2 px-3 rounded ${isActive('/projects') ? 'bg-green text-darkBlue' : 'hover:bg-lightBlue hover:bg-opacity-50'}`}
          >
            Projects
          </button>
          <button
            onClick={() => navigate('/admin/certificates')}
            className={`w-full text-left py-2 px-3 rounded ${isActive('/certificates') ? 'bg-green text-darkBlue' : 'hover:bg-lightBlue hover:bg-opacity-50'}`}
          >
            Certificates
          </button>
          <button
            onClick={() => navigate('/admin/skills')}
            className={`w-full text-left py-2 px-3 rounded ${isActive('/skills') ? 'bg-green text-darkBlue' : 'hover:bg-lightBlue hover:bg-opacity-50'}`}
          >
            Skills
          </button>
          <button
            onClick={() => navigate('/admin/work')}
            className={`w-full text-left py-2 px-3 rounded ${isActive('/work') ? 'bg-green text-darkBlue' : 'hover:bg-lightBlue hover:bg-opacity-50'}`}
          >
            Work Experience
          </button>
          <button
            onClick={() => navigate('/admin/education')}
            className={`w-full text-left py-2 px-3 rounded ${isActive('/education') ? 'bg-green text-darkBlue' : 'hover:bg-lightBlue hover:bg-opacity-50'}`}
          >
            Education
          </button>
          <button
            onClick={() => navigate('/admin/settings')}
            className={`w-full text-left py-2 px-3 rounded ${isActive('/settings') ? 'bg-green text-darkBlue' : 'hover:bg-lightBlue hover:bg-opacity-50'}`}
          >
            Settings
          </button>
          <button
            onClick={handleLogout}
            className="w-full text-left py-2 px-3 rounded text-red-400 hover:bg-red-900 hover:bg-opacity-50 mt-8"
          >
            Logout
          </button>
        </nav>
      </div>
    );
  };
  
  // Function to test database connection and verify configuration
  const testDatabaseWrite = async () => {
    try {
      console.log("Testing database write capability...");
      console.log("Firebase config:", db._app.options);
      showMessage("Testing database write and connection...", "info");
      
      // Check Firebase config
      const config = db._app.options;
      if (!config || !config.projectId) {
        throw new Error("Firebase configuration is missing or invalid. Check your config.js file.");
      }
      
      // Try to write a test document
      const testDoc = await addDoc(collection(db, "test"), {
        message: "Test write successful",
        timestamp: new Date()
      });
      
      console.log("Database write successful!", testDoc.id);
      showMessage("Database write successful! Try adding content now.", "success");
      
      // Try to read it back
      const docSnap = await getDoc(doc(db, "test", testDoc.id));
      console.log("Read test document:", docSnap.exists() ? docSnap.data() : "Document not found");
      
      // Show collections info
      const collections = ['projects', 'certificates', 'skills', 'work', 'education'];
      showMessage("Checking collections...", "info");
      
      for (const collectionName of collections) {
        try {
          const snapshot = await getDocs(collection(db, collectionName));
          console.log(`Collection ${collectionName}: ${snapshot.size} documents`);
          showMessage(`${collectionName}: ${snapshot.size} documents found`, "info");
        } catch (err) {
          console.error(`Error checking ${collectionName}:`, err);
          showMessage(`Error checking ${collectionName}: ${err.message}`, "error");
        }
      }
      
    } catch (error) {
      console.error("Database test failed:", error);
      showMessage("Database test failed: " + error.message, "error");
    }
  };
  
  // Function to fetch JSON data
  const fetchJsonData = async () => {
    const response = await fetch('/resumeData.json');
    const jsonData = await response.json();
    return jsonData;
  };
  
  // Function to migrate skills from JSON data
  const migrateSkillsFromJson = async () => {
    try {
      console.log("Starting skills migration from JSON...");
      showMessage("Starting skills migration...", "info");
      
      // Fetch the JSON data
      const jsonData = await fetchJsonData();
      
      if (!jsonData || !jsonData.resume || !jsonData.resume.skills || !jsonData.resume.skills.length) {
        throw new Error("No skills data found in the JSON file");
      }
      
      // Get skills data
      const skills = jsonData.resume.skills;
      console.log(`Found ${skills.length} skills in JSON data`);
      
      // Add each skill to Firestore with proper category
      let successCount = 0;
      
      for (const skill of skills) {
        try {
          // Determine category based on skill name
          let category = "Other Skills";
          
          const frontendSkills = ["JavaScript", "React", "HTML5", "CSS", "TypeScript", "Angular", "GraphQL", "Svelte"];
          const backendSkills = ["Node.js", "Python", "PHP/Hack", "SQL/MySQL", "MongoDB", "Firebase"];
          const devOpsSkills = ["Git", "Mercurial", "CI/CD", "Docker", "Vercel", "AWS", "GCP"];
          
          if (frontendSkills.includes(skill.name)) category = "Frontend";
          if (backendSkills.includes(skill.name)) category = "Backend";
          if (devOpsSkills.includes(skill.name)) category = "Tools & DevOps";
          
          // Add to Firestore with timestamps and category
          const skillData = {
            ...skill,
            category,
            createdAt: new Date(),
            updatedAt: new Date()
          };
          
          const docRef = await addDoc(collection(db, "skills"), skillData);
          await updateDoc(docRef, { id: docRef.id });
          successCount++;
          
        } catch (skillError) {
          console.error(`Error adding skill ${skill.name}:`, skillError);
        }
      }
      
      // Reload skills
      await fetchSkills();
      
      console.log(`Skills migration complete. Added ${successCount} of ${skills.length} skills.`);
      showMessage(`Skills migration complete. Added ${successCount} of ${skills.length} skills.`, "success");
      
    } catch (error) {
      console.error("Error migrating skills:", error);
      showMessage("Error migrating skills: " + error.message, "error");
    }
  };
  
  // Function to migrate work experience from JSON data
  const migrateWorkFromJson = async () => {
    try {
      console.log("Starting work experience migration from JSON...");
      showMessage("Starting work experience migration...", "info");
      
      // Fetch the JSON data
      const jsonData = await fetchJsonData();
      
      if (!jsonData || !jsonData.resume || !jsonData.resume.work || !jsonData.resume.work.length) {
        throw new Error("No work experience data found in the JSON file");
      }
      
      // Get work experience data
      const work = jsonData.resume.work;
      console.log(`Found ${work.length} work experiences in JSON data`);
      
      // Add each work experience to Firestore
      let successCount = 0;
      
      for (const job of work) {
        try {
          // Add to Firestore with timestamps
          const workData = {
            ...job,
            createdAt: new Date(),
            updatedAt: new Date()
          };
          
          const docRef = await addDoc(collection(db, "work"), workData);
          await updateDoc(docRef, { id: docRef.id });
          successCount++;
          
        } catch (workError) {
          console.error(`Error adding work experience ${job.company}:`, workError);
        }
      }
      
      // Reload work
      await fetchWorkExperience();
      
      console.log(`Work experience migration complete. Added ${successCount} of ${work.length} entries.`);
      showMessage(`Work experience migration complete. Added ${successCount} of ${work.length} entries.`, "success");
      
    } catch (error) {
      console.error("Error migrating work experience:", error);
      showMessage("Error migrating work experience: " + error.message, "error");
    }
  };
  
  // Function to migrate education from JSON data
  const migrateEducationFromJson = async () => {
    try {
      console.log("Starting education migration from JSON...");
      showMessage("Starting education migration...", "info");
      
      // Fetch the JSON data
      const jsonData = await fetchJsonData();
      
      if (!jsonData || !jsonData.resume || !jsonData.resume.education || !jsonData.resume.education.length) {
        throw new Error("No education data found in the JSON file");
      }
      
      // Get education data
      const education = jsonData.resume.education;
      console.log(`Found ${education.length} education entries in JSON data`);
      
      // Add each education to Firestore
      let successCount = 0;
      
      for (const edu of education) {
        try {
          // Add to Firestore with timestamps
          const eduData = {
            ...edu,
            createdAt: new Date(),
            updatedAt: new Date()
          };
          
          const docRef = await addDoc(collection(db, "education"), eduData);
          await updateDoc(docRef, { id: docRef.id });
          successCount++;
          
        } catch (eduError) {
          console.error(`Error adding education ${edu.school}:`, eduError);
        }
      }
      
      // Reload education
      await fetchEducation();
      
      console.log(`Education migration complete. Added ${successCount} of ${education.length} entries.`);
      showMessage(`Education migration complete. Added ${successCount} of ${education.length} entries.`, "success");
      
    } catch (error) {
      console.error("Error migrating education:", error);
      showMessage("Error migrating education: " + error.message, "error");
    }
  };
  
  // Function to migrate certificates from JSON data
  const migrateCertificatesFromJson = async () => {
    try {
      console.log("Starting certificates migration from JSON...");
      showMessage("Starting certificates migration...", "info");
      
      // Fetch the JSON data
      const jsonData = await fetchJsonData();
      
      if (!jsonData || !jsonData.resume || !jsonData.resume.certificates || !jsonData.resume.certificates.length) {
        throw new Error("No certificates data found in the JSON file");
      }
      
      // Get certificates data
      const certificates = jsonData.resume.certificates;
      console.log(`Found ${certificates.length} certificates in JSON data`);
      
      // Add each certificate to Firestore
      let successCount = 0;
      
      for (const cert of certificates) {
        try {
          // Process the image URL to work with Firebase Storage
          let image = cert.image;
          if (image && image.startsWith('./')) {
            image = image.substring(2); // Remove the './' prefix
          }
          
          // Add to Firestore with timestamps
          const certData = {
            ...cert,
            image,
            createdAt: new Date(),
            updatedAt: new Date()
          };
          
          const docRef = await addDoc(collection(db, "certificates"), certData);
          await updateDoc(docRef, { id: docRef.id });
          successCount++;
          
        } catch (certError) {
          console.error(`Error adding certificate ${cert.course}:`, certError);
        }
      }
      
      // Reload certificates
      await fetchCertificates();
      
      console.log(`Certificates migration complete. Added ${successCount} of ${certificates.length} entries.`);
      showMessage(`Certificates migration complete. Added ${successCount} of ${certificates.length} entries.`, "success");
      
    } catch (error) {
      console.error("Error migrating certificates:", error);
      showMessage("Error migrating certificates: " + error.message, "error");
    }
  };
  
  // Function to migrate profile from JSON data
  const migrateProfileFromJson = async () => {
    try {
      console.log("Starting profile migration from JSON...");
      showMessage("Starting profile migration...", "info");
      
      // Fetch the JSON data
      const jsonData = await fetchJsonData();
      
      if (!jsonData || !jsonData.main) {
        throw new Error("No profile data found in the JSON file");
      }
      
      // Get profile data
      const profile = jsonData.main;
      console.log("Found profile data in JSON");
      
      // Process occupation if it's a string formatted like an array
      if (typeof profile.occupation === 'string' && profile.occupation.startsWith('[') && profile.occupation.endsWith(']')) {
        try {
          // Try to parse the string as a JavaScript array
          const occupationStr = profile.occupation.replace('[', '').replace(']', '');
          const occupations = occupationStr.split(',').map(item => item.trim());
          profile.occupation = occupations;
        } catch (err) {
          console.warn("Could not parse occupation string:", err);
        }
      }
      
      // Process image URL if needed
      // (no processing needed here but keeping the section for future modifications)
      
      // Add to Firestore with timestamps
      const profileData = {
        ...profile,
        updatedAt: new Date()
      };
      
      // Use setDoc to create or update the profile document
      await setDoc(doc(db, "main", "profile"), profileData);
      
      // Reload profile
      await fetchProfile();
      
      console.log("Profile migration complete.");
      showMessage("Profile migration complete.", "success");
      
    } catch (error) {
      console.error("Error migrating profile:", error);
      showMessage("Error migrating profile: " + error.message, "error");
    }
  };
  
  // Migrate all data from JSON
  const migrateAllDataFromJson = async () => {
    try {
      showMessage("Starting full data migration...", "info");
      
      // Migrate all data types
      await migrateProfileFromJson();
      await migrateSkillsFromJson();
      await migrateWorkFromJson();
      await migrateEducationFromJson();
      await migrateCertificatesFromJson();
      
      showMessage("Full data migration complete!", "success");
    } catch (error) {
      console.error("Error during full data migration:", error);
      showMessage("Error during full data migration: " + error.message, "error");
    }
  };

  // Dashboard view is now in the Dashboard.js component
  
  // Note: Projects view has been moved to the Projects.js component
  const saveNewCertificate = async () => {
    setLoading(true);
    
    try {
      // Validate required fields
      if (!newCertificate.course || !newCertificate.school) {
        showMessage('Course and school are required', 'error');
        setLoading(false);
        return;
      }
      
      // Add timestamps
      const certificateData = {
        ...newCertificate,
        createdAt: new Date(),
        updatedAt: new Date()
      };
      
      // Save to Firestore
      const docRef = await addDoc(collection(db, 'certificates'), certificateData);
      
      // Update with ID
      await updateDoc(docRef, { id: docRef.id });
      
      // Reset form and reload certificates
      setNewCertificate({
        school: '',
        course: '',
        date: '',
        image: ''
      });
      
      await fetchCertificates();
      showMessage('Certificate created successfully!', 'success');
    } catch (error) {
      console.error('Error creating certificate:', error);
      showMessage('Error creating certificate: ' + error.message, 'error');
    } finally {
      setLoading(false);
    }
  };
  
  // Update an existing certificate
  const updateCertificate = async () => {
    if (!editingCertificate || !editingCertificate.id) {
      showMessage('No certificate selected for update', 'error');
      return;
    }
    
    setLoading(true);
    
    try {
      // Validate required fields
      if (!editingCertificate.course || !editingCertificate.school) {
        showMessage('Course and school are required', 'error');
        setLoading(false);
        return;
      }
      
      // Update timestamp
      const certificateData = {
        ...editingCertificate,
        updatedAt: new Date()
      };
      
      // Update in Firestore
      await updateDoc(doc(db, 'certificates', editingCertificate.id), certificateData);
      
      // Reset editing state and reload certificates
      setEditingCertificate(null);
      await fetchCertificates();
      showMessage('Certificate updated successfully!', 'success');
    } catch (error) {
      console.error('Error updating certificate:', error);
      showMessage('Error updating certificate: ' + error.message, 'error');
    } finally {
      setLoading(false);
    }
  };
  
  // Update profile information
  const updateProfile = async () => {
    if (!profile) {
      showMessage('No profile data available', 'error');
      return;
    }
    
    setLoading(true);
    
    try {
      // Validate required fields
      if (!profile.name || !profile.bio) {
        showMessage('Name and bio are required', 'error');
        setLoading(false);
        return;
      }
      
      // Update timestamp
      const profileData = {
        ...profile,
        updatedAt: new Date()
      };
      
      // Update in Firestore
      await setDoc(doc(db, 'main', 'profile'), profileData);
      
      // Reset editing state
      setEditingProfile(false);
      showMessage('Profile updated successfully!', 'success');
    } catch (error) {
      console.error('Error updating profile:', error);
      showMessage('Error updating profile: ' + error.message, 'error');
    } finally {
      setLoading(false);
    }
  };
  
  // Save a new skill to Firestore
  const saveNewSkill = async () => {
    setLoading(true);
    
    try {
      // Validate required fields
      if (!newSkill.name || !newSkill.level || !newSkill.category) {
        showMessage('Name, level, and category are required', 'error');
        setLoading(false);
        return;
      }
      
      // Add timestamps
      const skillData = {
        ...newSkill,
        createdAt: new Date(),
        updatedAt: new Date()
      };
      
      // Save to Firestore
      const docRef = await addDoc(collection(db, 'skills'), skillData);
      
      // Update with ID
      await updateDoc(docRef, { id: docRef.id });
      
      // Reset form and reload skills
      setNewSkill({
        name: '',
        level: '75%',
        category: 'Frontend'
      });
      
      await fetchSkills();
      showMessage('Skill created successfully!', 'success');
    } catch (error) {
      console.error('Error creating skill:', error);
      showMessage('Error creating skill: ' + error.message, 'error');
    } finally {
      setLoading(false);
    }
  };
  
  // Update an existing skill
  const updateSkill = async () => {
    if (!editingSkill || !editingSkill.id) {
      showMessage('No skill selected for update', 'error');
      return;
    }
    
    setLoading(true);
    
    try {
      // Validate required fields
      if (!editingSkill.name || !editingSkill.level || !editingSkill.category) {
        showMessage('Name, level, and category are required', 'error');
        setLoading(false);
        return;
      }
      
      // Update timestamp
      const skillData = {
        ...editingSkill,
        updatedAt: new Date()
      };
      
      // Update in Firestore
      await updateDoc(doc(db, 'skills', editingSkill.id), skillData);
      
      // Reset editing state and reload skills
      setEditingSkill(null);
      await fetchSkills();
      showMessage('Skill updated successfully!', 'success');
    } catch (error) {
      console.error('Error updating skill:', error);
      showMessage('Error updating skill: ' + error.message, 'error');
    } finally {
      setLoading(false);
    }
  };
  
  // Delete a skill
  const deleteSkill = async (skillId) => {
    if (!skillId) return;
    
    // Confirm with user
    const confirmed = window.confirm('Are you sure you want to delete this skill? This cannot be undone.');
    if (!confirmed) return;
    
    setLoading(true);
    
    try {
      // Delete from Firestore
      await deleteDoc(doc(db, 'skills', skillId));
      
      // Reload skills
      await fetchSkills();
      showMessage('Skill deleted successfully', 'success');
    } catch (error) {
      console.error('Error deleting skill:', error);
      showMessage('Error deleting skill: ' + error.message, 'error');
    } finally {
      setLoading(false);
    }
  };
  
  // Save a new work experience entry to Firestore
  const saveNewWork = async () => {
    setLoading(true);
    
    try {
      // Validate required fields
      if (!newWork.company || !newWork.title || !newWork.years) {
        showMessage('Company, title, and years are required', 'error');
        setLoading(false);
        return;
      }
      
      // Add timestamps
      const workData = {
        ...newWork,
        createdAt: new Date(),
        updatedAt: new Date()
      };
      
      // Save to Firestore
      const docRef = await addDoc(collection(db, 'work'), workData);
      
      // Update with ID
      await updateDoc(docRef, { id: docRef.id });
      
      // Reset form and reload work
      setNewWork({
        company: '',
        title: '',
        years: '',
        description: ''
      });
      
      await fetchWorkExperience();
      showMessage('Work experience created successfully!', 'success');
    } catch (error) {
      console.error('Error creating work experience:', error);
      showMessage('Error creating work experience: ' + error.message, 'error');
    } finally {
      setLoading(false);
    }
  };
  
  // Update an existing work experience entry
  const updateWork = async () => {
    if (!editingWork || !editingWork.id) {
      showMessage('No work experience selected for update', 'error');
      return;
    }
    
    setLoading(true);
    
    try {
      // Validate required fields
      if (!editingWork.company || !editingWork.title || !editingWork.years) {
        showMessage('Company, title, and years are required', 'error');
        setLoading(false);
        return;
      }
      
      // Update timestamp
      const workData = {
        ...editingWork,
        updatedAt: new Date()
      };
      
      // Update in Firestore
      await updateDoc(doc(db, 'work', editingWork.id), workData);
      
      // Reset editing state and reload work
      setEditingWork(null);
      await fetchWorkExperience();
      showMessage('Work experience updated successfully!', 'success');
    } catch (error) {
      console.error('Error updating work experience:', error);
      showMessage('Error updating work experience: ' + error.message, 'error');
    } finally {
      setLoading(false);
    }
  };
  
  // Delete a work experience entry
  const deleteWork = async (workId) => {
    if (!workId) return;
    
    // Confirm with user
    const confirmed = window.confirm('Are you sure you want to delete this work experience? This cannot be undone.');
    if (!confirmed) return;
    
    setLoading(true);
    
    try {
      // Delete from Firestore
      await deleteDoc(doc(db, 'work', workId));
      
      // Reload work
      await fetchWorkExperience();
      showMessage('Work experience deleted successfully', 'success');
    } catch (error) {
      console.error('Error deleting work experience:', error);
      showMessage('Error deleting work experience: ' + error.message, 'error');
    } finally {
      setLoading(false);
    }
  };
  
  // Save a new education entry to Firestore
  const saveNewEducation = async () => {
    setLoading(true);
    
    try {
      // Validate required fields
      if (!newEducation.school || !newEducation.degree || !newEducation.graduated) {
        showMessage('School, degree, and graduation year are required', 'error');
        setLoading(false);
        return;
      }
      
      // Add timestamps
      const educationData = {
        ...newEducation,
        createdAt: new Date(),
        updatedAt: new Date()
      };
      
      // Save to Firestore
      const docRef = await addDoc(collection(db, 'education'), educationData);
      
      // Update with ID
      await updateDoc(docRef, { id: docRef.id });
      
      // Reset form and reload education
      setNewEducation({
        school: '',
        degree: '',
        graduated: '',
        description: ''
      });
      
      await fetchEducation();
      showMessage('Education created successfully!', 'success');
    } catch (error) {
      console.error('Error creating education:', error);
      showMessage('Error creating education: ' + error.message, 'error');
    } finally {
      setLoading(false);
    }
  };
  
  // Update an existing education entry
  const updateEducation = async () => {
    if (!editingEducation || !editingEducation.id) {
      showMessage('No education selected for update', 'error');
      return;
    }
    
    setLoading(true);
    
    try {
      // Validate required fields
      if (!editingEducation.school || !editingEducation.degree || !editingEducation.graduated) {
        showMessage('School, degree, and graduation year are required', 'error');
        setLoading(false);
        return;
      }
      
      // Update timestamp
      const educationData = {
        ...editingEducation,
        updatedAt: new Date()
      };
      
      // Update in Firestore
      await updateDoc(doc(db, 'education', editingEducation.id), educationData);
      
      // Reset editing state and reload education
      setEditingEducation(null);
      await fetchEducation();
      showMessage('Education updated successfully!', 'success');
    } catch (error) {
      console.error('Error updating education:', error);
      showMessage('Error updating education: ' + error.message, 'error');
    } finally {
      setLoading(false);
    }
  };
  
  // Delete an education entry
  const deleteEducation = async (educationId) => {
    if (!educationId) return;
    
    // Confirm with user
    const confirmed = window.confirm('Are you sure you want to delete this education? This cannot be undone.');
    if (!confirmed) return;
    
    setLoading(true);
    
    try {
      // Delete from Firestore
      await deleteDoc(doc(db, 'education', educationId));
      
      // Reload education
      await fetchEducation();
      showMessage('Education deleted successfully', 'success');
    } catch (error) {
      console.error('Error deleting education:', error);
      showMessage('Error deleting education: ' + error.message, 'error');
    } finally {
      setLoading(false);
    }
  };
  
  // Delete a certificate
  const deleteCertificate = async (certificateId) => {
    if (!certificateId) return;
    
    // Confirm with user
    const confirmed = window.confirm('Are you sure you want to delete this certificate? This cannot be undone.');
    if (!confirmed) return;
    
    setLoading(true);
    
    try {
      // Delete from Firestore
      await deleteDoc(doc(db, 'certificates', certificateId));
      
      // Reload certificates
      await fetchCertificates();
      showMessage('Certificate deleted successfully', 'success');
    } catch (error) {
      console.error('Error deleting certificate:', error);
      showMessage('Error deleting certificate: ' + error.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  // Certificates view
  const renderCertificates = () => (
    <div className="bg-lightBlue bg-opacity-30 p-6 rounded-lg">
      <h3 className="text-2xl font-semibold text-lightestSlate mb-6">Manage Certificates</h3>
      
      {/* Create New Certificate Form */}
      <div className="mb-8 bg-lightBlue bg-opacity-50 p-4 rounded-lg">
        <h4 className="text-lg font-medium text-green mb-4">Add New Certificate</h4>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <div>
            <label className="block text-lightSlate mb-1">School / Institution</label>
            <input
              type="text"
              value={newCertificate.school}
              onChange={(e) => setNewCertificate({...newCertificate, school: e.target.value})}
              className="w-full p-2 bg-darkBlue border border-lightBlue rounded"
            />
          </div>
          
          <div>
            <label className="block text-lightSlate mb-1">Course / Certificate Name</label>
            <input
              type="text"
              value={newCertificate.course}
              onChange={(e) => setNewCertificate({...newCertificate, course: e.target.value})}
              className="w-full p-2 bg-darkBlue border border-lightBlue rounded"
            />
          </div>
          
          <div>
            <label className="block text-lightSlate mb-1">Date (Optional)</label>
            <input
              type="text"
              value={newCertificate.date || ''}
              onChange={(e) => setNewCertificate({...newCertificate, date: e.target.value})}
              placeholder="e.g., 2023 or May 2023"
              className="w-full p-2 bg-darkBlue border border-lightBlue rounded"
            />
          </div>
        </div>
        
        {/* Certificate Image Upload */}
        <div className="mb-4">
          <label className="block text-lightSlate mb-1">Certificate Image</label>
          <div className="flex items-center">
            <input
              type="file"
              accept="image/*"
              onChange={(e) => handleImageUpload(e, 'certificate')}
              className="hidden"
              id="certificate-upload-new"
              disabled={uploadingImages}
            />
            <label
              htmlFor="certificate-upload-new"
              className="cursor-pointer py-2 px-4 bg-green bg-opacity-20 text-green rounded hover:bg-opacity-30"
            >
              Upload Certificate Image
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
            
            {newCertificate.image && (
              <div className="ml-4 flex items-center">
                <img 
                  src={newCertificate.image} 
                  alt="Certificate" 
                  className="h-10 w-16 object-cover rounded"
                />
                <span className="ml-2 text-lightSlate text-sm">Image uploaded</span>
              </div>
            )}
          </div>
        </div>
        
        <div className="flex justify-end gap-3 mt-6">
          <button
            onClick={saveNewCertificate}
            disabled={loading}
            className="py-2 px-4 bg-green text-darkBlue rounded hover:bg-opacity-90"
          >
            {loading ? 'Saving...' : 'Add Certificate'}
          </button>
        </div>
      </div>
      
      {/* Certificates List */}
      <div>
        <h4 className="text-lg font-medium text-green mb-4">Certificates List</h4>
        
        {certificatesLoading ? (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-green mx-auto"></div>
            <p className="mt-2 text-lightSlate">Loading certificates...</p>
          </div>
        ) : certificates.length === 0 ? (
          <p className="text-center py-8 text-lightSlate">No certificates found. Add your first certificate above.</p>
        ) : (
          <div className="space-y-4">
            {certificates.map(certificate => (
              <div key={certificate.id} className="bg-lightBlue bg-opacity-20 p-4 rounded-lg flex flex-wrap md:flex-nowrap gap-4">
                {/* Certificate Image */}
                <div className="w-32 h-20 bg-darkBlue rounded overflow-hidden flex-shrink-0">
                  {certificate.image ? (
                    <img src={certificate.image} alt={certificate.course} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-lightSlate text-xs">No image</div>
                  )}
                </div>
                
                {/* Certificate Info or Edit Form */}
                {editingCertificate && editingCertificate.id === certificate.id ? (
                  <div className="flex-grow bg-darkBlue bg-opacity-50 p-3 rounded">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-lightSlate text-xs mb-1">School / Institution</label>
                        <input
                          type="text"
                          value={editingCertificate.school}
                          onChange={(e) => setEditingCertificate({...editingCertificate, school: e.target.value})}
                          className="w-full p-1 text-sm bg-darkBlue border border-lightBlue rounded"
                        />
                      </div>
                      <div>
                        <label className="block text-lightSlate text-xs mb-1">Course / Certificate Name</label>
                        <input
                          type="text"
                          value={editingCertificate.course}
                          onChange={(e) => setEditingCertificate({...editingCertificate, course: e.target.value})}
                          className="w-full p-1 text-sm bg-darkBlue border border-lightBlue rounded"
                        />
                      </div>
                      <div>
                        <label className="block text-lightSlate text-xs mb-1">Date (Optional)</label>
                        <input
                          type="text"
                          value={editingCertificate.date || ''}
                          onChange={(e) => setEditingCertificate({...editingCertificate, date: e.target.value})}
                          placeholder="e.g., 2023 or May 2023"
                          className="w-full p-1 text-sm bg-darkBlue border border-lightBlue rounded"
                        />
                      </div>
                      <div>
                        <label className="block text-lightSlate text-xs mb-1">Certificate Image</label>
                        <div className="flex items-center">
                          <input
                            type="file"
                            accept="image/*"
                            onChange={(e) => handleImageUpload(e, 'certificate')}
                            className="hidden"
                            id={`certificate-upload-${certificate.id}`}
                            disabled={uploadingImages}
                          />
                          <label
                            htmlFor={`certificate-upload-${certificate.id}`}
                            className="cursor-pointer py-1 px-2 text-xs bg-green bg-opacity-20 text-green rounded hover:bg-opacity-30"
                          >
                            Upload Image
                          </label>
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex justify-end gap-2 mt-3">
                      <button
                        onClick={() => setEditingCertificate(null)}
                        className="py-1 px-2 text-xs border border-lightSlate text-lightSlate rounded hover:bg-lightBlue hover:bg-opacity-30"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={updateCertificate}
                        disabled={loading}
                        className="py-1 px-2 text-xs bg-green text-darkBlue rounded hover:bg-opacity-90"
                      >
                        {loading ? 'Saving...' : 'Update'}
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex-grow">
                    <h5 className="text-lg font-medium text-lightestSlate">{certificate.course}</h5>
                    <p className="text-sm text-green mb-1">{certificate.school}</p>
                    {certificate.date && (
                      <p className="text-xs text-lightSlate">{certificate.date}</p>
                    )}
                  </div>
                )}
                
                {/* Actions */}
                <div className="flex flex-col justify-center gap-2">
                  {editingCertificate && editingCertificate.id === certificate.id ? (
                    null
                  ) : (
                    <>
                      <button
                        onClick={() => setEditingCertificate(certificate)}
                        className="py-1 px-3 text-sm bg-green bg-opacity-20 text-green rounded hover:bg-opacity-30"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => deleteCertificate(certificate.id)}
                        className="py-1 px-3 text-sm bg-red-500 bg-opacity-20 text-red-400 rounded hover:bg-opacity-30"
                      >
                        Delete
                      </button>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
  
  // Settings view
  const renderSettings = () => (
    <div className="bg-lightBlue bg-opacity-30 p-6 rounded-lg">
      <h3 className="text-2xl font-semibold text-lightestSlate mb-6">Settings</h3>
      
      {/* Firebase Configuration Settings */}
      <div className="mb-6">
        <h4 className="text-lg font-medium text-green mb-4">Firebase Configuration</h4>
        
        <button 
          onClick={() => setShowConfigForm(!showConfigForm)}
          className="text-green underline mb-4"
        >
          {showConfigForm ? 'Hide Firebase Config Form' : 'Show Firebase Config Form'}
        </button>
        
        {showConfigForm && (
          <div className="mt-4">
            <p className="text-lightSlate mb-4">
              Enter your Firebase configuration in JSON format below:
            </p>
            <textarea
              value={configText}
              onChange={(e) => setConfigText(e.target.value)}
              placeholder={`{
  "apiKey": "your-api-key",
  "authDomain": "your-project.firebaseapp.com",
  "projectId": "your-project-id",
  "storageBucket": "your-project.appspot.com",
  "messagingSenderId": "your-messaging-id",
  "appId": "your-app-id"
}`}
              className="w-full h-48 p-2 bg-darkBlue text-lightestSlate rounded-md mb-4 font-mono text-sm"
            />
            <button
              onClick={handleUpdateFirebaseConfig}
              className="py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-darkBlue bg-green hover:bg-green-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
            >
              Update Firebase Config
            </button>
          </div>
        )}
      </div>
    </div>
  );
  
  // Profile view
  const renderProfile = () => (
    <div className="bg-lightBlue bg-opacity-30 p-6 rounded-lg">
      <h3 className="text-2xl font-semibold text-lightestSlate mb-6">Profile Information</h3>
      
      {profileLoading ? (
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-green mx-auto"></div>
          <p className="mt-2 text-lightSlate">Loading profile...</p>
        </div>
      ) : !profile ? (
        <p className="text-center py-8 text-lightSlate">No profile information found.</p>
      ) : (
        <div className="mb-8 bg-lightBlue bg-opacity-50 p-4 rounded-lg">
          {!editingProfile ? (
            // Profile display view
            <div>
              <div className="flex justify-between items-start mb-6">
                <div>
                  <h4 className="text-xl font-medium text-lightestSlate">{profile.name}</h4>
                  <p className="text-green">
                    {Array.isArray(profile.occupation) 
                      ? profile.occupation.join(', ') 
                      : typeof profile.occupation === 'string' 
                        ? profile.occupation 
                        : ''}
                  </p>
                </div>
                <button
                  onClick={() => setEditingProfile(true)}
                  className="py-2 px-4 bg-green bg-opacity-20 text-green rounded hover:bg-opacity-30"
                >
                  Edit Profile
                </button>
              </div>
              
              {profile.image && (
                <div className="flex items-center mb-4">
                  <img 
                    src={profile.image} 
                    alt={profile.name} 
                    className="w-24 h-24 rounded-full object-cover border-2 border-green"
                  />
                </div>
              )}
              
              <div className="space-y-4 mt-6">
                <div>
                  <h5 className="text-lg font-medium text-green mb-1">About</h5>
                  <p className="text-lightSlate">{profile.bio}</p>
                </div>
                
                <div>
                  <h5 className="text-lg font-medium text-green mb-1">Contact Information</h5>
                  <p className="text-lightSlate mb-1"><span className="text-lightestSlate">Email:</span> {profile.email}</p>
                  {profile.phone && <p className="text-lightSlate mb-1"><span className="text-lightestSlate">Phone:</span> {profile.phone}</p>}
                  {profile.website && <p className="text-lightSlate mb-1"><span className="text-lightestSlate">Website:</span> {profile.website}</p>}
                  {profile.address && (
                    <p className="text-lightSlate">
                      <span className="text-lightestSlate">Location:</span> 
                      {profile.address.city}{profile.address.state ? `, ${profile.address.state}` : ''}
                    </p>
                  )}
                </div>
              </div>
            </div>
          ) : (
            // Profile edit form
            <div>
              <h4 className="text-lg font-medium text-green mb-4">Edit Profile</h4>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="block text-lightSlate mb-1">Name</label>
                  <input
                    type="text"
                    value={profile.name}
                    onChange={(e) => setProfile({...profile, name: e.target.value})}
                    className="w-full p-2 bg-darkBlue border border-lightBlue rounded"
                  />
                </div>
                
                <div>
                  <label className="block text-lightSlate mb-1">Email</label>
                  <input
                    type="email"
                    value={profile.email}
                    onChange={(e) => setProfile({...profile, email: e.target.value})}
                    className="w-full p-2 bg-darkBlue border border-lightBlue rounded"
                  />
                </div>
                
                <div className="md:col-span-2">
                  <label className="block text-lightSlate mb-1">Bio</label>
                  <textarea
                    value={profile.bio}
                    onChange={(e) => setProfile({...profile, bio: e.target.value})}
                    rows={5}
                    className="w-full p-2 bg-darkBlue border border-lightBlue rounded"
                  />
                </div>
                
                <div>
                  <label className="block text-lightSlate mb-1">City</label>
                  <input
                    type="text"
                    value={profile.address?.city || ''}
                    onChange={(e) => setProfile({
                      ...profile, 
                      address: {...(profile.address || {}), city: e.target.value}
                    })}
                    className="w-full p-2 bg-darkBlue border border-lightBlue rounded"
                  />
                </div>
                
                <div>
                  <label className="block text-lightSlate mb-1">State</label>
                  <input
                    type="text"
                    value={profile.address?.state || ''}
                    onChange={(e) => setProfile({
                      ...profile, 
                      address: {...(profile.address || {}), state: e.target.value}
                    })}
                    className="w-full p-2 bg-darkBlue border border-lightBlue rounded"
                  />
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
  
  // Skills view
  const renderSkills = () => (
    <div className="bg-lightBlue bg-opacity-30 p-6 rounded-lg">
      <h3 className="text-2xl font-semibold text-lightestSlate mb-6">Manage Skills</h3>
      
      {/* Create New Skill Form */}
      <div className="mb-8 bg-lightBlue bg-opacity-50 p-4 rounded-lg">
        <h4 className="text-lg font-medium text-green mb-4">Add New Skill</h4>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-4">
          <div className="flex flex-col">
            <label className="block text-lightSlate mb-2">Skill Name</label>
            <input
              type="text"
              value={newSkill.name}
              onChange={(e) => setNewSkill({...newSkill, name: e.target.value})}
              placeholder="e.g., JavaScript, React, Python"
              className="w-full p-2 bg-darkBlue border border-lightBlue rounded"
            />
          </div>
          
          <div className="flex flex-col">
            <label className="block text-lightSlate mb-2">Level (e.g., 75%)</label>
            <input
              type="text"
              value={newSkill.level}
              onChange={(e) => setNewSkill({...newSkill, level: e.target.value})}
              placeholder="e.g., 75%, 80%, 90%"
              className="w-full p-2 bg-darkBlue border border-lightBlue rounded"
            />
          </div>
          
          <div className="flex flex-col">
            <label className="block text-lightSlate mb-2">Category</label>
            <select
              value={newSkill.category}
              onChange={(e) => setNewSkill({...newSkill, category: e.target.value})}
              className="w-full p-2 bg-darkBlue border border-lightBlue rounded"
            >
              <option value="Frontend">Frontend</option>
              <option value="Backend">Backend</option>
              <option value="Tools & DevOps">Tools & DevOps</option>
              <option value="Other Skills">Other Skills</option>
            </select>
          </div>
        </div>
        
        <div className="flex justify-end gap-3 mt-6">
          <button
            onClick={saveNewSkill}
            disabled={loading}
            className="py-2 px-4 bg-green text-darkBlue rounded hover:bg-opacity-90"
          >
            {loading ? 'Saving...' : 'Add Skill'}
          </button>
        </div>
      </div>
      
      {/* Skills List */}
      <div>
        <h4 className="text-lg font-medium text-green mb-4">Skills List</h4>
        
        {skillsLoading ? (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-green mx-auto"></div>
            <p className="mt-2 text-lightSlate">Loading skills...</p>
          </div>
        ) : skills.length === 0 ? (
          <p className="text-center py-8 text-lightSlate">No skills found. Add your first skill above.</p>
        ) : (
          <div className="space-y-4">
            {/* Group skills by category */}
            {['Frontend', 'Backend', 'Tools & DevOps', 'Other Skills'].map(category => {
              const categorySkills = skills.filter(skill => skill.category === category);
              if (categorySkills.length === 0) return null;
              
              return (
                <div key={category} className="mb-6">
                  <h5 className="text-lg font-medium text-green mb-3 border-b border-lightBlue pb-2">{category}</h5>
                  <div className="space-y-3">
                    {categorySkills.map(skill => (
                      <div key={skill.id} className="bg-lightBlue bg-opacity-20 p-4 rounded-lg flex items-center justify-between">
                        {editingSkill && editingSkill.id === skill.id ? (
                          <div className="flex-grow bg-darkBlue bg-opacity-50 p-3 rounded">
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                              <div className="flex flex-col">
                                <label className="block text-lightSlate text-xs mb-1">Skill Name</label>
                                <input
                                  type="text"
                                  value={editingSkill.name}
                                  onChange={(e) => setEditingSkill({...editingSkill, name: e.target.value})}
                                  className="w-full p-1 text-sm bg-darkBlue border border-lightBlue rounded"
                                />
                              </div>
                              <div className="flex flex-col">
                                <label className="block text-lightSlate text-xs mb-1">Level</label>
                                <input
                                  type="text"
                                  value={editingSkill.level}
                                  onChange={(e) => setEditingSkill({...editingSkill, level: e.target.value})}
                                  className="w-full p-1 text-sm bg-darkBlue border border-lightBlue rounded"
                                />
                              </div>
                              <div className="flex flex-col">
                                <label className="block text-lightSlate text-xs mb-1">Category</label>
                                <select
                                  value={editingSkill.category}
                                  onChange={(e) => setEditingSkill({...editingSkill, category: e.target.value})}
                                  className="w-full p-1 text-sm bg-darkBlue border border-lightBlue rounded"
                                >
                                  <option value="Frontend">Frontend</option>
                                  <option value="Backend">Backend</option>
                                  <option value="Tools & DevOps">Tools & DevOps</option>
                                  <option value="Other Skills">Other Skills</option>
                                </select>
                              </div>
                            </div>
                            
                            <div className="flex justify-end gap-2 mt-3">
                              <button
                                onClick={() => setEditingSkill(null)}
                                className="py-1 px-2 text-xs border border-lightSlate text-lightSlate rounded hover:bg-lightBlue hover:bg-opacity-30"
                              >
                                Cancel
                              </button>
                              <button
                                onClick={updateSkill}
                                disabled={loading}
                                className="py-1 px-2 text-xs bg-green text-darkBlue rounded hover:bg-opacity-90"
                              >
                                {loading ? 'Saving...' : 'Update'}
                              </button>
                            </div>
                          </div>
                        ) : (
                          <>
                            <div className="flex-grow">
                              <div className="flex items-center justify-between mb-2">
                                <span className="text-lightestSlate">{skill.name}</span>
                                <span className="text-green text-sm">{skill.level}</span>
                              </div>
                              <div className="w-full bg-lightBlue h-2 rounded-full overflow-hidden">
                                <div 
                                  className="bg-green h-full rounded-full"
                                  style={{ width: skill.level }}
                                ></div>
                              </div>
                            </div>
                            
                            <div className="flex flex-col ml-6 gap-2">
                              <button
                                onClick={() => setEditingSkill(skill)}
                                className="py-1 px-3 text-sm bg-green bg-opacity-20 text-green rounded hover:bg-opacity-30"
                              >
                                Edit
                              </button>
                              <button
                                onClick={() => deleteSkill(skill.id)}
                                className="py-1 px-3 text-sm bg-red-500 bg-opacity-20 text-red-400 rounded hover:bg-opacity-30"
                              >
                                Delete
                              </button>
                            </div>
                          </>
                        )}
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
  );

  // Work Experience view
  const renderWork = () => (
    <div className="bg-lightBlue bg-opacity-30 p-6 rounded-lg">
      <h3 className="text-2xl font-semibold text-lightestSlate mb-6">Manage Work Experience</h3>
      
      {/* Create New Work Form */}
      <div className="mb-8 bg-lightBlue bg-opacity-50 p-4 rounded-lg">
        <h4 className="text-lg font-medium text-green mb-4">Add New Work Experience</h4>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <div>
            <label className="block text-lightSlate mb-1">Company Name</label>
            <input
              type="text"
              value={newWork.company}
              onChange={(e) => setNewWork({...newWork, company: e.target.value})}
              className="w-full p-2 bg-darkBlue border border-lightBlue rounded"
            />
          </div>
          
          <div>
            <label className="block text-lightSlate mb-1">Job Title</label>
            <input
              type="text"
              value={newWork.title}
              onChange={(e) => setNewWork({...newWork, title: e.target.value})}
              className="w-full p-2 bg-darkBlue border border-lightBlue rounded"
            />
          </div>
          
          <div>
            <label className="block text-lightSlate mb-1">Years</label>
            <input
              type="text"
              value={newWork.years}
              onChange={(e) => setNewWork({...newWork, years: e.target.value})}
              placeholder="e.g., 2019 - Present"
              className="w-full p-2 bg-darkBlue border border-lightBlue rounded"
            />
          </div>
        </div>
        
        <div className="mb-4">
          <label className="block text-lightSlate mb-1">Description (use bullet points with •)</label>
          <textarea
            value={newWork.description}
            onChange={(e) => setNewWork({...newWork, description: e.target.value})}
            rows={6}
            placeholder="• Developed responsive web applications using React&#10;• Implemented user authentication with Firebase&#10;• Optimized site performance by 40%"
            className="w-full p-2 bg-darkBlue border border-lightBlue rounded font-mono text-sm"
          />
          <p className="text-xs text-lightSlate mt-1">Each bullet point should start with • and be on a new line</p>
        </div>
        
        <div className="flex justify-end gap-3 mt-6">
          <button
            onClick={saveNewWork}
            disabled={loading}
            className="py-2 px-4 bg-green text-darkBlue rounded hover:bg-opacity-90"
          >
            {loading ? 'Saving...' : 'Add Work Experience'}
          </button>
        </div>
      </div>
      
      {/* Work Experience List */}
      <div>
        <h4 className="text-lg font-medium text-green mb-4">Work Experience List</h4>
        
        {workLoading ? (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-green mx-auto"></div>
            <p className="mt-2 text-lightSlate">Loading work experience...</p>
          </div>
        ) : workExperience.length === 0 ? (
          <p className="text-center py-8 text-lightSlate">No work experience found. Add your first work experience above.</p>
        ) : (
          <div className="space-y-6">
            {workExperience.map(work => (
              <div key={work.id} className="bg-lightBlue bg-opacity-20 p-4 rounded-lg">
                {editingWork && editingWork.id === work.id ? (
                  <div className="bg-darkBlue bg-opacity-50 p-3 rounded">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
                      <div>
                        <label className="block text-lightSlate text-xs mb-1">Company Name</label>
                        <input
                          type="text"
                          value={editingWork.company}
                          onChange={(e) => setEditingWork({...editingWork, company: e.target.value})}
                          className="w-full p-1 text-sm bg-darkBlue border border-lightBlue rounded"
                        />
                      </div>
                      <div>
                        <label className="block text-lightSlate text-xs mb-1">Job Title</label>
                        <input
                          type="text"
                          value={editingWork.title}
                          onChange={(e) => setEditingWork({...editingWork, title: e.target.value})}
                          className="w-full p-1 text-sm bg-darkBlue border border-lightBlue rounded"
                        />
                      </div>
                      <div>
                        <label className="block text-lightSlate text-xs mb-1">Years</label>
                        <input
                          type="text"
                          value={editingWork.years}
                          onChange={(e) => setEditingWork({...editingWork, years: e.target.value})}
                          className="w-full p-1 text-sm bg-darkBlue border border-lightBlue rounded"
                        />
                      </div>
                    </div>
                    
                    <div className="mb-3">
                      <label className="block text-lightSlate text-xs mb-1">Description</label>
                      <textarea
                        value={editingWork.description}
                        onChange={(e) => setEditingWork({...editingWork, description: e.target.value})}
                        rows={4}
                        className="w-full p-1 text-sm bg-darkBlue border border-lightBlue rounded font-mono"
                      />
                    </div>
                    
                    <div className="flex justify-end gap-2">
                      <button
                        onClick={() => setEditingWork(null)}
                        className="py-1 px-2 text-xs border border-lightSlate text-lightSlate rounded hover:bg-lightBlue hover:bg-opacity-30"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={updateWork}
                        disabled={loading}
                        className="py-1 px-2 text-xs bg-green text-darkBlue rounded hover:bg-opacity-90"
                      >
                        {loading ? 'Saving...' : 'Update'}
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="flex flex-wrap justify-between items-start mb-4">
                      <div className="mb-2 md:mb-0">
                        <h5 className="text-lg font-medium text-lightestSlate">{work.title}</h5>
                        <p className="text-green">{work.company}</p>
                        <p className="text-lightSlate text-sm">{work.years}</p>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => setEditingWork(work)}
                          className="py-1 px-3 text-sm bg-green bg-opacity-20 text-green rounded hover:bg-opacity-30"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => deleteWork(work.id)}
                          className="py-1 px-3 text-sm bg-red-500 bg-opacity-20 text-red-400 rounded hover:bg-opacity-30"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                    
                    <div className="text-lightSlate">
                      {work.description && typeof work.description === 'string' 
                        ? work.description.split('\n').map((item, i) => (
                            <p key={i} className="mb-1">{item}</p>
                          ))
                        : Array.isArray(work.description)
                          ? work.description.map((item, i) => (
                              <p key={i} className="mb-1">{item}</p>
                            ))
                          : <p className="mb-1">No description available</p>
                      }
                    </div>
                  </>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );

  // Education view
  const renderEducation = () => (
    <div className="bg-lightBlue bg-opacity-30 p-6 rounded-lg">
      <h3 className="text-2xl font-semibold text-lightestSlate mb-6">Manage Education</h3>
      
      {/* Create New Education Form */}
      <div className="mb-8 bg-lightBlue bg-opacity-50 p-4 rounded-lg">
        <h4 className="text-lg font-medium text-green mb-4">Add New Education</h4>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <div>
            <label className="block text-lightSlate mb-1">School / University</label>
            <input
              type="text"
              value={newEducation.school}
              onChange={(e) => setNewEducation({...newEducation, school: e.target.value})}
              className="w-full p-2 bg-darkBlue border border-lightBlue rounded"
            />
          </div>
          
          <div>
            <label className="block text-lightSlate mb-1">Degree / Certification</label>
            <input
              type="text"
              value={newEducation.degree}
              onChange={(e) => setNewEducation({...newEducation, degree: e.target.value})}
              className="w-full p-2 bg-darkBlue border border-lightBlue rounded"
            />
          </div>
          
          <div>
            <label className="block text-lightSlate mb-1">Graduation Year</label>
            <input
              type="text"
              value={newEducation.graduated}
              onChange={(e) => setNewEducation({...newEducation, graduated: e.target.value})}
              placeholder="e.g., 2018"
              className="w-full p-2 bg-darkBlue border border-lightBlue rounded"
            />
          </div>
        </div>
        
        <div className="mb-4">
          <label className="block text-lightSlate mb-1">Description (Optional)</label>
          <textarea
            value={newEducation.description}
            onChange={(e) => setNewEducation({...newEducation, description: e.target.value})}
            rows={4}
            placeholder="Add any additional information about the education"
            className="w-full p-2 bg-darkBlue border border-lightBlue rounded"
          />
        </div>
        
        <div className="flex justify-end gap-3 mt-6">
          <button
            onClick={saveNewEducation}
            disabled={loading}
            className="py-2 px-4 bg-green text-darkBlue rounded hover:bg-opacity-90"
          >
            {loading ? 'Saving...' : 'Add Education'}
          </button>
        </div>
      </div>
      
      {/* Education List */}
      <div>
        <h4 className="text-lg font-medium text-green mb-4">Education List</h4>
        
        {educationLoading ? (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-green mx-auto"></div>
            <p className="mt-2 text-lightSlate">Loading education...</p>
          </div>
        ) : education.length === 0 ? (
          <p className="text-center py-8 text-lightSlate">No education entries found. Add your first education entry above.</p>
        ) : (
          <div className="space-y-6">
            {education.map(edu => (
              <div key={edu.id} className="bg-lightBlue bg-opacity-20 p-4 rounded-lg">
                {editingEducation && editingEducation.id === edu.id ? (
                  <div className="bg-darkBlue bg-opacity-50 p-3 rounded">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
                      <div>
                        <label className="block text-lightSlate text-xs mb-1">School / University</label>
                        <input
                          type="text"
                          value={editingEducation.school}
                          onChange={(e) => setEditingEducation({...editingEducation, school: e.target.value})}
                          className="w-full p-1 text-sm bg-darkBlue border border-lightBlue rounded"
                        />
                      </div>
                      <div>
                        <label className="block text-lightSlate text-xs mb-1">Degree / Certification</label>
                        <input
                          type="text"
                          value={editingEducation.degree}
                          onChange={(e) => setEditingEducation({...editingEducation, degree: e.target.value})}
                          className="w-full p-1 text-sm bg-darkBlue border border-lightBlue rounded"
                        />
                      </div>
                      <div>
                        <label className="block text-lightSlate text-xs mb-1">Graduation Year</label>
                        <input
                          type="text"
                          value={editingEducation.graduated}
                          onChange={(e) => setEditingEducation({...editingEducation, graduated: e.target.value})}
                          className="w-full p-1 text-sm bg-darkBlue border border-lightBlue rounded"
                        />
                      </div>
                    </div>
                    
                    <div className="mb-3">
                      <label className="block text-lightSlate text-xs mb-1">Description (Optional)</label>
                      <textarea
                        value={editingEducation.description}
                        onChange={(e) => setEditingEducation({...editingEducation, description: e.target.value})}
                        rows={3}
                        className="w-full p-1 text-sm bg-darkBlue border border-lightBlue rounded"
                      />
                    </div>
                    
                    <div className="flex justify-end gap-2">
                      <button
                        onClick={() => setEditingEducation(null)}
                        className="py-1 px-2 text-xs border border-lightSlate text-lightSlate rounded hover:bg-lightBlue hover:bg-opacity-30"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={updateEducation}
                        disabled={loading}
                        className="py-1 px-2 text-xs bg-green text-darkBlue rounded hover:bg-opacity-90"
                      >
                        {loading ? 'Saving...' : 'Update'}
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="flex flex-wrap justify-between items-start mb-4">
                      <div className="mb-2 md:mb-0">
                        <h5 className="text-lg font-medium text-lightestSlate">{edu.school}</h5>
                        <p className="text-green">{edu.degree}</p>
                        <p className="text-lightSlate text-sm">Graduated: {edu.graduated}</p>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => setEditingEducation(edu)}
                          className="py-1 px-3 text-sm bg-green bg-opacity-20 text-green rounded hover:bg-opacity-30"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => deleteEducation(edu.id)}
                          className="py-1 px-3 text-sm bg-red-500 bg-opacity-20 text-red-400 rounded hover:bg-opacity-30"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                    
                    {edu.description && (
                      <div className="text-lightSlate">
                        <p>{edu.description}</p>
                      </div>
                    )}
                  </>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );

  // Use Routes instead of a renderContent function
  
  // If not logged in, show login form
  if (!user) {
    return (
      <section className="min-h-screen bg-darkBlue flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full space-y-8 bg-lightBlue bg-opacity-20 p-8 rounded-lg">
          <div>
            <h2 className="mt-6 text-center text-3xl font-bold text-lightestSlate">Admin Login</h2>
            <p className="mt-2 text-center text-sm text-lightSlate">
              Enter your credentials to access admin features
            </p>
          </div>
          
          {message && (
            <div className={`p-4 rounded ${
              messageType === 'success' ? 'bg-green-100 text-green-700' : 
              messageType === 'info' ? 'bg-blue-100 text-blue-700' :
              'bg-red-100 text-red-700'
            }`}>
              {message}
            </div>
          )}
          
          <form className="mt-8 space-y-6" onSubmit={handleLogin}>
            <div className="rounded-md shadow-sm -space-y-px">
              <div>
                <label htmlFor="email-address" className="sr-only">Email address</label>
                <input
                  id="email-address"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-t-md focus:outline-none focus:ring-green-500 focus:border-green-500 focus:z-10 sm:text-sm"
                  placeholder="Email address"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
              <div>
                <label htmlFor="password" className="sr-only">Password</label>
                <input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete="current-password"
                  required
                  className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-b-md focus:outline-none focus:ring-green-500 focus:border-green-500 focus:z-10 sm:text-sm"
                  placeholder="Password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
            </div>

            <div>
              <button
                type="submit"
                disabled={loading}
                className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-darkBlue bg-green hover:bg-green-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
              >
                {loading ? 'Loading...' : 'Sign in'}
              </button>
            </div>
          </form>
        </div>
      </section>
    );
  }
  
  // If logged in, show admin dashboard with routes
  return (
    <section className="min-h-screen bg-darkBlue py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col md:flex-row gap-6">
          {/* Sidebar */}
          {renderSidebar()}
          
          {/* Main Content */}
          <div className="flex-grow">
            {/* Messages */}
            <MessageDisplay message={message} messageType={messageType} />
            
            {/* Routes for Different Admin Sections */}
            <Routes>
              <Route path="/" element={
                <Dashboard 
                  db={db} 
                  projects={projects} 
                  certificates={certificates} 
                  skills={skills} 
                  workExperience={workExperience} 
                  education={education} 
                  loadAllData={loadAllData} 
                />
              } />
              <Route path="/projects" element={<Projects db={db} auth={auth} />} />
              {/* Temporarily restore all original render functions */}
              <Route path="/profile" element={renderProfile()} />
              <Route path="/certificates" element={renderCertificates()} />
              <Route path="/skills" element={renderSkills()} />
              <Route path="/work" element={renderWork()} />
              <Route path="/education" element={renderEducation()} />
              <Route path="/settings" element={renderSettings()} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Admin;