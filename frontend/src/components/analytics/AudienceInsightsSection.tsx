import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Globe } from 'lucide-react';
import { getCreatorAudienceInsights } from '../../lib/analytics-api';
import PieChartComponent from './PieChartComponent';
import BarChartComponent from './BarChartComponent';

interface AudienceInsightsSectionProps {
  creatorName: string;
}

// Country code to name mapping (most common countries)
const COUNTRY_NAMES: Record<string, string> = {
  US: 'United States',
  GB: 'United Kingdom',
  CA: 'Canada',
  AU: 'Australia',
  DE: 'Germany',
  FR: 'France',
  JP: 'Japan',
  BR: 'Brazil',
  MX: 'Mexico',
  ES: 'Spain',
  IT: 'Italy',
  NL: 'Netherlands',
  SE: 'Sweden',
  NO: 'Norway',
  DK: 'Denmark',
  FI: 'Finland',
  PL: 'Poland',
  RU: 'Russia',
  CN: 'China',
  KR: 'South Korea',
  IN: 'India',
  XX: 'Unknown',
};

// Device type display names
const DEVICE_NAMES: Record<string, string> = {
  mobile: 'Mobile',
  desktop: 'Desktop',
  tablet: 'Tablet',
  unknown: 'Unknown',
};

// Device type icons
const DEVICE_ICONS: Record<string, string> = {
  mobile: '📲',
  desktop: '💻',
  tablet: '📱',
  unknown: '❓',
};

const AudienceInsightsSection: React.FC<AudienceInsightsSectionProps> = ({
  creatorName,
}) => {
  const { data: insights, isLoading, error } = useQuery({
    queryKey: ['creatorAudienceInsights', creatorName],
    queryFn: () => getCreatorAudienceInsights(creatorName, { limit: 10 }),
    enabled: !!creatorName,
  });

  if (error) {
    return (
      <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
        <p className="text-red-800 dark:text-red-200">
          Failed to load audience insights. Please try again later.
        </p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {[1, 2].map((i) => (
          <div
            key={i}
            className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 h-96 animate-pulse"
          >
            <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-1/3 mb-4"></div>
            <div className="h-full bg-gray-200 dark:bg-gray-700 rounded"></div>
          </div>
        ))}
      </div>
    );
  }

  if (!insights || insights.total_views === 0) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <div className="text-center text-gray-600 dark:text-gray-400 py-8">
          <p>No audience data available yet. Check back after accumulating some views.</p>
        </div>
      </div>
    );
  }

  // Prepare data for device chart
  const deviceData = insights.device_types.map((device) => ({
    name: DEVICE_NAMES[device.device_type] || device.device_type,
    value: device.view_count,
  }));

  // Prepare data for geography chart
  const geographyData = insights.top_countries.map((country) => ({
    name: COUNTRY_NAMES[country.country] || country.country,
    value: country.view_count,
  }));

  return (
    <div>
      {/* Summary Statistics */}
      <div className="mb-6 bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <div className="flex items-center gap-2 mb-2">
          <Globe className="w-5 h-5 text-purple-600 dark:text-purple-400" />
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            Audience Overview
          </h3>
        </div>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          Based on {insights.total_views.toLocaleString()} views from the last 90 days
        </p>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Device Distribution */}
        {deviceData.length > 0 && (
          <div>
            <PieChartComponent
              data={deviceData}
              title="Audience by Device Type"
              height={350}
              colors={['#8b5cf6', '#ec4899', '#f59e0b', '#10b981']}
            />
            
            {/* Device breakdown table */}
            <div className="mt-4 bg-white dark:bg-gray-800 rounded-lg shadow p-4">
              <table className="w-full text-sm" role="table" aria-label="Device type distribution">
                <caption className="sr-only">Breakdown of views by device type</caption>
                <thead>
                  <tr className="border-b border-gray-200 dark:border-gray-700">
                    <th scope="col" className="text-left py-2 text-gray-700 dark:text-gray-300">Device</th>
                    <th scope="col" className="text-right py-2 text-gray-700 dark:text-gray-300">Views</th>
                    <th scope="col" className="text-right py-2 text-gray-700 dark:text-gray-300">%</th>
                  </tr>
                </thead>
                <tbody>
                  {insights.device_types.map((device) => (
                    <tr key={device.device_type} className="border-b border-gray-100 dark:border-gray-800">
                      <td className="py-2 text-gray-900 dark:text-white">
                        <span className="mr-2">
                          {DEVICE_ICONS[device.device_type] || '❓'}
                        </span>
                        {DEVICE_NAMES[device.device_type] || device.device_type}
                      </td>
                      <td className="text-right text-gray-900 dark:text-white">
                        {device.view_count.toLocaleString()}
                      </td>
                      <td className="text-right text-gray-900 dark:text-white">
                        {device.percentage.toFixed(1)}%
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Geography Distribution */}
        {geographyData.length > 0 && (
          <div>
            <BarChartComponent
              data={geographyData}
              title="Top Countries by Views"
              valueLabel="Views"
              height={350}
              color="#ec4899"
            />
            
            {/* Geography breakdown table */}
            <div className="mt-4 bg-white dark:bg-gray-800 rounded-lg shadow p-4">
              <table className="w-full text-sm" role="table" aria-label="Geographic distribution">
                <caption className="sr-only">Breakdown of views by country</caption>
                <thead>
                  <tr className="border-b border-gray-200 dark:border-gray-700">
                    <th scope="col" className="text-left py-2 text-gray-700 dark:text-gray-300">Country</th>
                    <th scope="col" className="text-right py-2 text-gray-700 dark:text-gray-300">Views</th>
                    <th scope="col" className="text-right py-2 text-gray-700 dark:text-gray-300">%</th>
                  </tr>
                </thead>
                <tbody>
                  {insights.top_countries.map((country) => (
                    <tr key={country.country} className="border-b border-gray-100 dark:border-gray-800">
                      <td className="py-2 text-gray-900 dark:text-white">
                        {COUNTRY_NAMES[country.country] || country.country}
                      </td>
                      <td className="text-right text-gray-900 dark:text-white">
                        {country.view_count.toLocaleString()}
                      </td>
                      <td className="text-right text-gray-900 dark:text-white">
                        {country.percentage.toFixed(1)}%
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AudienceInsightsSection;
