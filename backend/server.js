import express from 'express'; 
import Database from 'better-sqlite3'; 

const app = express();

app.use(express.json());

app.get('/', (req, res) => { 
  return res.status(200).send({'message': 'SHIPTIVITY API. Read documentation to see API docs'}); 
});

// We are keeping one connection alive for the rest of the life of the application for simplicity
const db = new Database('./clients.db');

// Don't forget to close connection when server gets terminated
const closeDb = () => db.close();
process.on('SIGTERM', closeDb);
process.on('SIGINT', closeDb);

/**
 * Validate id input
 * @param {any} id
 */
const validateId = (id) => { 
  if (Number.isNaN(id)) { 
    return { 
      valid: false, 
      messageObj: { 
        'message': 'Invalid id provided.', 
        'long_message': 'Id can only be integer.', 
      }, 
    }; 
  } 
  const client = db.prepare('select * from clients where id = ? limit 1').get(id); 
  if (!client) { 
    return { 
      valid: false, 
      messageObj: { 
        'message': 'Invalid id provided.', 
        'long_message': 'Cannot find client with that id.', 
      }, 
    }; 
  } 
  return { 
    valid: true, 
  }; 
}

/**
 * Validate priority input
 * @param {any} priority
 */
const validatePriority = (priority) => { 
  if (Number.isNaN(priority)) { 
    return { 
      valid: false, 
      messageObj: { 
        'message': 'Invalid priority provided.', 
        'long_message': 'Priority can only be positive integer.', 
      }, 
    }; 
  } 
  return { 
    valid: true, 
  } 
}

/**
 * Get all of the clients. Optional filter 'status'
 * GET /api/v1/clients?status={status} - list all clients, optional parameter status: 'backlog' | 'in-progress' | 'complete'
 */
app.get('/api/v1/clients', (req, res) => {
  const status = req.query.status;
  if (status) {
    // status can only be either 'backlog' | 'in-progress' | 'complete'
    if (status !== 'backlog' && status !== 'in-progress' && status !== 'complete') {
      return res.status(400).send({
        'message': 'Invalid status provided.',
        'long_message': 'Status can only be one of the following: [backlog | in-progress | complete].',
      });
    }
    const clients = db.prepare('select * from clients where status = ? order by priority').all(status);
    return res.status(200).send(clients);
  }
  const clients = db.prepare('select * from clients order by status, priority').all();
  return res.status(200).send(clients);
});

/**
 * Get a client based on the id provided.
 * GET /api/v1/clients/{client_id} - get client by id
 */
app.get('/api/v1/clients/:id', (req, res) => {
  const id = parseInt(req.params.id , 10);
  const { valid, messageObj } = validateId(id);
  if (!valid) {
    res.status(400).send(messageObj);
  }
  return res.status(200).send(db.prepare('select * from clients where id = ?').get(id));
});

/**
 * Update client information based on the parameters provided.
 * When status is provided, the client status will be changed
 * When priority is provided, the client priority will be changed with the rest of the clients accordingly
 * When swimlane is provided, it will move the client to the new swimlane with a new priority.
 * This API should return the list of clients on success
 *
 * PUT /api/v1/clients/{client_id} - change the status or position of a client
 *    Data:
 *      status (optional): 'backlog' | 'in-progress' | 'complete',
 *      priority (optional): integer (changes the position within the same swimlane),
 *      swimlane (optional): moves the client to a new swimlane (e.g., 'backlog', 'in-progress', 'complete')
 */
app.put('/api/v1/clients/:id', (req, res) => {
  const id = parseInt(req.params.id , 10);
  const { valid, messageObj } = validateId(id);
  if (!valid) {
    return res.status(400).send(messageObj);
  }

  let { status, priority, swimlane } = req.body;
  let clients = db.prepare('select * from clients').all();
  const client = clients.find(client => client.id === id);

  if (status) {
    client.status = status;
  }

  if (priority) {
    const { valid: validPriority, messageObj: priorityMessage } = validatePriority(priority);
    if (!validPriority) {
      return res.status(400).send(priorityMessage);
    }
    client.priority = priority;
  }

  if (swimlane) {
    // Update the swimlane and reset priority for the new swimlane
    if (['backlog', 'in-progress', 'complete'].includes(swimlane)) {
      client.status = swimlane;

      // Reset priority within the new swimlane (set it to the lowest priority for now)
      const maxPriorityInSwimlane = db.prepare('select max(priority) from clients where status = ?').get(swimlane);
      client.priority = maxPriorityInSwimlane['max(priority)'] + 1;
    }
  }

  // Update the client in the database
  db.prepare('update clients set status = ?, priority = ? where id = ?').run(client.status, client.priority, id);

  // Fetch all clients to reflect changes
  clients = db.prepare('select * from clients order by status, priority').all();
  return res.status(200).send(clients);
});

app.listen(3001);
console.log('app running on port ', 3001);
