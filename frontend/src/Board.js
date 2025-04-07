import React from 'react';
import 'dragula/dist/dragula.css';
import Swimlane from './Swimlane';
import './Board.css';
import dragula from 'dragula';

export default class Board extends React.Component {
  constructor(props) {
    super(props);
    const clients = this.getClients();
    this.state = {
      clients: {
        backlog: clients.filter(client => client.status === 'backlog'),
        inProgress: clients.filter(client => client.status === 'in-progress'),
        complete: clients.filter(client => client.status === 'complete'),
      }
    };
    this.swimlanes = {
      backlog: React.createRef(),
      inProgress: React.createRef(),
      complete: React.createRef(),
    };
  }

  getClients() {
    return [
      ['1','Stark, White and Abbott','Cloned Optimal Architecture', 'in-progress'],
      ['2','Wiza LLC','Exclusive Bandwidth-Monitored Implementation', 'complete'],
      ['3','Nolan LLC','Vision-Oriented 4Thgeneration Graphicaluserinterface', 'backlog'],
      ['4','Thompson PLC','Streamlined Regional Knowledgeuser', 'in-progress'],
      ['5','Walker-Williamson','Team-Oriented 6Thgeneration Matrix', 'in-progress'],
      ['6','Boehm and Sons','Automated Systematic Paradigm', 'backlog'],
      ['7','Runolfsson, Hegmann and Block','Integrated Transitional Strategy', 'backlog'],
      ['8','Schumm-Labadie','Operative Heuristic Challenge', 'backlog'],
      ['9','Kohler Group','Re-Contextualized Multi-Tasking Attitude', 'backlog'],
      ['10','Romaguera Inc','Managed Foreground Toolset', 'backlog'],
      ['11','Reilly-King','Future-Proofed Interactive Toolset', 'complete'],
      ['12','Emard, Champlin and Runolfsdottir','Devolved Needs-Based Capability', 'backlog'],
      ['13','Fritsch, Cronin and Wolff','Open-Source 3Rdgeneration Website', 'complete'],
      ['14','Borer LLC','Profit-Focused Incremental Orchestration', 'backlog'],
      ['15','Emmerich-Ankunding','User-Centric Stable Extranet', 'in-progress'],
      ['16','Willms-Abbott','Progressive Bandwidth-Monitored Access', 'in-progress'],
      ['17','Brekke PLC','Intuitive User-Facing Customerloyalty', 'complete'],
      ['18','Bins, Toy and Klocko','Integrated Assymetric Software', 'backlog'],
      ['19','Hodkiewicz-Hayes','Programmable Systematic Securedline', 'backlog'],
      ['20','Murphy, Lang and Ferry','Organized Explicit Access', 'backlog'],
    ].map(companyDetails => ({
      id: companyDetails[0],
      name: companyDetails[1],
      description: companyDetails[2],
      status: companyDetails[3],
    }));
  }

  updateCardStatus(cardId, newStatus) {
    this.setState(prevState => {
      const updatedClients = { ...prevState.clients };
      let cardToMove = null;

      // Find and remove the card from its old status
      Object.keys(updatedClients).forEach(status => {
        const cardIndex = updatedClients[status].findIndex(client => client.id === cardId);
        if (cardIndex !== -1) {
          // Create a copy of the card before removing
          cardToMove = { ...updatedClients[status][cardIndex] };
          updatedClients[status].splice(cardIndex, 1);
        }
      });

      // If the card is found, update its status and add it to the new swimlane
      if (cardToMove) {
        cardToMove.status = newStatus;
        if (!updatedClients[newStatus]) {
          updatedClients[newStatus] = [];
        }
        updatedClients[newStatus].push(cardToMove);
      }

      return { clients: updatedClients };
    });
  }

  // Initialize drag-and-drop behavior
  componentDidMount() {
    this.drake = dragula([
      this.swimlanes.backlog.current,
      this.swimlanes.inProgress.current,
      this.swimlanes.complete.current,
    ]);
    this.drake.on('drop', (el, target, source, sibling) => this.updateClient(el, target, source, sibling));
  }

  componentWillUnmount() {
    this.drake.remove();
  }

  // Change the status of client when a Card is moved
  updateClient(el, target, _, sibling) {
    // Reverting DOM changes from Dragula
    this.drake.cancel(true);

    // Find out which swimlane the Card was moved to
    let targetSwimlane = 'backlog';
    if (target === this.swimlanes.inProgress.current) {
      targetSwimlane = 'in-progress';
    } else if (target === this.swimlanes.complete.current) {
      targetSwimlane = 'complete';
    }

    // Create a new clients array
    const clientsList = [
      ...this.state.clients.backlog,
      ...this.state.clients.inProgress,
      ...this.state.clients.complete,
    ];
    const clientThatMoved = clientsList.find(client => client.id === el.dataset.id);
    const clientThatMovedClone = {
      ...clientThatMoved,
      status: targetSwimlane,
    };

    // Remove ClientThatMoved from the clientsList
    const updatedClients = clientsList.filter(client => client.id !== clientThatMovedClone.id);

    // Place ClientThatMoved just before the sibling client, keeping the order
    const index = updatedClients.findIndex(client => sibling && client.id === sibling.dataset.id);
    updatedClients.splice(index === -1 ? updatedClients.length : index , 0, clientThatMovedClone);

    // Update React state to reflect changes
    this.setState({
      clients: {
        backlog: updatedClients.filter(client => !client.status || client.status === 'backlog'),
        inProgress: updatedClients.filter(client => client.status && client.status === 'in-progress'),
        complete: updatedClients.filter(client => client.status && client.status === 'complete'),
      }
    });
  }

  // Helper function to get the card background color based on status
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

  renderSwimlane(name, clients, ref) {
    return (
      <Swimlane
        name={name}
        clients={clients.map(client => ({
          ...client,
          style: this.getCardStyle(client.status),  // Pass the card style here
        }))}
        dragulaRef={ref}
      />
    );
  }

  render() {
    return (
      <div className="Board">
        <div className="container-fluid">
          <div className="row">
            <div className="col-md-4">
              {this.renderSwimlane('Backlog', this.state.clients.backlog, this.swimlanes.backlog)}
            </div>
            <div className="col-md-4">
              {this.renderSwimlane('In Progress', this.state.clients.inProgress, this.swimlanes.inProgress)}
            </div>
            <div className="col-md-4">
              {this.renderSwimlane('Complete', this.state.clients.complete, this.swimlanes.complete)}
            </div>
          </div>
        </div>
      </div>
    );
  }
}


