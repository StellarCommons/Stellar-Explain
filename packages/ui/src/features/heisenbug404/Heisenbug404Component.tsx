
import React from 'react';
import { useHeisenbug404 } from './useHeisenbug404';

export const Heisenbug404Component: React.FC = () => {
  const { isActive, toggleActive, data, refresh } = useHeisenbug404();

  return (
    <div className="p-4 border rounded">
      <h2>Heisenbug404 Feature</h2>
      <p>Status: {isActive ? 'Active' : 'Inactive'}</p>
      <button onClick={toggleActive} className="btn">Toggle</button>
      <button onClick={refresh} className="btn">Refresh Data</button>
      <ul>
        {data.map((item, i) => (
          <li key={i}>{JSON.stringify(item)}</li>
        ))}
      </ul>
    </div>
  );
};
