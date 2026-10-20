import type { SensorReading } from '@/types';

export interface ChartPoint {
  time: string;
  label: string;
  soilMoisture: number;
  temperature: number;
  humidity: number;
  lightIntensity: number;
  [key: string]: string | number;
}

export function readingsToChartPoints(readings: SensorReading[]): ChartPoint[] {
  return [...readings]
    .sort((a, b) => +new Date(a.timestamp) - +new Date(b.timestamp))
    .map((r) => {
      const d = new Date(r.timestamp);
      return {
        time: r.timestamp,
        label: d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' }),
        soilMoisture: r.soilMoisture,
        temperature: r.temperature,
        humidity: r.humidity,
        lightIntensity: r.lightIntensity,
      };
    });
}

export function readingsToDateChartPoints(readings: SensorReading[]): ChartPoint[] {
  return [...readings]
    .sort((a, b) => +new Date(a.timestamp) - +new Date(b.timestamp))
    .map((r) => {
      const d = new Date(r.timestamp);
      return {
        time: r.timestamp,
        label: d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
        soilMoisture: r.soilMoisture,
        temperature: r.temperature,
        humidity: r.humidity,
        lightIntensity: r.lightIntensity,
      };
    });
}
