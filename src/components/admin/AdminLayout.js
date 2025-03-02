import React from 'react';
import { signOut } from 'firebase/auth';
import useMessage from '../../hooks/useMessage';

const AdminLayout = ({ children, activeView, setActiveView, auth }) => {
  const { showMessage } = useMessage();

  const handleLogout = async () => {
    try {
      await signOut(auth);
      showMessage('Logged out successfully!', 'success');
    } catch (error) {
      console.error('Error logging out:', error);
      showMessage('Error logging out: ' + error.message, 'error');
    }
  };

  // Sidebar menu with nav options
  const renderSidebar = () => (
    <div className="w-64 bg-lightBlue bg-opacity-30 p-4 rounded-lg">
      <h3 className="text-xl font-semibold text-lightestSlate mb-4">Navigation</h3>
      <nav className="space-y-2">
        <button
          onClick={() => setActiveView('dashboard')}
          className={`w-full text-left py-2 px-3 rounded ${activeView === 'dashboard' ? 'bg-green text-darkBlue' : 'hover:bg-lightBlue hover:bg-opacity-50'}`}
        >
          Dashboard
        </button>
        <button
          onClick={() => setActiveView('profile')}
          className={`w-full text-left py-2 px-3 rounded ${activeView === 'profile' ? 'bg-green text-darkBlue' : 'hover:bg-lightBlue hover:bg-opacity-50'}`}
        >
          Profile
        </button>
        <button
          onClick={() => setActiveView('projects')}
          className={`w-full text-left py-2 px-3 rounded ${activeView === 'projects' ? 'bg-green text-darkBlue' : 'hover:bg-lightBlue hover:bg-opacity-50'}`}
        >
          Projects
        </button>
        <button
          onClick={() => setActiveView('certificates')}
          className={`w-full text-left py-2 px-3 rounded ${activeView === 'certificates' ? 'bg-green text-darkBlue' : 'hover:bg-lightBlue hover:bg-opacity-50'}`}
        >
          Certificates
        </button>
        <button
          onClick={() => setActiveView('skills')}
          className={`w-full text-left py-2 px-3 rounded ${activeView === 'skills' ? 'bg-green text-darkBlue' : 'hover:bg-lightBlue hover:bg-opacity-50'}`}
        >
          Skills
        </button>
        <button
          onClick={() => setActiveView('work')}
          className={`w-full text-left py-2 px-3 rounded ${activeView === 'work' ? 'bg-green text-darkBlue' : 'hover:bg-lightBlue hover:bg-opacity-50'}`}
        >
          Work Experience
        </button>
        <button
          onClick={() => setActiveView('education')}
          className={`w-full text-left py-2 px-3 rounded ${activeView === 'education' ? 'bg-green text-darkBlue' : 'hover:bg-lightBlue hover:bg-opacity-50'}`}
        >
          Education
        </button>
        <button
          onClick={() => setActiveView('settings')}
          className={`w-full text-left py-2 px-3 rounded ${activeView === 'settings' ? 'bg-green text-darkBlue' : 'hover:bg-lightBlue hover:bg-opacity-50'}`}
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

  return (
    <section className="min-h-screen bg-darkBlue py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col md:flex-row gap-6">
          {/* Sidebar */}
          {renderSidebar()}
          
          {/* Main Content */}
          <div className="flex-grow">
            {children}
          </div>
        </div>
      </div>
    </section>
  );
};

export default AdminLayout;