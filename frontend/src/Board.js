import React, { Component } from 'react';
import 'dragula/dist/dragula.css';
import Swimlane from './Swimlane';
import './Board.css';
import dragula from 'dragula';

export default class Board extends Component {
  constructor(props) {
    super(props);
    this.state = {
      cards: this.props.clients || { backlog: [], inProgress: [], complete: [] },
    };
    this.swimlanes = {
      backlog: React.createRef(),
      inProgress: React.createRef(),
      complete: React.createRef(),
    };
  }

  componentDidMount() {
    this.drake = dragula([
      this.swimlanes.backlog.current,
      this.swimlanes.inProgress.current,
      this.swimlanes.complete.current,
    ]);

    this.drake.on('drop', (el, target, source, sibling) => {
      console.log('Card dropped:', el.dataset.id, target.dataset.status); // Debugging
      this.updateCardStatus(el, target, sibling);
    });
  }

  componentWillUnmount() {
    if (this.drake) {
      this.drake.destroy();
    }
  }

  // Update card status and priority after drag
  async updateCardStatus(el, target, sibling) {
    const cardId = el.dataset.id;
    const targetStatus = target.dataset.status;

    // Fetch all cards and find the dragged card
    const allCards = [
      ...(this.state.cards.backlog || []),
      ...(this.state.cards.inProgress || []),
      ...(this.state.cards.complete || []),
    ];
    const card = allCards.find(c => c.id.toString() === cardId);

    if (!card) return;

    const oldStatus = card.status;
    const oldPriority = card.priority;

    // Find the new priority based on the sibling card's position
    const siblingId = sibling ? sibling.dataset.id : null;
    const targetCards = allCards
      .filter(c => c.status === targetStatus && c.id !== card.id)
      .sort((a, b) => a.priority - b.priority);

    const newPriority = siblingId
      ? targetCards.findIndex(c => c.id.toString() === siblingId)
      : targetCards.length;

    try {
      console.log(`Updating card status for card ID: ${cardId}, from ${oldStatus} to ${targetStatus}`);

      // Update the card status and priority via API
      const response = await fetch(`/api/v1/cards/${card.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          newStatus: targetStatus,
          newPriority,
          oldStatus,
          oldPriority,
          userId: this.props.currentUserId,
        }),
      });

      if (!response.ok) {
        console.error('Failed to update card status');
        return;
      }

      const updatedCards = await response.json();

      // Update the state with the updated cards
      this.setState({ cards: this.updateCardsState(updatedCards) });
      console.log('Card status updated:', updatedCards);

    } catch (error) {
      console.error('Error updating card:', error);
    }
  }

  // Helper function to update cards state
  updateCardsState(updatedCards) {
    const newCards = {
      backlog: [],
      inProgress: [],
      complete: [],
    };

    updatedCards.forEach(card => {
      // Ensure the status is a valid category before attempting to push
      if (['backlog', 'in-progress', 'complete'].includes(card.status)) {
        newCards[card.status].push(card);
      } else {
        // Log unexpected statuses and handle them gracefully
        console.warn(`Unexpected status: ${card.status}, skipping card.`);
      }
    });

    return newCards;
  }

  // Determine the card style based on its status
  getCardStyle(status) {
    switch (status) {
      case 'backlog': return { backgroundColor: 'grey' };
      case 'in-progress': return { backgroundColor: 'blue' };
      case 'complete': return { backgroundColor: 'green' };
      default: return {};
    }
  }

  // Render a Swimlane component for each status category
  renderSwimlane(name, status, cards, ref) {
    return (
      <Swimlane
        name={name}
        status={status}
        clients={cards.map(c => ({
          ...c,
          style: this.getCardStyle(c.status), // Recalculate style after status change
        }))}
        dragulaRef={ref}
      />
    );
  }

  render() {
    const { backlog = [], inProgress = [], complete = [] } = this.state.cards;

    return (
      <div className="Board container-fluid">
        <div className="row">
          <div className="col-md-4">
            {this.renderSwimlane('Backlog', 'backlog', backlog, this.swimlanes.backlog)}
          </div>
          <div className="col-md-4">
            {this.renderSwimlane('In Progress', 'in-progress', inProgress, this.swimlanes.inProgress)}
          </div>
          <div className="col-md-4">
            {this.renderSwimlane('Complete', 'complete', complete, this.swimlanes.complete)}
          </div>
        </div>
      </div>
    );
  }
}
