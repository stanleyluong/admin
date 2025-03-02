import { useState, useCallback } from 'react';

/**
 * Custom hook for displaying temporary messages
 * @returns {Object} - message utilities
 */
const useMessage = () => {
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState(''); // 'success', 'error', or 'info'
  
  const showMessage = useCallback((msg, type) => {
    setMessage(msg);
    setMessageType(type);
    setTimeout(() => {
      setMessage('');
      setMessageType('');
    }, 5000);
  }, []);

  return {
    message,
    messageType,
    showMessage
  };
};

export default useMessage;