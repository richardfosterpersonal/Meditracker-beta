"""Slack notification sender"""

from typing import Dict, Any, List, Optional
import aiohttp
from app.config import Config
from .base_sender import NotificationSender

class SlackSender(NotificationSender):
    """Slack notification sender"""
    
    def __init__(self):
        """Initialize Slack sender"""
        super().__init__()
        self.webhook_url = Config.SLACK_WEBHOOK_URL
        self.default_channel = Config.SLACK_DEFAULT_CHANNEL
        self.bot_name = Config.SLACK_BOT_NAME or self.app_name
        
    async def send_message(
        self,
        recipients: List[str],  # Slack channel IDs or user IDs
        content: str,
        attachments: Optional[List[Dict[str, Any]]] = None,
        thread_ts: Optional[str] = None
    ) -> Dict[str, Any]:
        """Send a Slack message"""
        try:
            if not self._validate_recipients(recipients):
                return self._format_error_response("Invalid recipients")
                
            if not self._validate_content(content):
                return self._format_error_response("Invalid content")
                
            # Add environment prefix to message
            content = self._prepare_message(content)
            
            # Send to each recipient (channel/user)
            results = []
            for recipient in recipients:
                payload = self._create_payload(recipient, content, attachments, thread_ts)
                result = await self._send_to_slack(payload)
                results.append(result)
                
            # Check if any messages were sent successfully
            if any(r.get("success", False) for r in results):
                return self._format_success_response(
                    recipients=recipients,
                    results=results
                )
            else:
                return self._format_error_response(
                    "Failed to send to any recipients"
                )
                
        except Exception as e:
            return await self._handle_send_error(e, "slack message")
            
    def _create_payload(
        self,
        recipient: str,
        content: str,
        attachments: Optional[List[Dict[str, Any]]] = None,
        thread_ts: Optional[str] = None
    ) -> Dict[str, Any]:
        """Create Slack message payload"""
        payload = {
            "channel": recipient,
            "username": self.bot_name,
            "text": content,
        }
        
        if thread_ts:
            payload["thread_ts"] = thread_ts
            
        if attachments:
            payload["attachments"] = self._format_attachments(attachments)
            
        return payload
        
    def _format_attachments(self, attachments: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """Format attachments for Slack API"""
        formatted = []
        for attachment in attachments:
            slack_attachment = {
                "color": attachment.get("color", "#36a64f"),
                "title": attachment.get("title"),
                "text": attachment.get("text"),
                "fields": attachment.get("fields", []),
                "footer": attachment.get("footer"),
                "ts": attachment.get("ts")
            }
            
            # Remove None values
            slack_attachment = {k: v for k, v in slack_attachment.items() if v is not None}
            formatted.append(slack_attachment)
            
        return formatted
        
    async def _send_to_slack(self, payload: Dict[str, Any]) -> Dict[str, Any]:
        """Send message to Slack"""
        try:
            async with aiohttp.ClientSession() as session:
                async with session.post(self.webhook_url, json=payload) as response:
                    if response.status == 200:
                        return self._format_success_response(
                            channel=payload["channel"]
                        )
                    else:
                        error_text = await response.text()
                        return self._format_error_response(
                            f"Slack API error: {error_text}"
                        )
                        
        except Exception as e:
            return self._format_error_response(str(e))
