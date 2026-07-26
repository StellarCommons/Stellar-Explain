
import React from 'react';
import { useZakkiyyat } from './useZakkiyyat';

export const ZakkiyyatComponent: React.FC = () => {
  const { isActive, toggleActive, data, refresh } = useZakkiyyat();

  return (
    <div className="p-4 border rounded">
      <h2>Zakkiyyat Feature</h2>
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
