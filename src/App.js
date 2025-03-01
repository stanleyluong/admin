import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import Admin from './Admin';
import './App.css';

const App = () => {
  return (
    <div className="App">
      <Routes>
        <Route path="/" element={<Admin />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </div>
  );
};

export default App;