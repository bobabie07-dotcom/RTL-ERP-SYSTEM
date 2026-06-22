import { createContext, useContext, useEffect, useState } from 'react';
import { farmsApi } from '../api/client';

const FarmContext = createContext(null);

export function FarmProvider({ children }) {
  const [farms, setFarms] = useState([]);
  const [farmId, setFarmId] = useState(() => {
    const saved = localStorage.getItem('erp_farm_id');
    return saved ? parseInt(saved, 10) : 1;
  });

  function reloadFarms() {
    return farmsApi.list().then(list => {
      setFarms(list);
      // If selected farm was deleted, switch to first available
      const stillExists = list.some(f => f.id === farmId);
      if (!stillExists && list.length > 0) selectFarm(list[0].id);
    }).catch(() => {});
  }

  useEffect(() => { reloadFarms(); }, []);

  function selectFarm(id) {
    setFarmId(id);
    localStorage.setItem('erp_farm_id', String(id));
  }

  return (
    <FarmContext.Provider value={{ farms, farmId, selectFarm, reloadFarms }}>
      {children}
    </FarmContext.Provider>
  );
}

export function useFarm() {
  const ctx = useContext(FarmContext);
  if (!ctx) throw new Error('useFarm must be used inside FarmProvider');
  return ctx;
}
