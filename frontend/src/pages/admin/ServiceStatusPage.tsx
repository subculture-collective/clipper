import { useQuery } from '@tanstack/react-query';
import { Container, Card, CardHeader, CardBody } from '../../components';
import { CheckCircle, XCircle, AlertTriangle, RefreshCw, Activity, Database, Server, HardDrive } from 'lucide-react';
import axios from 'axios';

interface HealthReady {
  status: string;
  checks: {
    database: string;
    redis: string;
    opensearch?: string;
  };
}

interface HealthStats {
  database: {
    acquired_conns: number;
    idle_conns: number;
    total_conns: number;
    max_conns: number;
    acquire_count: number;
    acquire_duration_ms: number;
  };
}

interface CacheHealth {
  [key: string]: unknown;
}

interface WebhookStats {
  [key: string]: unknown;
}

function StatusBadge({ status }: { status: string }) {
  if (status === 'ok' || status === 'ready' || status === 'alive' || status === 'healthy') {
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-green-500/10 text-green-400 border border-green-500/20">
        <CheckCircle className="w-3.5 h-3.5" />
        {status}
      </span>
    );
  }
  if (status === 'degraded') {
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-yellow-500/10 text-yellow-400 border border-yellow-500/20">
        <AlertTriangle className="w-3.5 h-3.5" />
        {status}
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-red-500/10 text-red-400 border border-red-500/20">
      <XCircle className="w-3.5 h-3.5" />
      {status}
    </span>
  );
}

export function ServiceStatusPage() {
  const {
    data: readiness,
    isLoading: readyLoading,
    error: readyError,
    refetch: refetchReady,
  } = useQuery<HealthReady>({
    queryKey: ['health-ready'],
    queryFn: async () => {
      const res = await axios.get('/health/ready');
      return res.data;
    },
    refetchInterval: 15000,
  });

  const { data: liveness } = useQuery<{ status: string }>({
    queryKey: ['health-live'],
    queryFn: async () => {
      const res = await axios.get('/health/live');
      return res.data;
    },
    refetchInterval: 15000,
  });

  const { data: stats } = useQuery<HealthStats>({
    queryKey: ['health-stats'],
    queryFn: async () => {
      const res = await axios.get('/health/stats');
      return res.data;
    },
    refetchInterval: 15000,
  });

  const { data: cacheHealth } = useQuery<CacheHealth>({
    queryKey: ['health-cache'],
    queryFn: async () => {
      const res = await axios.get('/health/cache/check');
      return res.data;
    },
    refetchInterval: 30000,
  });

  const { data: webhookStats } = useQuery<WebhookStats>({
    queryKey: ['health-webhooks'],
    queryFn: async () => {
      const res = await axios.get('/health/webhooks');
      return res.data;
    },
    refetchInterval: 30000,
  });

  const handleRefresh = () => {
    refetchReady();
  };

  return (
    <Container className="py-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Service Status</h1>
          <p className="text-sm text-gray-400 mt-1">Real-time health monitoring for all backend services</p>
        </div>
        <button
          onClick={handleRefresh}
          className="inline-flex items-center gap-2 px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg text-sm transition-colors"
        >
          <RefreshCw className="w-4 h-4" />
          Refresh
        </button>
      </div>

      {/* Overall Status */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Activity className="w-5 h-5 text-purple-400" />
            <h2 className="text-lg font-semibold text-white">Overall Status</h2>
          </div>
        </CardHeader>
        <CardBody>
          {readyLoading ? (
            <p className="text-gray-400">Checking services...</p>
          ) : readyError ? (
            <div className="flex items-center gap-2 text-red-400">
              <XCircle className="w-5 h-5" />
              <span>Failed to reach backend</span>
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="flex flex-col gap-1">
                <span className="text-xs text-gray-500 uppercase tracking-wide">API</span>
                <StatusBadge status={liveness?.status ?? 'unknown'} />
              </div>
              <div className="flex flex-col gap-1">
                <span className="text-xs text-gray-500 uppercase tracking-wide">Database</span>
                <StatusBadge status={readiness?.checks?.database ?? 'unknown'} />
              </div>
              <div className="flex flex-col gap-1">
                <span className="text-xs text-gray-500 uppercase tracking-wide">Redis</span>
                <StatusBadge status={readiness?.checks?.redis ?? 'unknown'} />
              </div>
              <div className="flex flex-col gap-1">
                <span className="text-xs text-gray-500 uppercase tracking-wide">OpenSearch</span>
                <StatusBadge status={readiness?.checks?.opensearch ?? 'not configured'} />
              </div>
            </div>
          )}
        </CardBody>
      </Card>

      {/* Database Pool Stats */}
      {stats?.database && (
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Database className="w-5 h-5 text-blue-400" />
              <h2 className="text-lg font-semibold text-white">Database Pool</h2>
            </div>
          </CardHeader>
          <CardBody>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {[
                { label: 'Active Connections', value: stats.database.acquired_conns },
                { label: 'Idle Connections', value: stats.database.idle_conns },
                { label: 'Total Connections', value: stats.database.total_conns },
                { label: 'Max Connections', value: stats.database.max_conns },
                { label: 'Total Acquires', value: stats.database.acquire_count },
                { label: 'Avg Acquire (ms)', value: stats.database.acquire_duration_ms },
              ].map(item => (
                <div key={item.label} className="bg-gray-800/50 rounded-lg p-3">
                  <p className="text-xs text-gray-500 uppercase tracking-wide">{item.label}</p>
                  <p className="text-xl font-semibold text-white mt-1">{item.value}</p>
                </div>
              ))}
            </div>
          </CardBody>
        </Card>
      )}

      {/* Cache Health */}
      {cacheHealth && (
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <HardDrive className="w-5 h-5 text-emerald-400" />
              <h2 className="text-lg font-semibold text-white">Cache Health</h2>
            </div>
          </CardHeader>
          <CardBody>
            <pre className="text-sm text-gray-300 bg-gray-800/50 rounded-lg p-4 overflow-auto max-h-64">
              {JSON.stringify(cacheHealth, null, 2)}
            </pre>
          </CardBody>
        </Card>
      )}

      {/* Webhook Stats */}
      {webhookStats && (
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Server className="w-5 h-5 text-orange-400" />
              <h2 className="text-lg font-semibold text-white">Webhook Stats</h2>
            </div>
          </CardHeader>
          <CardBody>
            <pre className="text-sm text-gray-300 bg-gray-800/50 rounded-lg p-4 overflow-auto max-h-64">
              {JSON.stringify(webhookStats, null, 2)}
            </pre>
          </CardBody>
        </Card>
      )}
    </Container>
  );
}
