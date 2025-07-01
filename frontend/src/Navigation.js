import React from 'react';

export default class Navigation extends React.Component {
  render() {
    const { selectedTab, onClick, isUnlocked } = this.props;

    return (
      <ul className="nav nav-tabs">
        <li className="nav-item">
          <a
            className={`nav-link ${selectedTab === 'home' ? 'active' : ''}`}
            onClick={() => onClick('home')}
            href="#home"
          >
            Home
          </a>
        </li>

        {isUnlocked && (
          <li className="nav-item">
            <a
              className={`nav-link ${selectedTab === 'shipping-requests' ? 'active' : ''}`}
              onClick={() => onClick('shipping-requests')}
              href="#shipping-requests"
            >
              Shipping Requests
            </a>
          </li>
        )}
      </ul>
    );
  }
}

