import dynamic from 'next/dynamic';
import React from 'react';

// Venue type placeholder - should match the one in MapDisplayCore and eventually GraphQL
interface Venue {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  type?: string;
}

interface MapDisplayProps {
  initialCenter?: [number, number];
  initialZoom?: number;
  venues?: Venue[];
}

// Dynamically import the MapDisplayCore component with SSR turned off
const DynamicMapDisplayCore = dynamic(() => import('./MapDisplayCore'), {
  ssr: false,
  loading: () => <div style={{ height: '100%', width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#e0e0e0' }}>Loading map...</div>,
});

const MapDisplay: React.FC<MapDisplayProps> = (props) => {
  return <DynamicMapDisplayCore {...props} />;
};

export default MapDisplay;
