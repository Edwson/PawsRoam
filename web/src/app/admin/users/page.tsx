'use client';

'use client';

import React, { useState, ChangeEvent } from 'react';
import { gql, useQuery, useMutation } from '@apollo/client';
// import Link from 'next/link'; // Not used in this version
import adminStyles from '../AdminLayout.module.css'; // Import shared admin styles

// Define the GraphQL query for fetching users
const ADMIN_GET_ALL_USERS_QUERY = gql`
  query AdminGetAllUsers {
    adminGetAllUsers {
      id
      email
      name
      role
      status
      created_at
      updated_at
    }
  }
`;

// Define the GraphQL mutation for updating user
const ADMIN_UPDATE_USER_MUTATION = gql`
  mutation AdminUpdateUser($userId: ID!, $role: String, $status: String) {
    adminUpdateUser(userId: $userId, role: $role, status: $status) {
      id
      role
      status
      # Potentially refetch other fields if they could change due to role/status, or rely on cache update
    }
  }
`;

// Define available roles and statuses for dropdowns
const AVAILABLE_ROLES = ['user', 'admin', 'business_owner', 'paws_safer']; // Add more as defined in backend
const AVAILABLE_STATUSES = ['active', 'suspended', 'pending_verification']; // Add more as defined

// Define the expected User type from the query
interface User {
  id: string;
  email: string;
  name?: string | null;
  role: string;
  status: string;
  created_at: string;
  updated_at: string;
}

// Basic styles for the table
const tableStyle: React.CSSProperties = {
  width: '100%',
  borderCollapse: 'collapse',
  marginTop: '1.5rem',
};

const thStyle: React.CSSProperties = {
  borderBottom: '2px solid var(--current-border-color)',
  padding: '0.75rem 1rem',
  textAlign: 'left',
  backgroundColor: 'var(--current-surface)', // Light background for header
  color: 'var(--primary-dark)',
  fontWeight: '600',
};

const tdStyle: React.CSSProperties = {
  borderBottom: '1px solid var(--current-border-color)',
  padding: '0.75rem 1rem',
  verticalAlign: 'middle', // Changed to middle for form elements
};

// Component for each user row to manage its own state for role/status editing
interface UserRowProps {
  user: User;
  onUpdateSuccess: () => void; // Callback to refetch user list or notify parent
}

const UserRow: React.FC<UserRowProps> = ({ user, onUpdateSuccess }) => {
  const [selectedRole, setSelectedRole] = useState(user.role);
  const [selectedStatus, setSelectedStatus] = useState(user.status);
  const [updateMessage, setUpdateMessage] = useState<string | null>(null);

  const [adminUpdateUser, { loading: updateLoading, error: updateError }] = useMutation(ADMIN_UPDATE_USER_MUTATION, {
    onCompleted: () => {
      setUpdateMessage('User updated successfully!');
      onUpdateSuccess(); // Trigger refetch or cache update in parent
      setTimeout(() => setUpdateMessage(null), 3000); // Clear message after 3s
    },
    onError: (err) => {
      setUpdateMessage(`Error: ${err.message}`);
      // Optionally revert selectedRole/Status if desired, or let user retry
      setTimeout(() => setUpdateMessage(null), 5000);
    }
  });

  const handleUpdate = () => {
    const variables: { userId: string; role?: string; status?: string } = { userId: user.id };
    let changesMade = false;

    if (selectedRole !== user.role) {
      variables.role = selectedRole;
      changesMade = true;
    }
    if (selectedStatus !== user.status) {
      variables.status = selectedStatus;
      changesMade = true;
    }

    if (changesMade) {
      adminUpdateUser({ variables });
    } else {
      setUpdateMessage("No changes to update.");
      setTimeout(() => setUpdateMessage(null), 3000);
    }
  };

  return (
    <tr key={user.id}>
      <td style={tdStyle} title={user.id}>{user.id.substring(0, 8)}...</td>
      <td style={tdStyle}>{user.email}</td>
      <td style={tdStyle}>{user.name || 'N/A'}</td>
      <td style={tdStyle}>
        <select
          value={selectedRole}
          onChange={(e: ChangeEvent<HTMLSelectElement>) => setSelectedRole(e.target.value)}
          disabled={updateLoading}
          style={{ width: '100%', minWidth: '120px' }}
        >
          {AVAILABLE_ROLES.map(role => <option key={role} value={role}>{role}</option>)}
        </select>
      </td>
      <td style={tdStyle}>
        <select
          value={selectedStatus}
          onChange={(e: ChangeEvent<HTMLSelectElement>) => setSelectedStatus(e.target.value)}
          disabled={updateLoading}
          style={{ width: '100%', minWidth: '120px' }}
        >
          {AVAILABLE_STATUSES.map(status => <option key={status} value={status}>{status}</option>)}
        </select>
      </td>
      <td style={tdStyle}>{new Date(user.created_at).toLocaleDateString()}</td>
      <td style={tdStyle}>{new Date(user.updated_at).toLocaleDateString()}</td>
      <td style={tdStyle}>
        <button onClick={handleUpdate} disabled={updateLoading} className="button-style" style={{padding: '0.5rem 1rem', fontSize: '0.9rem'}}>
          {updateLoading ? 'Updating...' : 'Update'}
        </button>
        {updateMessage && <p style={{ fontSize: '0.8rem', color: updateError ? 'red' : 'green', marginTop: '0.5rem' }}>{updateMessage}</p>}
      </td>
    </tr>
  );
};


const ManageUsersPage = () => {
  const { loading, error, data, refetch: refetchUsers } = useQuery(ADMIN_GET_ALL_USERS_QUERY);

  if (loading) return <p>Loading users...</p>;
  if (error) return <p className="error-message">Error loading users: {error.message}</p>;

  const users: User[] = data?.adminGetAllUsers || [];

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}> {/* Removed marginBottom from here */}
        <h2 className={adminStyles.adminPageTitle}>Manage Users</h2>
        {/* Optional: Add button for creating users if that's a feature */}
      </div>

      {users.length === 0 ? (
        <p>No users found.</p>
      ) : (
        <div style={{ overflowX: 'auto' }}> {/* For responsive table */}
          <table style={tableStyle}>
            <thead>
              <tr>
                <th style={thStyle}>ID</th>
                <th style={thStyle}>Email</th>
                <th style={thStyle}>Name</th>
                <th style={thStyle}>Role</th>
                <th style={thStyle}>Status</th>
                <th style={thStyle}>Created At</th>
                <th style={thStyle}>Updated At</th>
                <th style={thStyle}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map((user) => (
                <UserRow key={user.id} user={user} onUpdateSuccess={refetchUsers} />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default ManageUsersPage;
