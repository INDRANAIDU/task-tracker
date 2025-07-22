// Import required modules
const express = require('express');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid'); // For generating unique task IDs

const app = express();
const PORT = 3000;
const TASKS_FILE = './tasks.json'; // Path to the tasks storage file

// Middleware to parse JSON request bodies
app.use(express.json());

// Custom middleware to log every incoming request and its body (if any)
app.use((req, res, next) => {
  console.log(`Incoming request: ${req.method} ${req.url}`);
  if (req.body && Object.keys(req.body).length) {
    console.log('Body:', req.body);
  }
  next();
});

// Create tasks file if it doesn't already exist
if (!fs.existsSync(TASKS_FILE)) {
  fs.writeFileSync(TASKS_FILE, JSON.stringify([])); // Initialize with empty array
}

// Helper function to load tasks from the JSON file
function loadTasks() {
  try {
    const data = fs.readFileSync(TASKS_FILE, 'utf-8');
    return JSON.parse(data);
  } catch (err) {
    console.error('Failed to load tasks:', err);
    return [];
  }
}

// Helper function to save tasks back to the JSON file
function saveTasks(tasks) {
  fs.writeFileSync(TASKS_FILE, JSON.stringify(tasks, null, 2)); // Pretty print JSON
}

// ROUTES

// Create a new task (POST /tasks)
app.post('/tasks', (req, res) => {
  const { description, status = 'todo' } = req.body;

  // Validate that description exists
  if (!description) {
    return res.status(400).json({ error: 'Description is required' });
  }

  // Create new task object
  const task = {
    id: uuidv4(),
    description,
    status,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  const tasks = loadTasks(); // Load existing tasks
  tasks.push(task);          // Add new task
  saveTasks(tasks);          // Save updated list

  console.log('Created Task:', task);
  res.status(201).json(task); // Respond with created task
});

// Update an entire task (PUT /tasks/:id)
app.put('/tasks/:id', (req, res) => {
  const { id } = req.params;
  const { description, status } = req.body;

  const tasks = loadTasks();
  const task = tasks.find(t => t.id === id); // Find task by ID

  if (!task) {
    return res.status(404).json({ error: 'Task not found' });
  }

  // Update fields if provided
  if (description) task.description = description;
  if (status) task.status = status;
  task.updatedAt = new Date().toISOString();

  saveTasks(tasks); // Save updates
  console.log('Updated Task:', task);
  res.json(task);   // Respond with updated task
});

// Delete a task (DELETE /tasks/:id)
app.delete('/tasks/:id', (req, res) => {
  const { id } = req.params;
  let tasks = loadTasks();

  // Find index of task
  const index = tasks.findIndex(t => t.id === id);
  if (index === -1) {
    return res.status(404).json({ error: 'Task not found' });
  }

  tasks.splice(index, 1); // Remove task from array
  saveTasks(tasks);       // Save updated list

  console.log(`Deleted Task ID: ${id}`);
  res.status(204).send(); // No content response
});

// Update only task status (PATCH /tasks/:id/status)
app.patch('/tasks/:id/status', (req, res) => {
  const { id } = req.params;
  const { status } = req.body;

  // Validate new status value
  if (!['todo', 'in-progress', 'done'].includes(status)) {
    return res.status(400).json({ error: 'Invalid status' });
  }

  const tasks = loadTasks();
  const task = tasks.find(t => t.id === id);

  if (!task) {
    return res.status(404).json({ error: 'Task not found' });
  }

  task.status = status;
  task.updatedAt = new Date().toISOString();

  saveTasks(tasks);
  console.log(`Patched Task ID ${id} to status ${status}`);
  res.json(task);
});

// Get all tasks or filter by status (GET /tasks or /tasks?status=done)
app.get('/tasks', (req, res) => {
  const { status } = req.query;
  const tasks = loadTasks();

  if (status) {
    // Validate status filter
    if (!['todo', 'in-progress', 'done'].includes(status)) {
      return res.status(400).json({ error: 'Invalid status filter' });
    }

    // Filter tasks by status
    return res.json(tasks.filter(task => task.status === status));
  }

  // Return all tasks if no filter
  res.json(tasks);
});

// Start the Express server
app.listen(PORT, () => {
  console.log(` Server running at http://localhost:${PORT}`);
});
