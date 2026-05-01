import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
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

export default function ProjectDetail() {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const isAdmin = user?.role === 'admin';

  const [project, setProject] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [allUsers, setAllUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [addingMember, setAddingMember] = useState(false);
  const [selectedUser, setSelectedUser] = useState('');
  const [tab, setTab] = useState('tasks');

  useEffect(() => {
    Promise.all([
      api.get(`/projects/${id}`),
      api.get(`/tasks?projectId=${id}`),
      isAdmin ? api.get('/users') : Promise.resolve({ data: [] })
    ]).then(([projRes, tasksRes, usersRes]) => {
      setProject(projRes.data);
      setTasks(tasksRes.data);
      setAllUsers(usersRes.data);
    }).catch(() => navigate('/projects'))
      .finally(() => setLoading(false));
  }, [id, isAdmin, navigate]);

  const handleAddMember = async () => {
    if (!selectedUser) return;
    try {
      const res = await api.post(`/projects/${id}/members`, { userId: selectedUser });
      setProject(res.data);
      setSelectedUser('');
      setAddingMember(false);
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to add member');
    }
  };

  const handleRemoveMember = async (userId) => {
    if (!window.confirm('Remove this member?')) return;
    try {
      const res = await api.delete(`/projects/${id}/members/${userId}`);
      setProject(res.data);
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to remove member');
    }
  };

  if (loading) return <div className="loading-screen"><div className="spinner" /></div>;
  if (!project) return null;

  const nonMembers = allUsers.filter(u => !project.members.some(m => m._id === u._id));

  return (
    <div>
      <div className="page-header">
        <div>
          <button className="btn btn-secondary btn-sm" onClick={() => navigate('/projects')} style={{ marginBottom: 8 }}>
            ← Back
          </button>
          <h2 className="page-title">{project.name}</h2>
          {project.description && <p className="page-subtitle">{project.description}</p>}
        </div>
      </div>

      <div style={{ display: 'flex', gap: 8, marginBottom: 20, borderBottom: '1px solid var(--border)', paddingBottom: 0 }}>
        {['tasks', 'members'].map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            style={{
              padding: '8px 16px',
              background: 'none',
              border: 'none',
              borderBottom: tab === t ? '2px solid var(--accent)' : '2px solid transparent',
              color: tab === t ? 'var(--accent)' : 'var(--text-2)',
              fontWeight: 500,
              fontSize: 13.5,
              cursor: 'pointer',
              marginBottom: -1,
              textTransform: 'capitalize'
            }}
          >
            {t} {t === 'tasks' ? `(${tasks.length})` : `(${project.members.length})`}
          </button>
        ))}
      </div>

      {tab === 'tasks' && (
        <div className="card">
          {tasks.length === 0 ? (
            <div className="empty-state"><p>No tasks in this project.</p></div>
          ) : (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Title</th>
                    <th>Assigned to</th>
                    <th>Deadline</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {tasks.map(task => (
                    <tr key={task._id}>
                      <td>
                        <div style={{ fontWeight: 500 }}>{task.title}</div>
                        {task.description && <div className="text-xs text-muted mt-4">{task.description}</div>}
                      </td>
                      <td className="text-muted">{task.assignedTo?.name}</td>
                      <td className="text-muted font-mono" style={{ fontSize: 12 }}>
                        {format(new Date(task.deadline), 'MMM d, yyyy')}
                      </td>
                      <td>{statusBadge(task.status, task.deadline)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {tab === 'members' && (
        <div className="card">
          {isAdmin && (
            <div style={{ marginBottom: 16, display: 'flex', gap: 8, alignItems: 'center' }}>
              {addingMember ? (
                <>
                  <select className="form-input" style={{ maxWidth: 240 }} value={selectedUser} onChange={e => setSelectedUser(e.target.value)}>
                    <option value="">Select user...</option>
                    {nonMembers.map(u => <option key={u._id} value={u._id}>{u.name} ({u.email})</option>)}
                  </select>
                  <button className="btn btn-primary btn-sm" onClick={handleAddMember}>Add</button>
                  <button className="btn btn-secondary btn-sm" onClick={() => { setAddingMember(false); setSelectedUser(''); }}>Cancel</button>
                </>
              ) : (
                <button className="btn btn-secondary btn-sm" onClick={() => setAddingMember(true)}>+ Add member</button>
              )}
            </div>
          )}

          <div className="table-wrap">
            <table>
              <thead>
                <tr><th>Name</th><th>Email</th><th>Role</th>{isAdmin && <th></th>}</tr>
              </thead>
              <tbody>
                {project.members.map(m => (
                  <tr key={m._id}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div className="avatar" style={{ width: 28, height: 28, fontSize: 11 }}>
                          {m.name?.slice(0, 2).toUpperCase()}
                        </div>
                        <span style={{ fontWeight: 500 }}>{m.name}</span>
                        {m._id === project.owner._id && <span className="badge badge-admin" style={{ fontSize: 10, padding: '1px 6px' }}>Owner</span>}
                      </div>
                    </td>
                    <td className="text-muted">{m.email}</td>
                    <td><span className={`badge badge-${m.role}`}>{m.role}</span></td>
                    {isAdmin && (
                      <td>
                        {m._id !== project.owner._id && (
                          <button className="btn btn-danger btn-sm" onClick={() => handleRemoveMember(m._id)}>Remove</button>
                        )}
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}