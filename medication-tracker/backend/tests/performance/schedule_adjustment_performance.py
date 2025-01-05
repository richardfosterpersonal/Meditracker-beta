import time
import pytest
import random
from datetime import datetime, timedelta
from typing import List, Dict
from app.services.schedule_adjustment import ScheduleAdjustment
from app.models.medication import Medication
from app.models.schedule import Schedule

def generate_test_schedules(num_medications: int) -> List[Dict]:
    """Generate test schedules for performance testing."""
    schedules = []
    base_time = datetime.now().replace(hour=8, minute=0, second=0, microsecond=0)
    
    for i in range(num_medications):
        intervals = [4, 6, 8, 12, 24]
        schedule = {
            'medication_id': f'med_{i}',
            'name': f'Medication {i}',
            'start_time': (base_time + timedelta(minutes=random.randint(0, 720))).isoformat(),
            'interval_hours': random.choice(intervals),
            'priority': random.randint(1, 5)
        }
        schedules.append(schedule)
    return schedules

def measure_execution_time(func):
    """Decorator to measure function execution time."""
    def wrapper(*args, **kwargs):
        start_time = time.perf_counter()
        result = func(*args, **kwargs)
        end_time = time.perf_counter()
        execution_time = (end_time - start_time) * 1000  # Convert to milliseconds
        return result, execution_time
    return wrapper

@measure_execution_time
def run_conflict_check(schedule_adjustment: ScheduleAdjustment, schedules: List[Dict]):
    """Run conflict check and return results."""
    return schedule_adjustment.check_conflicts(schedules)

@measure_execution_time
def run_suggestion_generation(schedule_adjustment: ScheduleAdjustment, conflicts: List[Dict]):
    """Generate suggestions for conflicts."""
    return schedule_adjustment.generate_suggestions(conflicts)

class TestScheduleAdjustmentPerformance:
    @pytest.mark.parametrize("num_medications", [10, 50, 100, 500])
    def test_conflict_detection_performance(self, num_medications):
        """Test performance of conflict detection with varying numbers of medications."""
        schedules = generate_test_schedules(num_medications)
        schedule_adjustment = ScheduleAdjustment()
        
        results, execution_time = run_conflict_check(schedule_adjustment, schedules)
        
        print(f"\nConflict Detection Performance (n={num_medications}):")
        print(f"Execution time: {execution_time:.2f}ms")
        print(f"Conflicts found: {len(results)}")
        
        # Performance assertions
        assert execution_time < num_medications * 2, f"Conflict detection took too long: {execution_time}ms"

    @pytest.mark.parametrize("num_conflicts", [5, 20, 50, 100])
    def test_suggestion_generation_performance(self, num_conflicts):
        """Test performance of suggestion generation with varying numbers of conflicts."""
        schedules = generate_test_schedules(num_conflicts * 2)  # Generate more schedules to ensure conflicts
        schedule_adjustment = ScheduleAdjustment()
        
        conflicts, _ = run_conflict_check(schedule_adjustment, schedules)
        conflicts = conflicts[:num_conflicts]  # Take only the number we want to test
        
        suggestions, execution_time = run_suggestion_generation(schedule_adjustment, conflicts)
        
        print(f"\nSuggestion Generation Performance (n={num_conflicts}):")
        print(f"Execution time: {execution_time:.2f}ms")
        print(f"Suggestions generated: {len(suggestions)}")
        
        # Performance assertions
        assert execution_time < num_conflicts * 5, f"Suggestion generation took too long: {execution_time}ms"

    def test_memory_usage(self):
        """Test memory usage during schedule processing."""
        import psutil
        import os
        
        process = psutil.Process(os.getpid())
        initial_memory = process.memory_info().rss / 1024 / 1024  # Convert to MB
        
        # Generate a large number of schedules
        schedules = generate_test_schedules(1000)
        schedule_adjustment = ScheduleAdjustment()
        
        # Run operations
        conflicts, _ = run_conflict_check(schedule_adjustment, schedules)
        suggestions, _ = run_suggestion_generation(schedule_adjustment, conflicts)
        
        final_memory = process.memory_info().rss / 1024 / 1024
        memory_increase = final_memory - initial_memory
        
        print(f"\nMemory Usage Test:")
        print(f"Initial memory: {initial_memory:.2f}MB")
        print(f"Final memory: {final_memory:.2f}MB")
        print(f"Memory increase: {memory_increase:.2f}MB")
        
        # Memory usage assertions
        assert memory_increase < 100, f"Memory usage increased too much: {memory_increase:.2f}MB"

    @pytest.mark.parametrize("scenario", ["worst_case", "average_case", "best_case"])
    def test_algorithm_complexity(self, scenario):
        """Test algorithm complexity under different scenarios."""
        if scenario == "worst_case":
            # All medications conflict
            schedules = generate_test_schedules(50)
            for schedule in schedules:
                schedule['start_time'] = datetime.now().isoformat()
        elif scenario == "average_case":
            # Random distribution of schedules
            schedules = generate_test_schedules(50)
        else:  # best_case
            # No conflicts
            schedules = generate_test_schedules(50)
            base_time = datetime.now()
            for i, schedule in enumerate(schedules):
                schedule['start_time'] = (base_time + timedelta(hours=i*4)).isoformat()
        
        schedule_adjustment = ScheduleAdjustment()
        conflicts, execution_time = run_conflict_check(schedule_adjustment, schedules)
        
        print(f"\nAlgorithm Complexity - {scenario}:")
        print(f"Execution time: {execution_time:.2f}ms")
        print(f"Conflicts found: {len(conflicts)}")
        
        # Complexity assertions based on scenario
        if scenario == "worst_case":
            assert execution_time < 1000, "Worst case performance is too slow"
        elif scenario == "average_case":
            assert execution_time < 500, "Average case performance is too slow"
        else:
            assert execution_time < 200, "Best case performance is too slow"
