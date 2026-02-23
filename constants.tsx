
import { Property, Client, Activity, Reminder, Commission, Task, Campaign, Broker, ALL_PERMISSIONS } from './types.ts';

export const MOCK_BROKERS: Broker[] = [
  {
    id: 'admin-sergio',
    name: 'Sergio Carrasco Junior',
    email: 'scarrasco462@gmail.com',
    password: '123456',
    role: 'Admin',
    joinDate: '2024-01-01',
    performance: 100,
    permissions: ALL_PERMISSIONS,
    networkId: 'VETTUS-PRO'
  }
];

export const MOCK_PROPERTIES: Property[] = [];
export const MOCK_CLIENTS: Client[] = [];
export const MOCK_TASKS: Task[] = [];
export const MOCK_CAMPAIGNS: Campaign[] = [];
export const MOCK_ACTIVITIES: Activity[] = [];
export const MOCK_REMINDERS: Reminder[] = [];
export const MOCK_COMMISSIONS: Commission[] = [];
