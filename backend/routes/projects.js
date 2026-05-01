const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const { protect, adminOnly } = require('../middleware/auth');
const Project = require('../models/Project');
const Task = require('../models/Task');

// GET /api/projects — list projects visible to user
router.get('/', protect, async (req, res) => {
  try {
    const query = req.user.role === 'admin'
      ? {}
      : { members: req.user._id };

    const projects = await Project.find(query)
      .populate('owner', 'name email')
      .populate('members', 'name email role')
      .sort('-createdAt');

    res.json(projects);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST /api/projects — admin only
router.post('/', protect, adminOnly, [
  body('name').trim().notEmpty().withMessage('Project name required'),
  body('description').optional().trim()
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

  try {
    const { name, description } = req.body;
    const project = await Project.create({ name, description, owner: req.user._id, members: [req.user._id] });
    await project.populate('owner', 'name email');
    await project.populate('members', 'name email role');
    res.status(201).json(project);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET /api/projects/:id
router.get('/:id', protect, async (req, res) => {
  try {
    const project = await Project.findById(req.params.id)
      .populate('owner', 'name email')
      .populate('members', 'name email role');

    if (!project) return res.status(404).json({ message: 'Project not found' });

    const isMember = project.members.some(m => m._id.toString() === req.user._id.toString());
    if (!isMember && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Access denied' });
    }

    res.json(project);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// PUT /api/projects/:id — admin only
router.put('/:id', protect, adminOnly, [
  body('name').optional().trim().notEmpty()
], async (req, res) => {
  try {
    const project = await Project.findByIdAndUpdate(
      req.params.id,
      { name: req.body.name, description: req.body.description },
      { new: true, runValidators: true }
    ).populate('owner', 'name email').populate('members', 'name email role');

    if (!project) return res.status(404).json({ message: 'Project not found' });
    res.json(project);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// DELETE /api/projects/:id — admin only
router.delete('/:id', protect, adminOnly, async (req, res) => {
  try {
    const project = await Project.findById(req.params.id);
    if (!project) return res.status(404).json({ message: 'Project not found' });

    await Task.deleteMany({ project: req.params.id });
    await project.deleteOne();

    res.json({ message: 'Project and its tasks deleted' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST /api/projects/:id/members — admin only
router.post('/:id/members', protect, adminOnly, [
  body('userId').notEmpty().withMessage('userId required')
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

  try {
    const project = await Project.findById(req.params.id);
    if (!project) return res.status(404).json({ message: 'Project not found' });

    const { userId } = req.body;
    if (project.members.map(m => m.toString()).includes(userId)) {
      return res.status(400).json({ message: 'User already a member' });
    }

    project.members.push(userId);
    await project.save();
    await project.populate('members', 'name email role');
    await project.populate('owner', 'name email');

    res.json(project);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// DELETE /api/projects/:id/members/:userId — admin only
router.delete('/:id/members/:userId', protect, adminOnly, async (req, res) => {
  try {
    const project = await Project.findById(req.params.id);
    if (!project) return res.status(404).json({ message: 'Project not found' });

    if (project.owner.toString() === req.params.userId) {
      return res.status(400).json({ message: 'Cannot remove project owner' });
    }

    project.members = project.members.filter(m => m.toString() !== req.params.userId);
    await project.save();
    await project.populate('members', 'name email role');
    await project.populate('owner', 'name email');

    res.json(project);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;