// PinVerification.js
import React, { useState } from 'react';

export default function PinVerification({ onUnlock }) {
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
      const response = await fetch('/api/verify-pin', {
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
    } catch (error) {
      console.error('Error verifying PIN:', error);
      setErrorMessage('An error occurred while verifying the PIN.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="pin-input-container" style={{ marginTop: '20px' }}>
      <h3>Enter your 4-digit PIN to unlock Shipping Requests Tab</h3>
      <input
        type="password" // Use "password" to hide input characters
        value={pin}
        onChange={handlePinChange}
        maxLength="4"
        placeholder="PIN"
        style={{
          padding: '8px',
          fontSize: '16px',
          width: '100px',
          textAlign: 'center',
        }}
      />
      <button
        onClick={handleUnlockClick}
        style={{ marginLeft: '10px', padding: '8px 16px', fontSize: '16px' }}
        disabled={isLoading}
      >
        {isLoading ? 'Verifying...' : 'Unlock'}
      </button>
      {errorMessage && (
        <div style={{ color: 'red', marginTop: '10px' }}>
          {errorMessage}
        </div>
      )}
    </div>
  );
}

