
import React from 'react';
import { useYasinmuhd } from './useYasinmuhd';

export const YasinmuhdComponent: React.FC = () => {
  const { isActive, toggleActive, data, refresh } = useYasinmuhd();

  return (
    <div className="p-4 border rounded">
      <h2>Yasinmuhd Feature</h2>
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
