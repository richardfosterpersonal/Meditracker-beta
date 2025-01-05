#!/bin/bash

# Exit on error
set -e

echo "Running monitoring system tests..."

# Test Prometheus metrics
echo "Testing Prometheus metrics collection..."
curl -s "http://localhost:9090/api/v1/query?query=up" | grep -q '"status":"success"' && \
  echo "✓ Prometheus is collecting metrics" || \
  echo "✗ Prometheus metrics collection failed"

# Test Grafana dashboards
echo "Testing Grafana dashboards..."
curl -s "http://localhost:3000/api/health" | grep -q '"database":"ok"' && \
  echo "✓ Grafana dashboards are accessible" || \
  echo "✗ Grafana dashboard access failed"

# Test Elasticsearch indices
echo "Testing Elasticsearch indices..."
curl -s "http://localhost:9200/_cat/indices?v" | grep -q "medication-tracker" && \
  echo "✓ Elasticsearch indices are created" || \
  echo "✗ Elasticsearch indices not found"

# Test Kibana
echo "Testing Kibana status..."
curl -s "http://localhost:5601/api/status" | grep -q '"status":{"overall":{"level":"available"}}' && \
  echo "✓ Kibana is available" || \
  echo "✗ Kibana is not available"

# Test alert rules
echo "Testing Prometheus alert rules..."
curl -s "http://localhost:9090/api/v1/rules" | grep -q "medication-tracker" && \
  echo "✓ Alert rules are configured" || \
  echo "✗ Alert rules not found"

# Test metrics collection
echo "Testing application metrics..."
curl -s "http://localhost:3000/metrics" | grep -q "http_requests_total" && \
  echo "✓ Application metrics are being collected" || \
  echo "✗ Application metrics collection failed"

# Test log shipping
echo "Testing log shipping to ELK..."
kubectl logs -n monitoring -l app=logstash --tail=1 | grep -q "medication-tracker" && \
  echo "✓ Logs are being shipped to ELK" || \
  echo "✗ Log shipping failed"

echo "Monitoring system tests complete!"
