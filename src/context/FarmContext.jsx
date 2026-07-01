import { createContext, useContext, useEffect, useState } from 'react';
import { farmsApi } from '../api/client';
import { useAuth } from './AuthContext';

const FarmContext = createContext(null);

function canSwitchFarms(user) {
  const ids = user?.all_role_ids?.length ? user.all_role_ids : [user?.role_id];
  return ids.some(id => id === 1 || id === 5 || id === 6);
}

export function FarmProvider({ children }) {
  const { user } = useAuth();
  const [farms, setFarms] = useState([]);
  const [farmId, setFarmId] = useState(() => {
    if (user && !canSwitchFarms(user)) {
      return user.farm_id;
    }
    const saved = localStorage.getItem('erp_farm_id');
    return saved ? parseInt(saved, 10) : null;
  });

  useEffect(() => {
    if (user && !canSwitchFarms(user)) {
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
    if (user && canSwitchFarms(user)) {
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
