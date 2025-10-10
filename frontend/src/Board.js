import React, { Component } from 'react';
import 'dragula/dist/dragula.css';
import dragula from 'dragula';
import Swimlane from './Swimlane';
import './Board.css';

const apiBaseUrl = process.env.REACT_APP_API_BASE_URL;

export default class Board extends Component {
  constructor(props) {
    super(props);
    this.state = {
      cards: {
        backlog: [],
        'in-progress': [],
        complete: [],
      },
    };

    this.swimlanes = {
      backlog: React.createRef(),
      'in-progress': React.createRef(),
      complete: React.createRef(),
    };
  }

  componentDidMount() {
    this.fetchCards();

    // Initialize dragula on the swimlane columns
    this.drake = dragula([
      this.swimlanes.backlog.current,
      this.swimlanes['in-progress'].current,
      this.swimlanes.complete.current,
    ]);

    this.drake.on('drop', (el, target, source, sibling) => {
      this.updateCardStatus(el, target, sibling);
    });
  }

  componentWillUnmount() {
    if (this.drake) {
      this.drake.destroy();
    }
  }

  // Fetch cards from API and organize them into swimlanes
  async fetchCards() {
    try {
      const response = await fetch(`${apiBaseUrl}/api/cards`);
      if (!response.ok) {
        console.error('Failed to fetch cards');
        return;
      }
      const cards = await response.json();
      const organizedCards = this.updateCardsState(cards);
      this.setState({ cards: organizedCards });
    } catch (error) {
      console.error('Error fetching cards:', error);
    }
  }

  // Update card status and priority after dragging
  async updateCardStatus(el, target, sibling) {
    const cardId = el.dataset.id;
    const targetStatus = target.dataset.status;

    const allCards = [
      ...this.state.cards.backlog,
      ...this.state.cards['in-progress'],
      ...this.state.cards.complete,
    ];

    const card = allCards.find(c => c.id.toString() === cardId);
    if (!card) return;

    const oldStatus = card.status;
    const oldPriority = card.priority;

    const siblingId = sibling ? sibling.dataset.id : null;

    const targetCards = allCards
      .filter(c => c.status === targetStatus && c.id.toString() !== cardId)
      .sort((a, b) => a.priority - b.priority);

    const siblingIndex = siblingId
      ? targetCards.findIndex(c => c.id.toString() === siblingId)
      : -1;

    const newPriority = siblingIndex === -1 ? targetCards.length : siblingIndex;

    try {
      const response = await fetch(`${apiBaseUrl}/api/v1/cards/${card.id}`, {
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
        const errorText = await response.text();
        console.error('Failed to update card:', errorText);
        return;
      }

      const updatedCards = await response.json();
      const updatedState = this.updateCardsState(updatedCards);
      this.setState({ cards: updatedState });

    } catch (error) {
      console.error('Error updating card:', error);
    }
  }

  // Reorganize cards into columns
  updateCardsState(cards) {
    const organized = {
      backlog: [],
      'in-progress': [],
      complete: [],
    };

    cards.forEach(card => {
      if (organized[card.status]) {
        organized[card.status].push(card);
      } else {
        console.warn(`Unexpected status "${card.status}", skipping card.`);
      }
    });

    return organized;
  }

  // Visual styling based on card status
  getCardStyle(status) {
    switch (status) {
      case 'backlog':
        return { backgroundColor: 'grey' };
      case 'in-progress':
        return { backgroundColor: 'blue' };
      case 'complete':
        return { backgroundColor: 'green' };
      default:
        return {};
    }
  }

  renderSwimlane(title, statusKey, cards, laneRef) {
    return (
      <Swimlane
        name={title}
        status={statusKey}
        clients={cards.map(card => ({
          ...card,
          style: this.getCardStyle(card.status),
        }))}
        dragulaRef={laneRef}
      />
    );
  }

  render() {
    const { backlog, 'in-progress': inProgress, complete } = this.state.cards;

    return (
      <div className="Board container-fluid">
        <div className="row">
          <div className="col-md-4">
            {this.renderSwimlane('Backlog', 'backlog', backlog, this.swimlanes.backlog)}
          </div>
          <div className="col-md-4">
            {this.renderSwimlane('In Progress', 'in-progress', inProgress, this.swimlanes['in-progress'])}
          </div>
          <div className="col-md-4">
            {this.renderSwimlane('Complete', 'complete', complete, this.swimlanes.complete)}
          </div>
        </div>
      </div>
    );
  }
}
