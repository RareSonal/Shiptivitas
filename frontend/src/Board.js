import React, { Component } from 'react';
import 'dragula/dist/dragula.css';
import Swimlane from './Swimlane';
import './Board.css';
import dragula from 'dragula';

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

  async fetchCards() {
    try {
      const response = await fetch(`${apiBaseUrl}/api/cards`);
      if (!response.ok) {
        console.error('Failed to fetch cards');
        return;
      }
      const cards = await response.json();
      const newCards = this.updateCardsState(cards);
      this.setState({ cards: newCards });
    } catch (error) {
      console.error('Error fetching cards:', error);
    }
  }

  async updateCardStatus(el, target, sibling) {
    const cardId = el.dataset.id;
    const targetStatus = target.dataset.status;

    const allCards = [
      ...(this.state.cards.backlog || []),
      ...(this.state.cards['in-progress'] || []),
      ...(this.state.cards.complete || []),
    ];

    const card = allCards.find(c => c.id.toString() === cardId);
    if (!card) return;

    const oldStatus = card.status;
    const oldPriority = card.priority;

    const siblingId = sibling ? sibling.dataset.id : null;
    const targetCards = allCards
      .filter(c => c.status === targetStatus && c.id !== card.id)
      .sort((a, b) => a.priority - b.priority);

    const newPriority = siblingId
      ? targetCards.findIndex(c => c.id.toString() === siblingId)
      : targetCards.length;

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
        console.error('Failed to update card status');
        return;
      }

      // Fetch fresh cards after update
      await this.fetchCards();

    } catch (error) {
      console.error('Error updating card:', error);
    }
  }

  updateCardsState(updatedCards) {
    const newCards = {
      backlog: [],
      'in-progress': [],
      complete: [],
    };

    updatedCards.forEach(card => {
      if (card.status === 'backlog') {
        newCards.backlog.push(card);
      } else if (card.status === 'in-progress') {
        newCards['in-progress'].push(card);
      } else if (card.status === 'complete') {
        newCards.complete.push(card);
      } else {
        console.warn(`Unexpected status: ${card.status}, skipping card.`);
      }
    });

    return newCards;
  }

  getCardStyle(status) {
    switch (status) {
      case 'backlog': return { backgroundColor: 'grey' };
      case 'in-progress': return { backgroundColor: 'blue' };
      case 'complete': return { backgroundColor: 'green' };
      default: return {};
    }
  }

  renderSwimlane(name, status, cards, ref) {
    return (
      <Swimlane
        name={name}
        status={status}
        clients={cards.map(c => ({
          ...c,
          style: this.getCardStyle(c.status),
        }))}
        dragulaRef={ref}
      />
    );
  }

  render() {
    const { backlog = [], 'in-progress': inProgress = [], complete = [] } = this.state.cards;

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
