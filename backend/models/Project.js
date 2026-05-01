const mongoose = require('mongoose');

const projectSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    trim: true,
    default: ''
  },
  owner: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  members: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }]
}, { timestamps: true });

// Ensure owner is always in members
projectSchema.pre('save', function(next) {
  if (!this.members.map(m => m.toString()).includes(this.owner.toString())) {
    this.members.push(this.owner);
  }
  next();
});

module.exports = mongoose.model('Project', projectSchema);