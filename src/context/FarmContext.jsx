import { createContext, useContext, useEffect, useState } from 'react';
import { farmsApi } from '../api/client';
import { useAuth } from './AuthContext';

const FarmContext = createContext(null);

export function FarmProvider({ children }) {
  const { user } = useAuth();
  const [farms, setFarms] = useState([]);
  const [farmId, setFarmId] = useState(() => {
    if (user && user.role_id !== 1 && user.role_id !== 5) {
      return user.farm_id;
    }
    const saved = localStorage.getItem('erp_farm_id');
    return saved ? parseInt(saved, 10) : 1;
  });

  useEffect(() => {
    if (user && user.role_id !== 1 && user.role_id !== 5) {
      setFarmId(user.farm_id);
    }
  }, [user]);

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
    if (user && (user.role_id === 1 || user.role_id === 5)) {
      setFarmId(id);
      localStorage.setItem('erp_farm_id', String(id));
    }
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
