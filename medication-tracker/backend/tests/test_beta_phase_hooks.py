"""
Beta Phase Hooks Test Suite
Tests for beta phase transition hooks
Last Updated: 2024-12-30T22:08:13+01:00
"""

import pytest
import os
import json
from datetime import datetime
import asyncio
from typing import Dict
from unittest.mock import Mock, patch

from app.core.beta_phase_hooks import BetaPhaseHooks, HookType
from app.core.settings import settings

@pytest.fixture
async def hooks():
    """Beta phase hooks fixture"""
    return BetaPhaseHooks()

class TestBetaPhaseHooks:
    """Test beta phase transition hooks"""
    
    @pytest.mark.asyncio
    async def test_hook_registration(self, hooks):
        """Test hook registration"""
        # Test callback
        async def test_callback(context):
            return {"test": "success"}
            
        # Register hook
        phase = "internal"
        hook_type = HookType.PRE_TRANSITION
        hooks.register_hook(phase, hook_type, test_callback, priority=1)
        
        # Assert
        assert len(hooks._hooks[phase][hook_type]) == 1
        assert hooks._hooks[phase][hook_type][0]["priority"] == 1
        assert hooks._hooks[phase][hook_type][0]["callback"] == test_callback
        
    @pytest.mark.asyncio
    async def test_hook_execution(self, hooks):
        """Test hook execution"""
        # Test callbacks
        async def success_callback(context):
            return {"status": "success"}
            
        async def failure_callback(context):
            raise Exception("Test error")
            
        # Register hooks
        phase = "internal"
        hook_type = HookType.VALIDATION
        hooks.register_hook(phase, hook_type, success_callback, priority=1)
        hooks.register_hook(phase, hook_type, failure_callback, priority=0)
        
        # Execute hooks
        context = {"test": "context"}
        results = await hooks.execute_hooks(phase, hook_type, context)
        
        # Assert
        assert "success" in results
        assert "results" in results
        assert len(results["results"]) == 2
        assert results["results"][0]["success"] == True
        assert results["results"][1]["success"] == False
        
    @pytest.mark.asyncio
    async def test_phase_transition(self, hooks):
        """Test phase transition with hooks"""
        # Initialize orchestrator
        await hooks.orchestrator.initialize_critical_path()
        
        # Test callbacks
        async def pre_transition(context):
            return {"pre": "success"}
            
        async def post_transition(context):
            return {"post": "success"}
            
        # Register hooks
        current_phase = list(settings.BETA_PHASES.keys())[0]
        next_phase = list(settings.BETA_PHASES.keys())[1]
        
        hooks.register_hook(
            current_phase,
            HookType.PRE_TRANSITION,
            pre_transition
        )
        hooks.register_hook(
            next_phase,
            HookType.POST_TRANSITION,
            post_transition
        )
        
        # Perform transition
        result = await hooks.transition_phase(current_phase, next_phase)
        
        # Assert
        assert result["success"] == True
        assert "transition" in result
        assert "pre_hooks" in result
        assert "post_hooks" in result
        
    @pytest.mark.asyncio
    async def test_validation_with_hooks(self, hooks):
        """Test validation with hooks"""
        # Initialize orchestrator
        await hooks.orchestrator.initialize_critical_path()
        
        # Test callback
        async def validation_callback(context):
            return {"validation": "success"}
            
        # Register hook
        phase = list(settings.BETA_PHASES.keys())[0]
        hooks.register_hook(
            phase,
            HookType.VALIDATION,
            validation_callback
        )
        
        # Perform validation
        result = await hooks.validate_with_hooks(phase)
        
        # Assert
        assert "success" in result
        assert "hook_validation" in result
        assert "orchestrator_validation" in result
        
    @pytest.mark.asyncio
    async def test_error_handling(self, hooks):
        """Test error handling in hooks"""
        # Test callbacks
        async def error_callback(context):
            raise Exception("Test error")
            
        async def error_handler(context):
            return {"handled": True}
            
        # Register hooks
        phase = "internal"
        hooks.register_hook(
            phase,
            HookType.VALIDATION,
            error_callback
        )
        hooks.register_hook(
            phase,
            HookType.ERROR,
            error_handler
        )
        
        # Execute hooks
        context = {"test": "context"}
        results = await hooks.execute_hooks(
            phase,
            HookType.VALIDATION,
            context
        )
        
        # Assert
        assert results["success"] == False
        assert len(results["results"]) == 1
        assert results["results"][0]["success"] == False
        
    @pytest.mark.asyncio
    async def test_notification_groups(self, hooks):
        """Test notification group initialization"""
        # Get notification groups
        groups = hooks._notification_groups
        
        # Assert
        assert "developers" in groups
        assert "testers" in groups
        assert "managers" in groups
        assert "stakeholders" in groups
        assert all(isinstance(group, list) for group in groups.values())
        
    @pytest.mark.asyncio
    async def test_stakeholder_notification(self, hooks):
        """Test stakeholder notification"""
        # Mock notification sender
        with patch.object(hooks.notification_sender, 'send_notification') as mock_send:
            mock_send.return_value = asyncio.Future()
            mock_send.return_value.set_result(True)
            
            # Test context
            context = {
                "current_phase": "internal",
                "next_phase": "limited",
                "transition_result": {"success": True},
                "timestamp": datetime.utcnow().isoformat()
            }
            
            # Send notifications
            await hooks._notify_stakeholders(
                context["current_phase"],
                context["next_phase"],
                context["transition_result"]
            )
            
            # Assert
            assert mock_send.call_count == 4  # One for each group
            
    @pytest.mark.asyncio
    async def test_message_generation(self, hooks):
        """Test message generation for different groups"""
        # Test context
        context = {
            "current_phase": "internal",
            "next_phase": "limited",
            "transition_result": {"success": True},
            "timestamp": datetime.utcnow().isoformat()
        }
        
        # Generate messages
        dev_msg = hooks._generate_developer_message(context)
        tester_msg = hooks._generate_tester_message(context)
        manager_msg = hooks._generate_manager_message(context)
        stakeholder_msg = hooks._generate_stakeholder_message(context)
        
        # Assert
        assert all(isinstance(msg, str) for msg in [
            dev_msg,
            tester_msg,
            manager_msg,
            stakeholder_msg
        ])
        assert all(len(msg) > 0 for msg in [
            dev_msg,
            tester_msg,
            manager_msg,
            stakeholder_msg
        ])
        
    @pytest.mark.asyncio
    async def test_concurrent_hook_execution(self, hooks):
        """Test concurrent hook execution"""
        # Test callbacks
        async def slow_callback(context):
            await asyncio.sleep(0.1)
            return {"slow": "success"}
            
        async def fast_callback(context):
            return {"fast": "success"}
            
        # Register hooks
        phase = "internal"
        hook_type = HookType.VALIDATION
        hooks.register_hook(phase, hook_type, slow_callback)
        hooks.register_hook(phase, hook_type, fast_callback)
        
        # Execute hooks concurrently
        tasks = [
            hooks.execute_hooks(phase, hook_type, {"test": "context"})
            for _ in range(5)
        ]
        
        results = await asyncio.gather(*tasks)
        
        # Assert
        assert len(results) == 5
        assert all(r["success"] for r in results)
        assert all(len(r["results"]) == 2 for r in results)
