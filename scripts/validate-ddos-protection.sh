#!/bin/bash
# DDoS Protection Configuration Validator
# Usage: ./validate-ddos-protection.sh [environment]
# Environment: production or staging (default: production)

set -e

ENVIRONMENT="${1:-production}"
NAMESPACE="clipper-${ENVIRONMENT}"

echo "🔍 Validating DDoS Protection Configuration for ${ENVIRONMENT}..."
echo ""

# Check if kubectl is available
if ! command -v kubectl &> /dev/null; then
    echo "❌ kubectl not found. Please install kubectl."
    exit 1
fi

# Check if namespace exists
if ! kubectl get namespace "$NAMESPACE" &> /dev/null; then
    echo "⚠️  Namespace $NAMESPACE does not exist. This is expected if not yet deployed."
    echo "   Run: kubectl create namespace $NAMESPACE"
    echo ""
else
    echo "✅ Namespace $NAMESPACE exists"
fi

# Check ingress configuration
echo ""
echo "📋 Checking Ingress Configuration..."
if kubectl get ingress clipper-backend -n "$NAMESPACE" &> /dev/null; then
    echo "✅ Ingress clipper-backend exists in $NAMESPACE"
    
    # Check rate limiting annotations
    echo ""
    echo "🔍 Checking Rate Limiting Annotations..."
    
    ANNOTATIONS=$(kubectl get ingress clipper-backend -n "$NAMESPACE" -o jsonpath='{.metadata.annotations}')
    
    if echo "$ANNOTATIONS" | grep -q "limit-rps"; then
        LIMIT_RPS=$(kubectl get ingress clipper-backend -n "$NAMESPACE" -o jsonpath='{.metadata.annotations.nginx\.ingress\.kubernetes\.io/limit-rps}')
        echo "   ✅ Rate limit (req/s): $LIMIT_RPS"
    else
        echo "   ❌ Rate limit annotation not found"
    fi
    
    if echo "$ANNOTATIONS" | grep -q "limit-connections"; then
        LIMIT_CONN=$(kubectl get ingress clipper-backend -n "$NAMESPACE" -o jsonpath='{.metadata.annotations.nginx\.ingress\.kubernetes\.io/limit-connections}')
        echo "   ✅ Connection limit: $LIMIT_CONN"
    else
        echo "   ❌ Connection limit annotation not found"
    fi
    
    if echo "$ANNOTATIONS" | grep -q "enable-access-log"; then
        ENABLE_LOG=$(kubectl get ingress clipper-backend -n "$NAMESPACE" -o jsonpath='{.metadata.annotations.nginx\.ingress\.kubernetes\.io/enable-access-log}')
        echo "   ✅ Access logging: $ENABLE_LOG"
    else
        echo "   ❌ Access logging annotation not found"
    fi
else
    echo "⚠️  Ingress clipper-backend not found in $NAMESPACE"
    echo "   Run: kubectl apply -k infrastructure/k8s/overlays/$ENVIRONMENT"
fi

# Check ingress-nginx controller
echo ""
echo "📋 Checking Ingress-NGINX Controller..."
if kubectl get deployment ingress-nginx-controller -n ingress-nginx &> /dev/null; then
    echo "✅ Ingress-NGINX controller deployed"
    
    # Check if metrics are exposed
    if kubectl get svc ingress-nginx-controller-metrics -n ingress-nginx &> /dev/null; then
        echo "   ✅ Metrics service available"
    else
        echo "   ⚠️  Metrics service not found (optional)"
    fi
else
    echo "⚠️  Ingress-NGINX controller not found in ingress-nginx namespace"
    echo "   Install: helm install ingress-nginx ingress-nginx/ingress-nginx -n ingress-nginx"
fi

# Check Prometheus
echo ""
echo "📋 Checking Prometheus Configuration..."
if kubectl get deployment prometheus -n monitoring &> /dev/null; then
    echo "✅ Prometheus deployed"
    
    # Check if alert rules are loaded
    echo "   🔍 Checking DDoS alert rules..."
    if kubectl exec -n monitoring deployment/prometheus -- wget -q -O - http://localhost:9090/api/v1/rules 2>/dev/null | grep -q "clipper_ddos_alerts"; then
        echo "   ✅ DDoS alert rules loaded"
    else
        echo "   ❌ DDoS alert rules not found"
        echo "      Reload rules: kubectl rollout restart deployment/prometheus -n monitoring"
    fi
else
    echo "⚠️  Prometheus not found in monitoring namespace"
fi

# Check Grafana
echo ""
echo "📋 Checking Grafana Configuration..."
if kubectl get deployment grafana -n monitoring &> /dev/null; then
    echo "✅ Grafana deployed"
    echo "   📊 Import dashboard: monitoring/dashboards/ddos-traffic-analytics.json"
    echo "   🔗 Dashboard UID: ddos-traffic-analytics"
else
    echo "⚠️  Grafana not found in monitoring namespace"
fi

# Check AlertManager
echo ""
echo "📋 Checking AlertManager Configuration..."
if kubectl get deployment alertmanager -n monitoring &> /dev/null; then
    echo "✅ AlertManager deployed"
else
    echo "⚠️  AlertManager not found in monitoring namespace"
fi

# Summary
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📊 Summary"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "Environment: $ENVIRONMENT"
echo "Namespace: $NAMESPACE"
echo ""
echo "Next Steps:"
echo "1. Apply ingress configuration: kubectl apply -k infrastructure/k8s/overlays/$ENVIRONMENT"
echo "2. Reload Prometheus: kubectl rollout restart deployment/prometheus -n monitoring"
echo "3. Import Grafana dashboard: monitoring/dashboards/ddos-traffic-analytics.json"
echo "4. Review runbook: docs/operations/ddos-protection.md"
echo "5. Test rate limits: See runbook Testing & Validation section"
echo ""
echo "Documentation:"
echo "📖 DDoS Protection: docs/operations/ddos-protection.md"
echo "📖 WAF Protection: docs/operations/waf-protection.md"
echo "📊 Dashboard: http://grafana.clipper.app/d/ddos-traffic-analytics"
echo ""
