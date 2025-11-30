import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Card } from '@/components/ui/card';

const AdminDashboard: React.FC = () => {
  const navigate = useNavigate();

  const quickDocLinks = [
    { name: 'Runbook', path: 'operations/runbook' },
    { name: 'Deployment', path: 'operations/deployment' },
    { name: 'Monitoring', path: 'operations/monitoring' },
    { name: 'API Reference', path: 'backend/api' },
    { name: 'Database', path: 'backend/database' },
    { name: 'Feature Flags', path: 'operations/feature-flags' },
  ];

  const handleDocClick = (path: string) => {
    navigate(`/docs?doc=${path}`);
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-8">Admin Dashboard</h1>

      {/* Quick Documentation Access */}
      <Card className="mb-8 p-6">
        <h2 className="text-xl font-semibold mb-4">Quick Documentation</h2>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {quickDocLinks.map((doc) => (
            <button
              key={doc.path}
              onClick={() => handleDocClick(doc.path)}
              className="p-4 bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg text-left transition-colors"
            >
              <div className="font-medium">{doc.name}</div>
              <div className="text-sm text-gray-500 dark:text-gray-400 mt-1">View docs →</div>
            </button>
          ))}
        </div>
        <div className="mt-4">
          <button
            onClick={() => navigate('/docs')}
            className="text-blue-600 hover:underline text-sm"
          >
            View All Documentation →
          </button>
        </div>
      </Card>

      {/* Admin Tools Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <Card className="p-6 hover:shadow-lg transition-shadow">
          <h3 className="text-lg font-semibold mb-2">User Management</h3>
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            Manage users, roles, and permissions
          </p>
          <button className="text-blue-600 hover:underline">Manage Users →</button>
        </Card>

        <Card className="p-6 hover:shadow-lg transition-shadow">
          <h3 className="text-lg font-semibold mb-2">Content Moderation</h3>
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            Review flagged clips and comments
          </p>
          <button className="text-blue-600 hover:underline">View Queue →</button>
        </Card>

        <Card className="p-6 hover:shadow-lg transition-shadow">
          <h3 className="text-lg font-semibold mb-2">Analytics</h3>
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            View platform metrics and insights
          </p>
          <button className="text-blue-600 hover:underline">View Analytics →</button>
        </Card>

        <Card className="p-6 hover:shadow-lg transition-shadow">
          <h3 className="text-lg font-semibold mb-2">System Health</h3>
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            Monitor system status and alerts
          </p>
          <button className="text-blue-600 hover:underline">View Status →</button>
        </Card>

        <Card className="p-6 hover:shadow-lg transition-shadow">
          <h3 className="text-lg font-semibold mb-2">Feature Flags</h3>
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            Toggle and manage feature flags
          </p>
          <button className="text-blue-600 hover:underline">Manage Flags →</button>
        </Card>
      </div>
    </div>
  );
};

export default AdminDashboard;
