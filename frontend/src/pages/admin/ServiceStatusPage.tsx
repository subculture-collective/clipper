import { useEffect, useState } from 'react';
import { Container, Card, CardHeader, CardBody, Grid, Badge } from '../../components';

interface ServiceStatus {
    id: string;
    service_name: string;
    status: 'healthy' | 'degraded' | 'unhealthy';
    status_message?: string;
    last_check_at: string;
    response_time_ms?: number;
    error_rate?: number;
}

interface StatusIncident {
    id: string;
    service_name: string;
    title: string;
    description?: string;
    severity: 'critical' | 'major' | 'minor' | 'maintenance';
    status: 'investigating' | 'identified' | 'monitoring' | 'resolved';
    started_at: string;
    resolved_at?: string;
}

const StatusBadge = ({ status }: { status: string }) => {
    const colors = {
        healthy: 'bg-green-500',
        degraded: 'bg-yellow-500',
        unhealthy: 'bg-red-500',
    };
    
    const color = colors[status as keyof typeof colors] || 'bg-gray-500';
    
    return (
        <div className="flex items-center gap-2">
            <div className={`w-3 h-3 rounded-full ${color}`}></div>
            <span className="capitalize">{status}</span>
        </div>
    );
};

const SeverityBadge = ({ severity }: { severity: string }) => {
    const getVariant = (sev: string): 'error' | 'warning' | 'secondary' | 'default' => {
        switch (sev) {
            case 'critical':
                return 'error';
            case 'major':
                return 'warning';
            case 'minor':
                return 'secondary';
            case 'maintenance':
                return 'default';
            default:
                return 'secondary';
        }
    };
    
    return (
        <Badge variant={getVariant(severity)}>
            {severity}
        </Badge>
    );
};

export function ServiceStatusPage() {
    const [services, setServices] = useState<ServiceStatus[]>([]);
    const [incidents, setIncidents] = useState<StatusIncident[]>([]);
    const [overallStatus, setOverallStatus] = useState<string>('healthy');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const controller = new AbortController();
        const { signal } = controller;

        const loadData = async () => {
            setLoading(true);
            try {
                await Promise.allSettled([
                    fetchServiceStatus(signal),
                    fetchActiveIncidents(signal),
                    fetchOverallStatus(signal)
                ]);
            } finally {
                setLoading(false);
            }
        };

        loadData();
        
        // Poll for updates every 30 seconds
        const interval = setInterval(() => {
            loadData();
        }, 30000);
        
        return () => {
            clearInterval(interval);
            controller.abort();
        };
    }, []);

    const fetchServiceStatus = async (signal?: AbortSignal) => {
        try {
            const response = await fetch('/api/v1/status/services', { signal });
            if (!response.ok) throw new Error('Failed to fetch service status');
            const data = await response.json();
            setServices(data.data || []);
            setError(null);
        } catch (err) {
            if (err instanceof DOMException && err.name === 'AbortError') {
                return;
            }
            const errorMsg = err instanceof Error ? err.message : 'Unknown error';
            setError(errorMsg);
            console.error('Failed to fetch service status:', err);
        }
    };

    const fetchActiveIncidents = async (signal?: AbortSignal) => {
        try {
            const response = await fetch('/api/v1/status/incidents/active', { signal });
            if (!response.ok) throw new Error('Failed to fetch incidents');
            const data = await response.json();
            setIncidents(data.data || []);
        } catch (err) {
            if (err instanceof DOMException && err.name === 'AbortError') {
                return;
            }
            console.error('Failed to fetch incidents:', err);
            // Don't set global error for incidents, just log it
        }
    };

    const fetchOverallStatus = async (signal?: AbortSignal) => {
        try {
            const response = await fetch('/api/v1/status/overall', { signal });
            if (!response.ok) throw new Error('Failed to fetch overall status');
            const data = await response.json();
            setOverallStatus(data.data?.status || 'unknown');
        } catch (err) {
            if (err instanceof DOMException && err.name === 'AbortError') {
                return;
            }
            console.error('Failed to fetch overall status:', err);
            // Don't set global error for overall status, just log it
        }
    };

    const formatTime = (dateStr: string) => {
        const date = new Date(dateStr);
        return date.toLocaleString();
    };

    const getTimeAgo = (dateStr: string) => {
        const date = new Date(dateStr);
        const now = new Date();
        const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);
        
        if (seconds < 60) return `${seconds}s ago`;
        if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
        if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
        return `${Math.floor(seconds / 86400)}d ago`;
    };

    if (loading) {
        return (
            <Container className="py-8">
                <div className="text-center">Loading service status...</div>
            </Container>
        );
    }

    if (error) {
        return (
            <Container className="py-8">
                <Card>
                    <CardBody>
                        <p className="text-destructive">Error: {error}</p>
                    </CardBody>
                </Card>
            </Container>
        );
    }

    return (
        <Container className="py-8">
            <div className="mb-8">
                <h1 className="text-3xl font-bold mb-2">Service Status Dashboard</h1>
                <div className="flex items-center gap-4">
                    <span className="text-muted-foreground">Overall Status:</span>
                    <StatusBadge status={overallStatus} />
                </div>
            </div>

            {/* Active Incidents */}
            {incidents.length > 0 && (
                <Card className="mb-8 border-yellow-500">
                    <CardHeader>
                        <h2 className="text-xl font-semibold">
                            ⚠️ Active Incidents ({incidents.length})
                        </h2>
                    </CardHeader>
                    <CardBody>
                        <div className="space-y-4">
                            {incidents.map((incident) => (
                                <div
                                    key={incident.id}
                                    className="p-4 border border-border rounded-lg"
                                >
                                    <div className="flex items-start justify-between mb-2">
                                        <div className="flex-1">
                                            <div className="flex items-center gap-2 mb-2">
                                                <h3 className="font-semibold">
                                                    {incident.title}
                                                </h3>
                                                <SeverityBadge severity={incident.severity} />
                                            </div>
                                            {incident.description && (
                                                <p className="text-sm text-muted-foreground mb-2">
                                                    {incident.description}
                                                </p>
                                            )}
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-4 text-xs text-muted-foreground">
                                        <span>Service: {incident.service_name}</span>
                                        <span>Status: {incident.status}</span>
                                        <span>Started: {formatTime(incident.started_at)}</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </CardBody>
                </Card>
            )}

            {/* Service Status Grid */}
            <Card>
                <CardHeader>
                    <h2 className="text-xl font-semibold">Service Health</h2>
                </CardHeader>
                <CardBody>
                    <Grid cols={1} gap={4} responsive={{ md: 2, lg: 3 }}>
                        {services.map((service) => (
                            <div
                                key={service.id}
                                className="p-4 border border-border rounded-lg"
                            >
                                <div className="flex items-center justify-between mb-3">
                                    <h3 className="font-semibold capitalize">
                                        {service.service_name}
                                    </h3>
                                    <StatusBadge status={service.status} />
                                </div>
                                
                                {service.status_message && (
                                    <p className="text-sm text-muted-foreground mb-3">
                                        {service.status_message}
                                    </p>
                                )}
                                
                                <div className="space-y-1 text-xs text-muted-foreground">
                                    {service.response_time_ms !== undefined && (
                                        <div className="flex justify-between">
                                            <span>Response Time:</span>
                                            <span>{service.response_time_ms}ms</span>
                                        </div>
                                    )}
                                    {service.error_rate !== undefined && (
                                        <div className="flex justify-between">
                                            <span>Error Rate:</span>
                                            <span>{(service.error_rate * 100).toFixed(2)}%</span>
                                        </div>
                                    )}
                                    <div className="flex justify-between">
                                        <span>Last Check:</span>
                                        <span>{getTimeAgo(service.last_check_at)}</span>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </Grid>
                </CardBody>
            </Card>

            {/* Info Footer */}
            <div className="mt-8 text-center text-sm text-muted-foreground">
                <p>Status updates automatically every 30 seconds</p>
                <p className="mt-2">
                    For detailed history, visit{' '}
                    <a href="/api/v1/status/history?timeframe=24h" className="text-primary hover:underline">
                        24h history
                    </a>{' '}
                    or{' '}
                    <a href="/api/v1/status/history?timeframe=168h" className="text-primary hover:underline">
                        7d history
                    </a>
                </p>
            </div>
        </Container>
    );
}
