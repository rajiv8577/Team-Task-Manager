const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const { protect, adminOnly } = require('../middleware/auth');
const Task = require('../models/Task');
const Project = require('../models/Project');

// GET /api/tasks — list tasks (filtered by role)
router.get('/', protect, async (req, res) => {
  try {
    const { projectId } = req.query;
    let query = {};

    if (projectId) {
      query.project = projectId;
    }

    if (req.user.role !== 'admin') {
      query.assignedTo = req.user._id;
    }

    const tasks = await Task.find(query)
      .populate('assignedTo', 'name email')
      .populate('createdBy', 'name email')
      .populate('project', 'name')
      .sort('-createdAt');

    res.json(tasks);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET /api/tasks/dashboard — stats
router.get('/dashboard', protect, async (req, res) => {
  try {
    let query = req.user.role === 'admin' ? {} : { assignedTo: req.user._id };

    const now = new Date();
    const [total, completed, pending, inProgress, overdue] = await Promise.all([
      Task.countDocuments(query),
      Task.countDocuments({ ...query, status: 'Completed' }),
      Task.countDocuments({ ...query, status: 'Pending' }),
      Task.countDocuments({ ...query, status: 'In Progress' }),
      Task.countDocuments({ ...query, status: { $ne: 'Completed' }, deadline: { $lt: now } })
    ]);

    res.json({ total, completed, pending, inProgress, overdue });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST /api/tasks — admin only
router.post('/', protect, adminOnly, [
  body('title').trim().notEmpty().withMessage('Title required'),
  body('project').notEmpty().withMessage('Project required'),
  body('assignedTo').notEmpty().withMessage('Assigned user required'),
  body('deadline').isISO8601().withMessage('Valid deadline required'),
  body('status').optional().isIn(['Pending', 'In Progress', 'Completed'])
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

  try {
    const { title, description, project, assignedTo, deadline, status } = req.body;

    // Verify project exists
    const proj = await Project.findById(project);
    if (!proj) return res.status(404).json({ message: 'Project not found' });

    const task = await Task.create({
      title, description, project, assignedTo,
      deadline, status, createdBy: req.user._id
    });

    await task.populate('assignedTo', 'name email');
    await task.populate('createdBy', 'name email');
    await task.populate('project', 'name');

    res.status(201).json(task);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET /api/tasks/:id
router.get('/:id', protect, async (req, res) => {
  try {
    const task = await Task.findById(req.params.id)
      .populate('assignedTo', 'name email')
      .populate('createdBy', 'name email')
      .populate('project', 'name');

    if (!task) return res.status(404).json({ message: 'Task not found' });

    if (req.user.role !== 'admin' &&
        task.assignedTo._id.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Access denied' });
    }

    res.json(task);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// PUT /api/tasks/:id — admin can update all; member can only update status
router.put('/:id', protect, async (req, res) => {
  try {
    const task = await Task.findById(req.params.id);
    if (!task) return res.status(404).json({ message: 'Task not found' });

    if (req.user.role === 'member') {
      if (task.assignedTo.toString() !== req.user._id.toString()) {
        return res.status(403).json({ message: 'Access denied' });
      }
      // Members can only update status
      if (req.body.status) task.status = req.body.status;
    } else {
      // Admin can update all fields
      const { title, description, assignedTo, deadline, status, project } = req.body;
      if (title !== undefined) task.title = title;
      if (description !== undefined) task.description = description;
      if (assignedTo !== undefined) task.assignedTo = assignedTo;
      if (deadline !== undefined) task.deadline = deadline;
      if (status !== undefined) task.status = status;
      if (project !== undefined) task.project = project;
    }

    await task.save();
    await task.populate('assignedTo', 'name email');
    await task.populate('createdBy', 'name email');
    await task.populate('project', 'name');

    res.json(task);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// DELETE /api/tasks/:id — admin only
router.delete('/:id', protect, adminOnly, async (req, res) => {
  try {
    const task = await Task.findByIdAndDelete(req.params.id);
    if (!task) return res.status(404).json({ message: 'Task not found' });
    res.json({ message: 'Task deleted' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;