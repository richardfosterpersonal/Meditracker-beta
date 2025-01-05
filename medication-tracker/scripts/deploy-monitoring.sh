#!/bin/bash

# Exit on error
set -e

echo "Deploying monitoring infrastructure..."

# Create monitoring namespace if it doesn't exist
kubectl create namespace monitoring --dry-run=client -o yaml | kubectl apply -f -

# Create ConfigMaps
echo "Creating ConfigMaps..."
kubectl create configmap prometheus-config \
  --from-file=../monitoring/prometheus/prometheus.yml \
  --from-file=../monitoring/prometheus/rules/ \
  -n monitoring --dry-run=client -o yaml | kubectl apply -f -

kubectl create configmap grafana-dashboards \
  --from-file=../monitoring/grafana/dashboards/ \
  -n monitoring --dry-run=client -o yaml | kubectl apply -f -

# Deploy monitoring components
echo "Deploying Prometheus..."
kubectl apply -f ../kubernetes/monitoring/prometheus.yaml

echo "Deploying Grafana..."
kubectl apply -f ../kubernetes/monitoring/grafana.yaml

echo "Deploying Elasticsearch..."
kubectl apply -f ../kubernetes/monitoring/elasticsearch.yaml

echo "Deploying Kibana..."
kubectl apply -f ../kubernetes/monitoring/kibana.yaml

# Wait for deployments
echo "Waiting for deployments to be ready..."
kubectl rollout status deployment/grafana -n monitoring
kubectl rollout status deployment/kibana -n monitoring
kubectl rollout status statefulset/prometheus -n monitoring
kubectl rollout status statefulset/elasticsearch -n monitoring

echo "Verifying monitoring endpoints..."
# Wait for services to be ready
sleep 30

# Get service endpoints
PROMETHEUS_ENDPOINT=$(kubectl get svc prometheus -n monitoring -o jsonpath='{.spec.clusterIP}'):9090
GRAFANA_ENDPOINT=$(kubectl get svc grafana -n monitoring -o jsonpath='{.spec.clusterIP}'):3000
ELASTICSEARCH_ENDPOINT=$(kubectl get svc elasticsearch -n monitoring -o jsonpath='{.spec.clusterIP}'):9200
KIBANA_ENDPOINT=$(kubectl get svc kibana -n monitoring -o jsonpath='{.spec.clusterIP}'):5601

# Test endpoints
echo "Testing Prometheus..." 
curl -s "$PROMETHEUS_ENDPOINT/api/v1/status/config" > /dev/null || echo "Prometheus not ready"

echo "Testing Grafana..."
curl -s "$GRAFANA_ENDPOINT/api/health" > /dev/null || echo "Grafana not ready"

echo "Testing Elasticsearch..."
curl -s "$ELASTICSEARCH_ENDPOINT/_cluster/health" > /dev/null || echo "Elasticsearch not ready"

echo "Testing Kibana..."
curl -s "$KIBANA_ENDPOINT/api/status" > /dev/null || echo "Kibana not ready"

echo "Monitoring deployment complete!"
