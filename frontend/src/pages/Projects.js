import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../utils/api';
import { useAuth } from '../context/AuthContext';
import { format } from 'date-fns';

function ProjectModal({ onClose, onSave, project }) {
  const [form, setForm] = useState({ name: project?.name || '', description: project?.description || '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      if (project) {
        const res = await api.put(`/projects/${project._id}`, form);
        onSave(res.data, 'edit');
      } else {
        const res = await api.post('/projects', form);
        onSave(res.data, 'create');
      }
      onClose();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to save project');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <span className="modal-title">{project ? 'Edit Project' : 'New Project'}</span>
          <button className="btn btn-secondary btn-sm btn-icon" onClick={onClose}>✕</button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            {error && <div className="alert alert-error">{error}</div>}
            <div className="form-group">
              <label className="form-label">Project name</label>
              <input className="form-input" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} required placeholder="e.g. Website Redesign" />
            </div>
            <div className="form-group">
              <label className="form-label">Description</label>
              <textarea className="form-input" value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} placeholder="What is this project about?" />
            </div>
          </div>
          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? 'Saving...' : project ? 'Save changes' : 'Create project'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function Projects() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editProject, setEditProject] = useState(null);

  const isAdmin = user?.role === 'admin';

  useEffect(() => {
    api.get('/projects').then(res => setProjects(res.data)).finally(() => setLoading(false));
  }, []);

  const handleSave = (saved, type) => {
    if (type === 'create') setProjects(prev => [saved, ...prev]);
    else setProjects(prev => prev.map(p => p._id === saved._id ? saved : p));
  };

  const handleDelete = async (id, e) => {
    e.stopPropagation();
    if (!window.confirm('Delete this project and all its tasks?')) return;
    try {
      await api.delete(`/projects/${id}`);
      setProjects(prev => prev.filter(p => p._id !== id));
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to delete');
    }
  };

  if (loading) return <div className="loading-screen"><div className="spinner" /></div>;

  return (
    <div>
      <div className="page-header">
        <div>
          <h2 className="page-title">Projects</h2>
          <p className="page-subtitle">{projects.length} project{projects.length !== 1 ? 's' : ''}</p>
        </div>
        {isAdmin && (
          <button className="btn btn-primary" onClick={() => { setEditProject(null); setShowModal(true); }}>
            + New project
          </button>
        )}
      </div>

      {projects.length === 0 ? (
        <div className="empty-state">
          <svg width="40" height="40" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
            <path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
          </svg>
          <p>No projects yet{isAdmin ? ' — create one to get started.' : '.'}</p>
        </div>
      ) : (
        <div className="projects-grid">
          {projects.map(project => (
            <div key={project._id} className="project-card" onClick={() => navigate(`/projects/${project._id}`)}>
              <div className="project-card-name">{project.name}</div>
              <div className="project-card-desc">{project.description || 'No description provided.'}</div>
              <div className="project-card-meta">
                <div className="member-avatars">
                  {project.members?.slice(0, 4).map(m => (
                    <div key={m._id} className="member-avatar" title={m.name}>
                      {m.name?.slice(0, 2).toUpperCase()}
                    </div>
                  ))}
                  {project.members?.length > 4 && (
                    <div className="member-avatar">+{project.members.length - 4}</div>
                  )}
                </div>
                <div style={{ display: 'flex', gap: 6 }} onClick={e => e.stopPropagation()}>
                  <span className="text-xs text-muted" style={{ alignSelf: 'center' }}>
                    {format(new Date(project.createdAt), 'MMM d')}
                  </span>
                  {isAdmin && (
                    <>
                      <button className="btn btn-secondary btn-sm" onClick={e => { e.stopPropagation(); setEditProject(project); setShowModal(true); }}>Edit</button>
                      <button className="btn btn-danger btn-sm" onClick={e => handleDelete(project._id, e)}>Delete</button>
                    </>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {showModal && (
        <ProjectModal
          project={editProject}
          onClose={() => { setShowModal(false); setEditProject(null); }}
          onSave={handleSave}
        />
      )}
    </div>
  );
}