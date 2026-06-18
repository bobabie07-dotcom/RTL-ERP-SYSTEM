export const BATCHES = [
  { id: 'BATCH-2025-08', house: 'House A-1', farm: 'RTL Main Farm', breed: 'Ross 308', placed: 'Apr 14, 2025', birds: '12,400', age: '28 days', mort: '3.45%', fcr: '1.62', avgWt: '1.42 kg', status: 'Active', survivalRate: '96.5%', totalFeed: '8,240', estHarvest: 'Jun 1, 2025', dayOfCycle: 28, cycleLength: 45 },
  { id: 'BATCH-2025-07', house: 'House B-2', farm: 'RTL Main Farm', breed: 'Cobb 500', placed: 'Apr 08, 2025', birds: '11,850', age: '34 days', mort: '4.12%', fcr: '1.65', avgWt: '1.76 kg', status: 'Active', survivalRate: '95.9%', totalFeed: '9,100', estHarvest: 'May 26, 2025', dayOfCycle: 34, cycleLength: 45 },
  { id: 'BATCH-2025-06', house: 'House C-1', farm: 'RTL North Farm', breed: 'Ross 308', placed: 'Apr 01, 2025', birds: '10,200', age: '41 days', mort: '4.28%', fcr: '1.70', avgWt: '2.12 kg', status: 'Harvest Soon', survivalRate: '95.7%', totalFeed: '10,320', estHarvest: 'May 19, 2025', dayOfCycle: 41, cycleLength: 45 },
  { id: 'BATCH-2025-05', house: 'House A-2', farm: 'RTL Main Farm', breed: 'Cobb 500', placed: 'Mar 24, 2025', birds: '13,800', age: '19 days', mort: '2.91%', fcr: '1.58', avgWt: '0.88 kg', status: 'Active', survivalRate: '97.1%', totalFeed: '5,820', estHarvest: 'Jun 8, 2025', dayOfCycle: 19, cycleLength: 45 },
  { id: 'BATCH-2025-04', house: 'House B-1', farm: 'RTL North Farm', breed: 'Ross 308', placed: 'Mar 10, 2025', birds: '9,600', age: '33 days', mort: '3.88%', fcr: '1.67', avgWt: '1.69 kg', status: 'Active', survivalRate: '96.1%', totalFeed: '7,890', estHarvest: 'May 22, 2025', dayOfCycle: 33, cycleLength: 45 },
  { id: 'BATCH-2025-03', house: 'House C-2', farm: 'RTL Main Farm', breed: 'Cobb 500', placed: 'Feb 22, 2025', birds: '11,200', age: '47 days', mort: '5.10%', fcr: '1.82', avgWt: '2.44 kg', status: 'Harvested', survivalRate: '94.9%', totalFeed: '12,100', estHarvest: 'Apr 10, 2025', dayOfCycle: 47, cycleLength: 45 },
  { id: 'BATCH-2025-02', house: 'House A-1', farm: 'RTL Main Farm', breed: 'Ross 308', placed: 'Feb 01, 2025', birds: '12,000', age: '68 days', mort: '4.90%', fcr: '1.79', avgWt: '—', status: 'Harvested', survivalRate: '95.1%', totalFeed: '13,500', estHarvest: 'Mar 20, 2025', dayOfCycle: 45, cycleLength: 45 },
  { id: 'BATCH-2025-01', house: 'House B-2', farm: 'RTL North Farm', breed: 'Cobb 500', placed: 'Jan 10, 2025', birds: '10,800', age: '89 days', mort: '5.40%', fcr: '1.84', avgWt: '—', status: 'Harvested', survivalRate: '94.6%', totalFeed: '11,900', estHarvest: 'Feb 28, 2025', dayOfCycle: 45, cycleLength: 45 },
];

export function getBatch(id) {
  return BATCHES.find((b) => b.id === id) || BATCHES[0];
}
