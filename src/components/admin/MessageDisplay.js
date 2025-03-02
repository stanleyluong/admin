import React from 'react';

/**
 * Component for displaying messages with different styles based on type
 */
const MessageDisplay = ({ message, messageType, isMobile = false }) => {
  if (!message) return null;
  
  const getMessageClasses = () => {
    const baseClasses = isMobile 
      ? "w-full p-4 mb-2 rounded-lg" 
      : "p-4 mb-6 rounded-lg";
      
    switch (messageType) {
      case 'success':
        return `${baseClasses} bg-green bg-opacity-20 text-green-300`;
      case 'info':
        return `${baseClasses} bg-blue-900 bg-opacity-30 text-blue-300`;
      case 'error':
      default:
        return `${baseClasses} bg-red-900 bg-opacity-30 text-red-300`;
    }
  };
  
  return (
    <div className={getMessageClasses()}>
      {message}
    </div>
  );
};

export default MessageDisplay;