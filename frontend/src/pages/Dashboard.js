import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
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

export default function Dashboard() {
  const { user } = useAuth();
  const [stats, setStats] = useState(null);
  const [recentTasks, setRecentTasks] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.get('/tasks/dashboard'),
      api.get('/tasks?limit=5')
    ]).then(([statsRes, tasksRes]) => {
      setStats(statsRes.data);
      setRecentTasks(tasksRes.data.slice(0, 5));
    }).finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="loading-screen"><div className="spinner" /></div>;

  const completionPct = stats?.total > 0 ? Math.round((stats.completed / stats.total) * 100) : 0;

  return (
    <div>
      <div className="page-header">
        <div>
          <h2 className="page-title">Dashboard</h2>
          <p className="page-subtitle">Welcome back, {user?.name?.split(' ')[0]}</p>
        </div>
      </div>

      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-label">Total Tasks</div>
          <div className="stat-value">{stats?.total ?? 0}</div>
        </div>
        <div className="stat-card success">
          <div className="stat-label">Completed</div>
          <div className="stat-value">{stats?.completed ?? 0}</div>
        </div>
        <div className="stat-card accent">
          <div className="stat-label">In Progress</div>
          <div className="stat-value">{stats?.inProgress ?? 0}</div>
        </div>
        <div className="stat-card danger">
          <div className="stat-label">Overdue</div>
          <div className="stat-value">{stats?.overdue ?? 0}</div>
        </div>
      </div>

      {stats?.total > 0 && (
        <div className="card" style={{ marginBottom: 20 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
            <span className="text-sm" style={{ fontWeight: 500 }}>Overall Progress</span>
            <span className="text-sm text-muted font-mono">{completionPct}%</span>
          </div>
          <div className="progress-bar">
            <div className="progress-fill" style={{ width: `${completionPct}%` }} />
          </div>
          <div style={{ display: 'flex', gap: 20, marginTop: 12 }}>
            {[
              { label: 'Pending', val: stats.pending, color: 'var(--pending)' },
              { label: 'In Progress', val: stats.inProgress, color: 'var(--inprogress)' },
              { label: 'Completed', val: stats.completed, color: 'var(--completed)' },
            ].map(item => (
              <div key={item.label} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <div style={{ width: 8, height: 8, borderRadius: '50%', background: item.color }} />
                <span className="text-xs text-muted">{item.label} ({item.val})</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <span style={{ fontWeight: 600, fontSize: 14 }}>Recent Tasks</span>
          <Link to="/tasks" className="btn btn-secondary btn-sm">View all</Link>
        </div>

        {recentTasks.length === 0 ? (
          <div className="empty-state">
            <p>No tasks yet.</p>
          </div>
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
                </tr>
              </thead>
              <tbody>
                {recentTasks.map(task => (
                  <tr key={task._id}>
                    <td style={{ fontWeight: 500 }}>{task.title}</td>
                    <td className="text-muted">{task.project?.name || '-'}</td>
                    <td className="text-muted">{task.assignedTo?.name || '-'}</td>
                    <td className="text-muted font-mono" style={{ fontSize: 12 }}>
                      {task.deadline ? format(new Date(task.deadline), 'MMM d, yyyy') : '-'}
                    </td>
                    <td>{statusBadge(task.status, task.deadline)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}