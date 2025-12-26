/**
 * K6 HTML Reporter Configuration
 * 
 * This module provides a handleSummary function that generates HTML reports.
 * Import this in your test scenarios to enable HTML output.
 * 
 * Usage in test scenarios:
 * 
 * import { simpleHtmlReport } from '../config/html-reporter.js';
 * 
 * export function handleSummary(data) {
 *     return simpleHtmlReport(data, 'ScenarioName');
 * }
 */

import { textSummary } from "https://jslib.k6.io/k6-summary/0.0.1/index.js";

/**
 * Generate HTML and JSON reports from k6 test results
 * This generates a standalone HTML report without external dependencies
 */
export function simpleHtmlReport(data, testName) {
    const timestamp = new Date().toISOString();
    const reportDir = __ENV.REPORT_DIR || 'backend/tests/load/reports';
    
    const htmlFileName = `${reportDir}/${testName}_${timestamp.replace(/[:.]/g, '-')}.html`;
    const jsonFileName = `${reportDir}/${testName}_${timestamp.replace(/[:.]/g, '-')}.json`;
    
    // Extract key metrics
    const metrics = data.metrics;
    const httpReqDuration = metrics.http_req_duration;
    const httpReqFailed = metrics.http_req_failed;
    const httpReqs = metrics.http_reqs;
    const checks = metrics.checks;
    const iterations = metrics.iterations;
    
    // Generate HTML report
    const html = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>K6 Load Test Report - ${testName}</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            line-height: 1.6;
            color: #333;
            background: #f5f5f5;
            padding: 20px;
        }
        .container { max-width: 1200px; margin: 0 auto; }
        header {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 30px;
            border-radius: 10px;
            margin-bottom: 30px;
            box-shadow: 0 4px 6px rgba(0,0,0,0.1);
        }
        header h1 { font-size: 32px; margin-bottom: 10px; }
        header p { opacity: 0.9; font-size: 14px; }
        .metrics-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
            gap: 20px;
            margin-bottom: 30px;
        }
        .metric-card {
            background: white;
            padding: 25px;
            border-radius: 10px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
            transition: transform 0.2s;
        }
        .metric-card:hover { transform: translateY(-2px); }
        .metric-card h3 {
            color: #667eea;
            font-size: 14px;
            text-transform: uppercase;
            margin-bottom: 15px;
            font-weight: 600;
        }
        .metric-value {
            font-size: 36px;
            font-weight: 700;
            color: #333;
            margin-bottom: 10px;
        }
        .metric-label { color: #666; font-size: 14px; }
        .metric-sub {
            display: flex;
            justify-content: space-between;
            margin-top: 15px;
            padding-top: 15px;
            border-top: 1px solid #eee;
            font-size: 13px;
        }
        .metric-sub span { color: #666; }
        .metric-sub strong { color: #333; }
        .status-passed { color: #10b981; }
        .status-failed { color: #ef4444; }
        .details-table {
            background: white;
            border-radius: 10px;
            padding: 25px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
            overflow-x: auto;
        }
        table {
            width: 100%;
            border-collapse: collapse;
        }
        th {
            background: #f9fafb;
            padding: 12px;
            text-align: left;
            font-weight: 600;
            color: #667eea;
            font-size: 13px;
            text-transform: uppercase;
        }
        td {
            padding: 12px;
            border-bottom: 1px solid #eee;
        }
        tr:last-child td { border-bottom: none; }
        .footer {
            text-align: center;
            margin-top: 40px;
            padding: 20px;
            color: #666;
            font-size: 14px;
        }
    </style>
</head>
<body>
    <div class="container">
        <header>
            <h1>📊 ${testName} - Load Test Report</h1>
            <p>Generated: ${timestamp}</p>
            <p>Duration: ${data.state.testRunDurationMs / 1000}s</p>
        </header>

        <div class="metrics-grid">
            <div class="metric-card">
                <h3>Response Time (p95)</h3>
                <div class="metric-value">${httpReqDuration.values['p(95)'].toFixed(2)}ms</div>
                <div class="metric-label">95th Percentile</div>
                <div class="metric-sub">
                    <span>p50: <strong>${httpReqDuration.values['p(50)'].toFixed(2)}ms</strong></span>
                    <span>p99: <strong>${httpReqDuration.values['p(99)'].toFixed(2)}ms</strong></span>
                </div>
            </div>

            <div class="metric-card">
                <h3>Error Rate</h3>
                <div class="metric-value ${httpReqFailed.values.rate < 0.05 ? 'status-passed' : 'status-failed'}">
                    ${(httpReqFailed.values.rate * 100).toFixed(2)}%
                </div>
                <div class="metric-label">Failed Requests</div>
                <div class="metric-sub">
                    <span>Failed: <strong>${httpReqFailed.values.passes || 0}</strong></span>
                    <span>Total: <strong>${httpReqs.values.count}</strong></span>
                </div>
            </div>

            <div class="metric-card">
                <h3>Throughput</h3>
                <div class="metric-value">${httpReqs.values.rate.toFixed(2)}</div>
                <div class="metric-label">Requests per Second</div>
                <div class="metric-sub">
                    <span>Total Requests: <strong>${httpReqs.values.count}</strong></span>
                </div>
            </div>

            <div class="metric-card">
                <h3>Checks</h3>
                <div class="metric-value ${checks.values.rate > 0.95 ? 'status-passed' : 'status-failed'}">
                    ${(checks.values.rate * 100).toFixed(2)}%
                </div>
                <div class="metric-label">Success Rate</div>
                <div class="metric-sub">
                    <span>Passed: <strong>${checks.values.passes || 0}</strong></span>
                    <span>Failed: <strong>${checks.values.fails || 0}</strong></span>
                </div>
            </div>

            <div class="metric-card">
                <h3>Virtual Users</h3>
                <div class="metric-value">${metrics.vus_max.values.max}</div>
                <div class="metric-label">Max Concurrent Users</div>
                <div class="metric-sub">
                    <span>Iterations: <strong>${iterations.values.count}</strong></span>
                </div>
            </div>

            <div class="metric-card">
                <h3>Avg Response Time</h3>
                <div class="metric-value">${httpReqDuration.values.avg.toFixed(2)}ms</div>
                <div class="metric-label">Mean Duration</div>
                <div class="metric-sub">
                    <span>Min: <strong>${httpReqDuration.values.min.toFixed(2)}ms</strong></span>
                    <span>Max: <strong>${httpReqDuration.values.max.toFixed(2)}ms</strong></span>
                </div>
            </div>
        </div>

        <div class="details-table">
            <h2 style="margin-bottom: 20px; color: #667eea;">📈 Detailed Metrics</h2>
            <table>
                <thead>
                    <tr>
                        <th>Metric</th>
                        <th>Average</th>
                        <th>Min</th>
                        <th>Median</th>
                        <th>Max</th>
                        <th>p90</th>
                        <th>p95</th>
                        <th>p99</th>
                    </tr>
                </thead>
                <tbody>
                    <tr>
                        <td><strong>HTTP Request Duration</strong></td>
                        <td>${httpReqDuration.values.avg.toFixed(2)}ms</td>
                        <td>${httpReqDuration.values.min.toFixed(2)}ms</td>
                        <td>${httpReqDuration.values.med.toFixed(2)}ms</td>
                        <td>${httpReqDuration.values.max.toFixed(2)}ms</td>
                        <td>${httpReqDuration.values['p(90)'].toFixed(2)}ms</td>
                        <td>${httpReqDuration.values['p(95)'].toFixed(2)}ms</td>
                        <td>${httpReqDuration.values['p(99)'].toFixed(2)}ms</td>
                    </tr>
                </tbody>
            </table>
        </div>

        <div class="footer">
            <p>Generated by k6 Load Testing Framework</p>
            <p>Clipper Performance Testing Suite</p>
        </div>
    </div>
</body>
</html>`;
    
    return {
        [htmlFileName]: html,
        [jsonFileName]: JSON.stringify(data, null, 2),
        'stdout': textSummary(data, { indent: ' ', enableColors: true }),
    };
}
