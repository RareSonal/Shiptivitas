// HomeTab.js
import React, { useState } from 'react';

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
      const response = await fetch(
        `${process.env.REACT_APP_API_BASE_URL}/api/verify-pin`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ pin }),
        }
      );

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
    <header className="App-header">
      <div className="App-title">
        <h1>SHIPTIVITAS</h1>
        <div className="App-icon">
          <div className="Circle" />
        </div>
      </div>

      <div className="pin-input-container" style={{ marginTop: '20px' }}>
        <h3>Enter your 4-digit PIN to unlock Shipping Requests Tab</h3>
        <input
          type="password"
          aria-label="4-digit PIN"
          value={pin}
          onChange={handlePinChange}
          maxLength="4"
          placeholder="PIN"
          style={{
            padding: '8px',
            fontSize: '16px',
            width: '100px',
            textAlign: 'center',
            letterSpacing: '6px',
          }}
        />
        <button
          onClick={handleUnlockClick}
          disabled={isLoading}
          style={{
            marginLeft: '10px',
            padding: '8px 16px',
            fontSize: '16px',
            cursor: isLoading ? 'not-allowed' : 'pointer',
          }}
        >
          {isLoading ? 'Verifying...' : 'Unlock'}
        </button>

        {errorMessage && (
          <div
            className="error-message"
            style={{ color: 'red', marginTop: '10px' }}
          >
            {errorMessage}
          </div>
        )}
      </div>
    </header>
  );
}
