#!/bin/bash

# Exit on error
set -e

# Load environment variables
source .env.production

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
NC='\033[0m'

# Function to check endpoint health
check_endpoint() {
    local endpoint=$1
    local expected_status=$2
    local response
    local status

    echo "Checking $endpoint..."
    
    response=$(curl -s -o /dev/null -w "%{http_code}" "$endpoint")
    status=$?

    if [ $status -ne 0 ]; then
        echo -e "${RED}Failed to connect to $endpoint${NC}"
        return 1
    fi

    if [ "$response" != "$expected_status" ]; then
        echo -e "${RED}Unexpected status code: $response (expected $expected_status)${NC}"
        return 1
    fi

    echo -e "${GREEN}$endpoint is healthy${NC}"
    return 0
}

# Function to check SSL certificate
check_ssl() {
    local domain=$1
    local days_warning=30
    local expiry
    
    echo "Checking SSL certificate for $domain..."
    
    expiry=$(openssl s_client -connect "$domain:443" -servername "$domain" </dev/null 2>/dev/null | openssl x509 -enddate -noout | cut -d= -f2)
    expiry_epoch=$(date -d "$expiry" +%s)
    now_epoch=$(date +%s)
    days_left=$(( ($expiry_epoch - $now_epoch) / 86400 ))

    if [ $days_left -lt $days_warning ]; then
        echo -e "${RED}SSL certificate for $domain will expire in $days_left days${NC}"
        return 1
    fi

    echo -e "${GREEN}SSL certificate is valid for $days_left days${NC}"
    return 0
}

# Function to check CDN
check_cdn() {
    local cdn_url=$1
    local test_file="static/js/main.js"
    
    echo "Checking CDN..."
    
    response=$(curl -s -o /dev/null -w "%{http_code}" "$cdn_url/$test_file")
    
    if [ "$response" != "200" ]; then
        echo -e "${RED}CDN check failed: $response${NC}"
        return 1
    fi

    echo -e "${GREEN}CDN is healthy${NC}"
    return 0
}

# Function to check database connection
check_database() {
    echo "Checking database connection..."
    
    if npm run db:check > /dev/null 2>&1; then
        echo -e "${GREEN}Database connection is healthy${NC}"
        return 0
    else
        echo -e "${RED}Database connection failed${NC}"
        return 1
    fi
}

# Function to check memory usage
check_memory() {
    local memory_threshold=90
    local memory_usage
    
    echo "Checking memory usage..."
    
    memory_usage=$(free | grep Mem | awk '{print int($3/$2 * 100)}')
    
    if [ "$memory_usage" -gt "$memory_threshold" ]; then
        echo -e "${RED}High memory usage: $memory_usage%${NC}"
        return 1
    fi

    echo -e "${GREEN}Memory usage is normal: $memory_usage%${NC}"
    return 0
}

# Function to check disk space
check_disk() {
    local disk_threshold=90
    local disk_usage
    
    echo "Checking disk space..."
    
    disk_usage=$(df -h / | tail -1 | awk '{print int($5)}')
    
    if [ "$disk_usage" -gt "$disk_threshold" ]; then
        echo -e "${RED}High disk usage: $disk_usage%${NC}"
        return 1
    fi

    echo -e "${GREEN}Disk usage is normal: $disk_usage%${NC}"
    return 0
}

# Main health check
echo "Starting health checks..."
echo "------------------------"

failures=0

# Check main application endpoints
check_endpoint "$REACT_APP_API_URL/health" "200" || ((failures++))
check_endpoint "$REACT_APP_API_URL/v1/status" "200" || ((failures++))

# Check SSL certificates
check_ssl "$(echo $REACT_APP_API_URL | cut -d/ -f3)" || ((failures++))

# Check CDN
check_cdn "$REACT_APP_CDN_URL" || ((failures++))

# Check database
check_database || ((failures++))

# Check system resources
check_memory || ((failures++))
check_disk || ((failures++))

echo "------------------------"
echo "Health check completed."

if [ $failures -eq 0 ]; then
    echo -e "${GREEN}All systems are healthy!${NC}"
    exit 0
else
    echo -e "${RED}$failures check(s) failed!${NC}"
    exit 1
fi
