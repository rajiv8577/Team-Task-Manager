import React, { useState, useEffect } from 'react';
import api from '../utils/api';
import { useAuth } from '../context/AuthContext';
import { format, isPast } from 'date-fns';

const statusBadge = (status, deadline) => {
  const overdue = status !== 'Completed' && isPast(new Date(deadline));
  if (overdue) return <span className="badge badge-overdue">Overdue</span>;
  if (status === 'Pending') return <span className="badge badge-pending">Pending</span>;
  if (status === 'In Progress') return <span className="badge badge-inprogress">In Progress</span>;
  return <span className="badge badge-completed">Completed</span>;
};

function TaskModal({ onClose, onSave, task, projects, users }) {
  const [form, setForm] = useState({
    title: task?.title || '',
    description: task?.description || '',
    project: task?.project?._id || task?.project || '',
    assignedTo: task?.assignedTo?._id || task?.assignedTo || '',
    deadline: task?.deadline ? format(new Date(task.deadline), "yyyy-MM-dd") : '',
    status: task?.status || 'Pending'
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const payload = { ...form };
      if (task) {
        const res = await api.put(`/tasks/${task._id}`, payload);
        onSave(res.data, 'edit');
      } else {
        const res = await api.post('/tasks', payload);
        onSave(res.data, 'create');
      }
      onClose();
    } catch (err) {
      setError(err.response?.data?.message || err.response?.data?.errors?.[0]?.msg || 'Failed to save task');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" style={{ maxWidth: 520 }} onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <span className="modal-title">{task ? 'Edit Task' : 'New Task'}</span>
          <button className="btn btn-secondary btn-sm btn-icon" onClick={onClose}>✕</button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="modal-body" style={{ maxHeight: '70vh', overflowY: 'auto' }}>
            {error && <div className="alert alert-error">{error}</div>}
            <div className="form-group">
              <label className="form-label">Title</label>
              <input className="form-input" value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} required placeholder="Task title" />
            </div>
            <div className="form-group">
              <label className="form-label">Description</label>
              <textarea className="form-input" value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} placeholder="Optional description" />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div className="form-group">
                <label className="form-label">Project</label>
                <select className="form-input" value={form.project} onChange={e => setForm({ ...form, project: e.target.value })} required>
                  <option value="">Select project</option>
                  {projects.map(p => <option key={p._id} value={p._id}>{p.name}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Assign to</label>
                <select className="form-input" value={form.assignedTo} onChange={e => setForm({ ...form, assignedTo: e.target.value })} required>
                  <option value="">Select user</option>
                  {users.map(u => <option key={u._id} value={u._id}>{u.name}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Deadline</label>
                <input type="date" className="form-input" value={form.deadline} onChange={e => setForm({ ...form, deadline: e.target.value })} required />
              </div>
              <div className="form-group">
                <label className="form-label">Status</label>
                <select className="form-input" value={form.status} onChange={e => setForm({ ...form, status: e.target.value })}>
                  <option>Pending</option>
                  <option>In Progress</option>
                  <option>Completed</option>
                </select>
              </div>
            </div>
          </div>
          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? 'Saving...' : task ? 'Save changes' : 'Create task'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function StatusUpdateModal({ task, onClose, onSave }) {
  const [status, setStatus] = useState(task.status);
  const [loading, setLoading] = useState(false);

  const handleSave = async () => {
    setLoading(true);
    try {
      const res = await api.put(`/tasks/${task._id}`, { status });
      onSave(res.data, 'edit');
      onClose();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to update status');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" style={{ maxWidth: 360 }} onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <span className="modal-title">Update Status</span>
          <button className="btn btn-secondary btn-sm btn-icon" onClick={onClose}>✕</button>
        </div>
        <div className="modal-body">
          <p className="text-sm text-muted" style={{ marginBottom: 12 }}>{task.title}</p>
          <select className="form-input" value={status} onChange={e => setStatus(e.target.value)}>
            <option>Pending</option>
            <option>In Progress</option>
            <option>Completed</option>
          </select>
        </div>
        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" onClick={handleSave} disabled={loading}>{loading ? 'Saving...' : 'Update'}</button>
        </div>
      </div>
    </div>
  );
}

export default function Tasks() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';

  const [tasks, setTasks] = useState([]);
  const [projects, setProjects] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editTask, setEditTask] = useState(null);
  const [statusTask, setStatusTask] = useState(null);
  const [filterStatus, setFilterStatus] = useState('');
  const [filterProject, setFilterProject] = useState('');
  const [search, setSearch] = useState('');

  useEffect(() => {
    const loads = [
      api.get('/tasks'),
      api.get('/projects'),
      isAdmin ? api.get('/users') : Promise.resolve({ data: [] })
    ];

    Promise.all(loads).then(([tasksRes, projRes, usersRes]) => {
      setTasks(tasksRes.data);
      setProjects(projRes.data);
      setUsers(usersRes.data);
    }).finally(() => setLoading(false));
  }, [isAdmin]);

  const handleSave = (saved, type) => {
    if (type === 'create') setTasks(prev => [saved, ...prev]);
    else setTasks(prev => prev.map(t => t._id === saved._id ? saved : t));
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this task?')) return;
    try {
      await api.delete(`/tasks/${id}`);
      setTasks(prev => prev.filter(t => t._id !== id));
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to delete');
    }
  };

  const filtered = tasks.filter(t => {
    if (filterStatus && t.status !== filterStatus) return false;
    if (filterProject && t.project?._id !== filterProject) return false;
    if (search && !t.title.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  if (loading) return <div className="loading-screen"><div className="spinner" /></div>;

  return (
    <div>
      <div className="page-header">
        <div>
          <h2 className="page-title">Tasks</h2>
          <p className="page-subtitle">{filtered.length} of {tasks.length} task{tasks.length !== 1 ? 's' : ''}</p>
        </div>
        {isAdmin && (
          <button className="btn btn-primary" onClick={() => { setEditTask(null); setShowModal(true); }}>
            + New task
          </button>
        )}
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 20, flexWrap: 'wrap' }}>
        <input
          className="form-input"
          style={{ maxWidth: 220 }}
          placeholder="Search tasks..."
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
        <select className="form-input" style={{ maxWidth: 160 }} value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
          <option value="">All statuses</option>
          <option>Pending</option>
          <option>In Progress</option>
          <option>Completed</option>
        </select>
        <select className="form-input" style={{ maxWidth: 200 }} value={filterProject} onChange={e => setFilterProject(e.target.value)}>
          <option value="">All projects</option>
          {projects.map(p => <option key={p._id} value={p._id}>{p.name}</option>)}
        </select>
        {(filterStatus || filterProject || search) && (
          <button className="btn btn-secondary btn-sm" onClick={() => { setFilterStatus(''); setFilterProject(''); setSearch(''); }}>
            Clear filters
          </button>
        )}
      </div>

      <div className="card">
        {filtered.length === 0 ? (
          <div className="empty-state"><p>No tasks found.</p></div>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Title</th>
                  <th>Project</th>
                  <th>Assigned to</th>
                  <th>Deadline</th>
                  <th>Status</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(task => (
                  <tr key={task._id}>
                    <td>
                      <div style={{ fontWeight: 500 }}>{task.title}</div>
                      {task.description && <div className="text-xs text-muted mt-4" style={{ maxWidth: 280, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{task.description}</div>}
                    </td>
                    <td className="text-muted">{task.project?.name || '-'}</td>
                    <td className="text-muted">{task.assignedTo?.name || '-'}</td>
                    <td className="text-muted font-mono" style={{ fontSize: 12, whiteSpace: 'nowrap' }}>
                      {task.deadline ? format(new Date(task.deadline), 'MMM d, yyyy') : '-'}
                    </td>
                    <td>{statusBadge(task.status, task.deadline)}</td>
                    <td>
                      <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
                        {isAdmin ? (
                          <>
                            <button className="btn btn-secondary btn-sm" onClick={() => { setEditTask(task); setShowModal(true); }}>Edit</button>
                            <button className="btn btn-danger btn-sm" onClick={() => handleDelete(task._id)}>Delete</button>
                          </>
                        ) : (
                          task.assignedTo?._id === user._id && (
                            <button className="btn btn-secondary btn-sm" onClick={() => setStatusTask(task)}>Update</button>
                          )
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showModal && (
        <TaskModal
          task={editTask}
          projects={projects}
          users={users}
          onClose={() => { setShowModal(false); setEditTask(null); }}
          onSave={handleSave}
        />
      )}

      {statusTask && (
        <StatusUpdateModal
          task={statusTask}
          onClose={() => setStatusTask(null)}
          onSave={handleSave}
        />
      )}
    </div>
  );
}