import React from 'react';
import Card from './Card';
import './Swimlane.css';

export default class Swimlane extends React.Component {
  render() {
    const { name, status, clients, dragulaRef } = this.props;

    return (
      <div className="Swimlane-column">
        <div className="Swimlane-title">{name}</div>
        <div
          className="Swimlane-dragColumn"
          data-status={status}
          ref={dragulaRef}
        >
          {clients.map(client => (
            <Card
              key={client.id}
              id={client.id}
              name={client.name}
              status={client.status}
              style={client.style}
            />
          ))}
        </div>
      </div>
    );
  }
}
