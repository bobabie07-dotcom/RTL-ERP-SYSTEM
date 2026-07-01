import { createContext, useContext, useEffect, useState } from 'react';
import { farmsApi } from '../api/client';
import { useAuth } from './AuthContext';

const FarmContext = createContext(null);

export function FarmProvider({ children }) {
  const { user } = useAuth();
  const [farms, setFarms] = useState([]);
  const [farmId, setFarmId] = useState(() => {
    if (user && user.role_id !== 1 && user.role_id !== 5 && user.role_id !== 6) {
      return user.farm_id;
    }
    const saved = localStorage.getItem('erp_farm_id');
    return saved ? parseInt(saved, 10) : null;
  });

  useEffect(() => {
    if (user && user.role_id !== 1 && user.role_id !== 5 && user.role_id !== 6) {
      setFarmId(user.farm_id);
    }
  }, [user]);

  function reloadFarms() {
    return farmsApi.list().then(list => {
      setFarms(list);
      const stillExists = list.some(f => f.id === farmId);
      if (list.length > 0) {
        if (!stillExists || farmId === null) {
          selectFarm(list[0].id);
        }
      } else {
        setFarmId(null);
      }
    }).catch(() => {});
  }

  useEffect(() => { reloadFarms(); }, [user]);

  function selectFarm(id) {
    if (user && (user.role_id === 1 || user.role_id === 5 || user.role_id === 6)) {
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
