
import React from 'react';
import { useQueenmagajiya } from './useQueenmagajiya';

export const QueenmagajiyaComponent: React.FC = () => {
  const { isActive, toggleActive, data, refresh } = useQueenmagajiya();

  return (
    <div className="p-4 border rounded">
      <h2>Queenmagajiya Feature</h2>
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
