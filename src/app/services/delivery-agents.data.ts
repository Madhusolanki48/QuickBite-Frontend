import { GeoPoint } from '../core/app.models';

export interface DeliveryAgentDirectoryEntry {
  id?: number;
  name: string;
  email: string;
  phone: string;
  zone: string;
  rating: string;
  role: string;
  initial: string;
  online: boolean;
  available: boolean;
  location: GeoPoint;
}

export const DELIVERY_AGENT_SEEDS: DeliveryAgentDirectoryEntry[] = [
  {
    id: 1,
    name: 'Jackson Ron',
    email: 'agent1@quickbite.com',
    phone: '+91 98765 00001',
    zone: 'West Delhi / Rajouri Garden',
    rating: '4.9 ★ Active Rider',
    role: 'Bike - ID #DA-001',
    initial: 'J',
    online: true,
    available: true,
    location: { lat: 28.6415, lng: 77.1209, accuracy: 16 },
  },
  {
    id: 2,
    name: 'Paul Weasely',
    email: 'agent2@quickbite.com',
    phone: '+91 98765 00002',
    zone: 'North Delhi / Pitampura',
    rating: '4.8 ★ Active Rider',
    role: 'Scooter - ID #DA-002',
    initial: 'P',
    online: true,
    available: true,
    location: { lat: 28.6941, lng: 77.1425, accuracy: 18 },
  },
  {
    id: 3,
    name: 'Olive Mandy',
    email: 'agent3@quickbite.com',
    phone: '+91 98765 00003',
    zone: 'East Delhi / Mayur Vihar',
    rating: '5.0 ★ Active Rider',
    role: 'Electric Bike - ID #DA-003',
    initial: 'O',
    online: true,
    available: true,
    location: { lat: 28.6012, lng: 77.3021, accuracy: 17 },
  },
  {
    id: 4,
    name: 'Edward Ford',
    email: 'agent4@quickbite.com',
    phone: '+91 98765 00004',
    zone: 'South Delhi / Connaught Place',
    rating: '4.9 ★ Active Rider',
    role: 'Bike - ID #DA-004',
    initial: 'E',
    online: true,
    available: true,
    location: { lat: 28.5355, lng: 77.241, accuracy: 15 },
  },
];
