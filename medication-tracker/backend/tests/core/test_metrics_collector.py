"""
Metrics Collector Tests
Maintains critical path alignment and validation chain
Last Updated: 2024-12-24T21:37:30+01:00
"""
import pytest
from datetime import datetime
from unittest.mock import Mock, patch
from pathlib import Path

from app.core.metrics_collector import (
    MetricsCollector,
    MetricType,
    MetricCategory
)
from app.core.validation_types import ValidationResult

@pytest.fixture
def mock_evidence_collector():
    return Mock()

@pytest.fixture
def metrics_collector(tmp_path, mock_evidence_collector):
    metrics_dir = tmp_path / "metrics"
    return MetricsCollector(
        evidence_collector=mock_evidence_collector,
        metrics_dir=str(metrics_dir)
    )

@pytest.mark.asyncio
async def test_collect_metric_success(metrics_collector):
    """Test successful metric collection"""
    metric_name = "test_metric"
    metric_type = MetricType.COUNTER
    category = MetricCategory.PERFORMANCE
    value = 1.0
    labels = {"env": "test"}
    evidence = {"source": "test"}

    result = await metrics_collector.collect_metric(
        metric_name=metric_name,
        metric_type=metric_type,
        category=category,
        value=value,
        labels=labels,
        evidence=evidence
    )

    assert result.is_valid
    assert result.timestamp is not None
    assert metric_name in metrics_collector.metrics
    assert metrics_collector.metrics[metric_name]["type"] == metric_type.value
    assert metrics_collector.metrics[metric_name]["category"] == category.value

@pytest.mark.asyncio
async def test_collect_metric_invalid_value(metrics_collector):
    """Test metric collection with invalid value"""
    result = await metrics_collector.collect_metric(
        metric_name="test_metric",
        metric_type=MetricType.COUNTER,
        category=MetricCategory.PERFORMANCE,
        value="invalid",  # Invalid value type
        labels={},
        evidence={}
    )

    assert not result.is_valid
    assert "numeric" in result.error.lower()

@pytest.mark.asyncio
async def test_collect_metric_invalid_labels(metrics_collector):
    """Test metric collection with invalid labels"""
    result = await metrics_collector.collect_metric(
        metric_name="test_metric",
        metric_type=MetricType.COUNTER,
        category=MetricCategory.PERFORMANCE,
        value=1.0,
        labels="invalid",  # Invalid labels type
        evidence={}
    )

    assert not result.is_valid
    assert "dictionary" in result.error.lower()

@pytest.mark.asyncio
async def test_get_metric_success(metrics_collector):
    """Test successful metric retrieval"""
    # First collect a metric
    metric_name = "test_metric"
    await metrics_collector.collect_metric(
        metric_name=metric_name,
        metric_type=MetricType.COUNTER,
        category=MetricCategory.PERFORMANCE,
        value=1.0,
        labels={"env": "test"},
        evidence={}
    )

    # Then retrieve it
    result = await metrics_collector.get_metric(metric_name)

    assert result.is_valid
    assert result.data["name"] == metric_name
    assert result.data["type"] == MetricType.COUNTER.value
    assert result.data["category"] == MetricCategory.PERFORMANCE.value
    assert len(result.data["values"]) == 1

@pytest.mark.asyncio
async def test_get_metric_with_filters(metrics_collector):
    """Test metric retrieval with time and label filters"""
    metric_name = "test_metric"
    
    # Collect metrics with different timestamps and labels
    await metrics_collector.collect_metric(
        metric_name=metric_name,
        metric_type=MetricType.COUNTER,
        category=MetricCategory.PERFORMANCE,
        value=1.0,
        labels={"env": "test1"},
        evidence={}
    )
    
    await metrics_collector.collect_metric(
        metric_name=metric_name,
        metric_type=MetricType.COUNTER,
        category=MetricCategory.PERFORMANCE,
        value=2.0,
        labels={"env": "test2"},
        evidence={}
    )

    # Test label filter
    result = await metrics_collector.get_metric(
        metric_name=metric_name,
        labels={"env": "test1"}
    )

    assert result.is_valid
    assert len(result.data["values"]) == 1
    assert result.data["values"][0]["value"] == 1.0

@pytest.mark.asyncio
async def test_get_metrics_summary(metrics_collector):
    """Test metrics summary generation"""
    # Collect multiple metrics
    await metrics_collector.collect_metric(
        metric_name="metric1",
        metric_type=MetricType.COUNTER,
        category=MetricCategory.PERFORMANCE,
        value=1.0,
        labels={},
        evidence={}
    )
    
    await metrics_collector.collect_metric(
        metric_name="metric2",
        metric_type=MetricType.GAUGE,
        category=MetricCategory.RELIABILITY,
        value=2.0,
        labels={},
        evidence={}
    )

    # Get summary for all metrics
    result = await metrics_collector.get_metrics_summary()

    assert result.is_valid
    assert len(result.data) == 2
    assert "metric1" in result.data
    assert "metric2" in result.data
    assert result.data["metric1"]["latest_value"] == 1.0
    assert result.data["metric2"]["latest_value"] == 2.0

@pytest.mark.asyncio
async def test_get_metrics_summary_with_category(metrics_collector):
    """Test metrics summary filtered by category"""
    # Collect metrics with different categories
    await metrics_collector.collect_metric(
        metric_name="metric1",
        metric_type=MetricType.COUNTER,
        category=MetricCategory.PERFORMANCE,
        value=1.0,
        labels={},
        evidence={}
    )
    
    await metrics_collector.collect_metric(
        metric_name="metric2",
        metric_type=MetricType.GAUGE,
        category=MetricCategory.RELIABILITY,
        value=2.0,
        labels={},
        evidence={}
    )

    # Get summary for performance metrics only
    result = await metrics_collector.get_metrics_summary(
        category=MetricCategory.PERFORMANCE
    )

    assert result.is_valid
    assert len(result.data) == 1
    assert "metric1" in result.data
    assert "metric2" not in result.data

@pytest.mark.asyncio
async def test_metrics_persistence(tmp_path, mock_evidence_collector):
    """Test metrics persistence across collector instances"""
    metrics_dir = tmp_path / "metrics"
    
    # Create first collector and add metric
    collector1 = MetricsCollector(
        evidence_collector=mock_evidence_collector,
        metrics_dir=str(metrics_dir)
    )
    
    await collector1.collect_metric(
        metric_name="test_metric",
        metric_type=MetricType.COUNTER,
        category=MetricCategory.PERFORMANCE,
        value=1.0,
        labels={},
        evidence={}
    )

    # Create second collector and verify metric exists
    collector2 = MetricsCollector(
        evidence_collector=mock_evidence_collector,
        metrics_dir=str(metrics_dir)
    )

    result = await collector2.get_metric("test_metric")
    assert result.is_valid
    assert len(result.data["values"]) == 1
    assert result.data["values"][0]["value"] == 1.0
