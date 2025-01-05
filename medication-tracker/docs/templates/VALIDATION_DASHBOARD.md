# Validation Dashboard
Last Updated: 2024-12-25T23:03:22+01:00

## Overview
This dashboard provides real-time insights into the project's validation status and scope health.

## Quick Stats
- **Total Files**: {{ total_files }}
- **Validation Coverage**: {{ validation_coverage }}%
- **Critical Path Changes**: {{ critical_path_changes }}
- **Recent Validations**: {{ recent_validations }}

## Critical Path Status
| Component | Status | Last Change | Health |
|-----------|--------|-------------|---------|
{% for component in critical_components %}
| {{ component.name }} | {{ component.status }} | {{ component.last_change }} | {{ component.health }} |
{% endfor %}

## Recent Validation Activities
| Date | Feature | Type | Status |
|------|---------|------|--------|
{% for activity in recent_activities %}
| {{ activity.date }} | {{ activity.feature }} | {{ activity.type }} | {{ activity.status }} |
{% endfor %}

## Validation Metrics
### Validation Times
```chart
{{ validation_time_chart }}
```

### Error Rates
```chart
{{ error_rate_chart }}
```

### Coverage Trends
```chart
{{ coverage_trend_chart }}
```

## Active Validations
| Feature | Owner | Status | Started |
|---------|--------|--------|----------|
{% for validation in active_validations %}
| {{ validation.feature }} | {{ validation.owner }} | {{ validation.status }} | {{ validation.started }} |
{% endfor %}

## Validation Queue
| Priority | Feature | Type | Requested |
|----------|---------|------|-----------|
{% for item in validation_queue %}
| {{ item.priority }} | {{ item.feature }} | {{ item.type }} | {{ item.requested }} |
{% endfor %}

## Health Indicators
### Critical Path Health
- 🟢 Stable Components: {{ stable_components }}
- 🟡 Components Needing Review: {{ review_components }}
- 🔴 Components Needing Attention: {{ attention_components }}

### Validation Health
- Average Validation Time: {{ avg_validation_time }}ms
- Validation Success Rate: {{ validation_success_rate }}%
- Documentation Coverage: {{ documentation_coverage }}%

## Recent Alerts
{% for alert in recent_alerts %}
- {{ alert.severity }} {{ alert.message }} ({{ alert.date }})
{% endfor %}

## Recommendations
{% for recommendation in recommendations %}
- {{ recommendation }}
{% endfor %}

## Action Items
{% for item in action_items %}
1. [ ] {{ item }}
{% endfor %}

## Notes
- Dashboard updates every 15 minutes
- Data sourced from validation metrics collector
- Charts show 7-day rolling averages
- Health indicators use ML-based analysis
