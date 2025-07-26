import React, { useState } from 'react';

const apiBaseUrl = process.env.REACT_APP_API_BASE_URL;

export default function HomeTab({ onUnlock }) {
  const [pin, setPin] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handlePinChange = (e) => {
    setPin(e.target.value);
  };

  const handleUnlockClick = async () => {
    if (pin.length !== 4 || isNaN(pin)) {
      setErrorMessage('Please enter a valid 4-digit PIN.');
      return;
    }

    setErrorMessage('');
    setIsLoading(true);

    try {
      const response = await fetch(`${apiBaseUrl}/api/verify-pin`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pin }),
      });

      const data = await response.json();

      if (response.ok && data.valid) {
        onUnlock(pin, data.userId);
      } else {
        setErrorMessage(data.error || 'Invalid PIN.');
      }
    } catch (error
