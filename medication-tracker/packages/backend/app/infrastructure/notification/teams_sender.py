"""Microsoft Teams notification sender"""

from typing import Dict, Any, List, Optional
import aiohttp
from app.config import Config
from .base_sender import NotificationSender

class TeamsSender(NotificationSender):
    """Microsoft Teams notification sender"""
    
    def __init__(self):
        """Initialize Teams sender"""
        super().__init__()
        self.webhook_url = Config.TEAMS_WEBHOOK_URL
        
    async def send_message(
        self,
        recipients: List[str],  # Teams channel webhook URLs
        content: str,
        attachments: Optional[List[Dict[str, Any]]] = None
    ) -> Dict[str, Any]:
        """Send a Teams message"""
        try:
            if not self._validate_recipients(recipients):
                return self._format_error_response("Invalid recipients")
                
            if not self._validate_content(content):
                return self._format_error_response("Invalid content")
                
            # Add environment prefix to message
            content = self._prepare_message(content)
            
            # Send to each recipient (webhook URL)
            results = []
            for webhook_url in recipients:
                payload = self._create_payload(content, attachments)
                result = await self._send_to_teams(webhook_url, payload)
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
            return await self._handle_send_error(e, "teams message")
            
    def _create_payload(
        self,
        content: str,
        attachments: Optional[List[Dict[str, Any]]] = None
    ) -> Dict[str, Any]:
        """Create Teams message payload"""
        payload = {
            "@type": "MessageCard",
            "@context": "http://schema.org/extensions",
            "summary": self.app_name,
            "themeColor": "0072C6",  # Microsoft Blue
            "title": self.app_name,
            "text": content,
        }
        
        if attachments:
            sections = self._format_attachments(attachments)
            if sections:
                payload["sections"] = sections
                
        return payload
        
    def _format_attachments(self, attachments: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """Format attachments for Teams API"""
        sections = []
        for attachment in attachments:
            section = {
                "activityTitle": attachment.get("title"),
                "activitySubtitle": attachment.get("subtitle"),
                "text": attachment.get("text"),
            }
            
            # Add facts if present
            if "fields" in attachment:
                facts = [{"name": f["title"], "value": f["value"]} for f in attachment["fields"]]
                if facts:
                    section["facts"] = facts
                    
            # Remove None values
            section = {k: v for k, v in section.items() if v is not None}
            if section:  # Only add non-empty sections
                sections.append(section)
                
        return sections
        
    async def _send_to_teams(self, webhook_url: str, payload: Dict[str, Any]) -> Dict[str, Any]:
        """Send message to Teams"""
        try:
            async with aiohttp.ClientSession() as session:
                async with session.post(webhook_url, json=payload) as response:
                    if response.status == 200:
                        return self._format_success_response(
                            webhook_url=webhook_url
                        )
                    else:
                        error_text = await response.text()
                        return self._format_error_response(
                            f"Teams API error: {error_text}"
                        )
                        
        except Exception as e:
            return self._format_error_response(str(e))
