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
    name: 'Rahul Kumar',
    email: 'rahul.kumar@quickbite.dev',
    phone: '+91 98765 43210',
    zone: 'North Delhi',
    rating: '4.9 - 1,247 Deliveries',
    role: 'Delivery Agent - ID #DA-001',
    initial: 'R',
    online: true,
    available: true,
    location: { lat: 28.7041, lng: 77.1025, accuracy: 18 },
  },
  {
    name: 'Aisha Khanna',
    email: 'aisha.khanna@quickbite.dev',
    phone: '+91 98111 22334',
    zone: 'West Delhi',
    rating: '4.8 - 982 Deliveries',
    role: 'Delivery Agent - ID #DA-014',
    initial: 'A',
    online: false,
    available: false,
    location: { lat: 28.6692, lng: 77.1421, accuracy: 22 },
  },
  {
    name: 'Ishan Sharma',
    email: 'ishan.sharma@quickbite.dev',
    phone: '+91 98222 33445',
    zone: 'South Delhi',
    rating: '4.7 - 744 Deliveries',
    role: 'Delivery Agent - ID #DA-021',
    initial: 'I',
    online: true,
    available: true,
    location: { lat: 28.5608, lng: 77.2404, accuracy: 16 },
  },
  {
    name: 'Neha Singh',
    email: 'neha.singh@quickbite.dev',
    phone: '+91 98333 44556',
    zone: 'East Delhi',
    rating: '5.0 - 518 Deliveries',
    role: 'Delivery Agent - ID #DA-030',
    initial: 'N',
    online: false,
    available: false,
    location: { lat: 28.6463, lng: 77.315, accuracy: 20 },
  },
];
