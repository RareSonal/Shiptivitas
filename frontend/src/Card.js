import React from 'react';
import './Card.css';

export default class Card extends React.Component {
  render() {
    const { id, name, status, style } = this.props;

    return (
      <div
        className="Card"
        data-id={id}
        data-status={status}
        style={style} // This will dynamically update the background color based on status
      >
        <div className="Card-title">{name}</div>
      </div>
    );
  }
}

