// App.js
import React, { Component } from 'react';
import 'bootstrap/dist/css/bootstrap.css';
import HomeTab from './HomeTab';
import Navigation from './Navigation';
import Board from './Board';
import './App.css';

class App extends Component {
  constructor(props) {
    super(props);
    this.state = {
      selectedTab: 'home',
      isUnlocked: false,
      userId: null,
      clients: {
        backlog: [],
        inProgress: [],
        complete: [],
      },
    };
  }

  changeTab = (tabName) => {
    if (tabName === 'home') {
      this.setState({
        selectedTab: 'home',
        isUnlocked: false,
        userId: null,
        clients: {
          backlog: [],
          inProgress: [],
          complete: [],
        },
      });
    } else {
      this.setState({ selectedTab: tabName });
    }
  };

  handleUnlock = async (pin, userId) => {
    try {
      const cardsRes = await fetch('/api/cards');
      const cards = await cardsRes.json();

      const groupedCards = {
        backlog: cards.filter((c) => c.status === 'backlog'),
        inProgress: cards.filter((c) => c.status === 'in-progress'),
        complete: cards.filter((c) => c.status === 'complete'),
      };

      this.setState({
        isUnlocked: true,
        selectedTab: 'shipping-requests',
        userId,
        clients: groupedCards,
      });
    } catch (error) {
      console.error('Error fetching cards:', error);
      alert('An error occurred while loading cards.');
    }
  };

  handleCardChange = async (cardID, oldStatus, newStatus, oldPriority, newPriority) => {
    try {
      await fetch('/api/card-change', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          card_id: cardID,
          change_description: `Status: ${oldStatus} → ${newStatus}, Priority: ${oldPriority} → ${newPriority}`,
          changed_by: this.state.userId,
        }),
      });
    } catch (error) {
      console.error('Failed to update card:', error);
    }
  };

  renderShippingRequests() {
    return (
      <Board
        clients={this.state.clients}
        currentUserId={this.state.userId}
        updateClients={(newClients) => this.setState({ clients: newClients })}
        onCardChange={this.handleCardChange}
      />
    );
  }

  renderNavigation() {
    return (
      <Navigation
        onClick={this.changeTab}
        selectedTab={this.state.selectedTab}
        isUnlocked={this.state.isUnlocked}
      />
    );
  }

  renderTabContent() {
    const { selectedTab, isUnlocked } = this.state;
    if (selectedTab === 'shipping-requests' && isUnlocked) {
      return this.renderShippingRequests();
    }
    return <HomeTab onUnlock={this.handleUnlock} />;
  }

  render() {
    return (
      <div className="App">
        {this.renderNavigation()}
        <div className="App-body">
          {this.renderTabContent()}
        </div>
      </div>
    );
  }
}

export default App;



