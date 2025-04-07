import React from 'react';
import './Card.css';

export default class Card extends React.Component {
  render() {
    // Default card class
    let className = ['Card'];

    // Apply different colors based on the status of the card
    if (this.props.status === 'backlog') {
      className.push('Card-grey'); // For backlog status
    } else if (this.props.status === 'in-progress') {
      className.push('Card-blue'); // For in-progress status
    } else if (this.props.status === 'complete') {
      className.push('Card-green'); // For complete status
    }

    return (
      <div className={className.join(' ')} data-id={this.props.id} data-status={this.props.status}>
        <div className="Card-title">{this.props.name}</div>
      </div>
    );
  }
}
/*
import React from 'react';
import './Card.css';

export default class Card extends React.Component {
  render() {
    // Mapping statuses to corresponding classes
    const statusClassMap = {
      backlog: 'Card-grey',
      'in-progress': 'Card-blue',
      complete: 'Card-green',
    };

    // Get the appropriate class for the card based on status
    const className = ['Card', statusClassMap[this.props.status] || '']; // Default to empty string if no status matches

    return (
      <div className={className.join(' ')} data-id={this.props.id} data-status={this.props.status}>
        <div className="Card-title">{this.props.name}</div>
      </div>
    );
  }
}
*/