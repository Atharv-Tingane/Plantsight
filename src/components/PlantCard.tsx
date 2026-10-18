import { Link } from 'react-router-dom';
import { Droplets, Thermometer, Activity } from 'lucide-react';
import type { Plant, SensorReading } from '@/types';
import { healthStatusMeta } from '@/lib/format';

interface PlantCardProps {
  plant: Plant;
  reading?: SensorReading;
}

export function PlantCard({ plant, reading }: PlantCardProps) {
  const meta = healthStatusMeta[plant.healthStatus];
  return (
    <Link
      to={`/plants/${plant.id}`}
      className="card overflow-hidden group hover:shadow-soft transition focus:outline-none focus:ring-2 focus:ring-brand-300"
    >
      <div className="relative h-40 bg-brand-50 overflow-hidden">
        <img
          src={plant.imageUrl}
          alt={plant.name}
          loading="lazy"
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
        />
        <span className={`badge absolute top-3 left-3 ${meta.badge} bg-white/90 backdrop-blur`}>
          <span className={`w-1.5 h-1.5 rounded-full ${meta.dot}`} />
          {meta.label}
        </span>
      </div>
      <div className="p-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-semibold text-gray-900 group-hover:text-brand-700 transition">
              {plant.name}
            </h3>
            <p className="text-xs text-gray-500 italic">{plant.species}</p>
          </div>
          {plant.healthScore > 0 && (
            <div className="text-right">
              <div className="text-xs text-gray-400">Health</div>
              <div className="text-sm font-semibold text-gray-800 tabular-nums">
                {plant.healthScore}%
              </div>
            </div>
          )}
        </div>
        <p className="text-xs text-gray-500 mt-2">{plant.location}</p>
        <div className="mt-3 flex items-center gap-3 text-xs text-gray-500">
          {reading && (
            <>
              <span className="inline-flex items-center gap-1">
                <Droplets className="w-3.5 h-3.5 text-sky-500" />
                {reading.soilMoisture}%
              </span>
              <span className="inline-flex items-center gap-1">
                <Thermometer className="w-3.5 h-3.5 text-orange-500" />
                {reading.temperature}°
              </span>
              <span className="inline-flex items-center gap-1">
                <Activity className="w-3.5 h-3.5 text-brand-500" />
                {reading.humidity}%
              </span>
            </>
          )}
        </div>
      </div>
    </Link>
  );
}
