"use strict";

var _express = _interopRequireDefault(require("express"));
var _betterSqlite = _interopRequireDefault(require("better-sqlite3"));
function _interopRequireDefault(e) { return e && e.__esModule ? e : { default: e }; }
var app = (0, _express.default)();
app.use(_express.default.json());
app.get('/', function (req, res) {
  return res.status(200).send({
    'message': 'SHIPTIVITY API. Read documentation to see API docs'
  });
});

// We are keeping one connection alive for the rest of the life of the application for simplicity
var db = new _betterSqlite.default('./clients.db');

// Don't forget to close connection when server gets terminated
var closeDb = function closeDb() {
  return db.close();
};
process.on('SIGTERM', closeDb);
process.on('SIGINT', closeDb);

/**
 * Validate id input
 * @param {any} id
 */
var validateId = function validateId(id) {
  if (Number.isNaN(id)) {
    return {
      valid: false,
      messageObj: {
        'message': 'Invalid id provided.',
        'long_message': 'Id can only be integer.'
      }
    };
  }
  var client = db.prepare('select * from clients where id = ? limit 1').get(id);
  if (!client) {
    return {
      valid: false,
      messageObj: {
        'message': 'Invalid id provided.',
        'long_message': 'Cannot find client with that id.'
      }
    };
  }
  return {
    valid: true
  };
};

/**
 * Validate priority input
 * @param {any} priority
 */
var validatePriority = function validatePriority(priority) {
  if (Number.isNaN(priority)) {
    return {
      valid: false,
      messageObj: {
        'message': 'Invalid priority provided.',
        'long_message': 'Priority can only be positive integer.'
      }
    };
  }
  return {
    valid: true
  };
};

/**
 * Get all of the clients. Optional filter 'status'
 * GET /api/v1/clients?status={status} - list all clients, optional parameter status: 'backlog' | 'in-progress' | 'complete'
 */
app.get('/api/v1/clients', function (req, res) {
  var status = req.query.status;
  if (status) {
    // status can only be either 'backlog' | 'in-progress' | 'complete'
    if (status !== 'backlog' && status !== 'in-progress' && status !== 'complete') {
      return res.status(400).send({
        'message': 'Invalid status provided.',
        'long_message': 'Status can only be one of the following: [backlog | in-progress | complete].'
      });
    }
    var _clients = db.prepare('select * from clients where status = ? order by priority').all(status);
    return res.status(200).send(_clients);
  }
  var clients = db.prepare('select * from clients order by status, priority').all();
  return res.status(200).send(clients);
});

/**
 * Get a client based on the id provided.
 * GET /api/v1/clients/{client_id} - get client by id
 */
app.get('/api/v1/clients/:id', function (req, res) {
  var id = parseInt(req.params.id, 10);
  var _validateId = validateId(id),
    valid = _validateId.valid,
    messageObj = _validateId.messageObj;
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
app.put('/api/v1/clients/:id', function (req, res) {
  var id = parseInt(req.params.id, 10);
  var _validateId2 = validateId(id),
    valid = _validateId2.valid,
    messageObj = _validateId2.messageObj;
  if (!valid) {
    return res.status(400).send(messageObj);
  }
  var _req$body = req.body,
    status = _req$body.status,
    priority = _req$body.priority,
    swimlane = _req$body.swimlane;
  var clients = db.prepare('select * from clients').all();
  var client = clients.find(function (client) {
    return client.id === id;
  });
  if (status) {
    client.status = status;
  }
  if (priority) {
    var _validatePriority = validatePriority(priority),
      validPriority = _validatePriority.valid,
      priorityMessage = _validatePriority.messageObj;
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
      var maxPriorityInSwimlane = db.prepare('select max(priority) from clients where status = ?').get(swimlane);
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