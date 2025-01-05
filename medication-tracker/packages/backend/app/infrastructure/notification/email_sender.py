from typing import Dict, Any, List, Optional
import aiosmtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from email.mime.application import MIMEApplication
import os
from app.config import Config
from .base_sender import NotificationSender

class EmailSender(NotificationSender):
    def __init__(self):
        super().__init__()
        self.smtp_host = Config.SMTP_HOST
        self.smtp_port = Config.SMTP_PORT
        self.smtp_user = Config.SMTP_USER
        self.smtp_password = Config.SMTP_PASSWORD
        self.from_email = Config.FROM_EMAIL

    async def send_message(
        self,
        recipients: List[str],
        subject: str,
        content: str,
        attachments: Optional[List[Dict[str, Any]]] = None
    ) -> Dict[str, Any]:
        """Send an email message to multiple recipients"""
        try:
            if not self._validate_recipients(recipients):
                return self._format_error_response("Invalid recipients")
            
            if not self._validate_content(content):
                return self._format_error_response("Invalid content")
            
            # Create message
            message = self._create_message(recipients, subject, content, attachments)
            
            # Send email
            async with aiosmtplib.SMTP(
                hostname=self.smtp_host,
                port=self.smtp_port,
                use_tls=True
            ) as smtp:
                await smtp.login(self.smtp_user, self.smtp_password)
                await smtp.send_message(message)
            
            return self._format_success_response(
                recipients=recipients,
                subject=subject
            )
            
        except Exception as e:
            return await self._handle_send_error(e, "email")

    def _create_message(
        self,
        recipients: List[str],
        subject: str,
        content: str,
        attachments: Optional[List[Dict[str, Any]]] = None
    ) -> MIMEMultipart:
        """Create email message with attachments"""
        message = MIMEMultipart("mixed")
        message["Subject"] = self._prepare_message(subject)
        message["From"] = self.from_email
        message["To"] = ", ".join(recipients)
        
        # Create message body
        body = MIMEMultipart("alternative")
        
        # Add plain text version
        text_part = MIMEText(content, "plain")
        body.attach(text_part)
        
        # Add HTML version
        html_content = self._create_html_content(content)
        html_part = MIMEText(html_content, "html")
        body.attach(html_part)
        
        message.attach(body)
        
        # Add attachments
        if attachments:
            for attachment in attachments:
                part = self._create_attachment(attachment)
                if part:
                    message.attach(part)
        
        return message

    def _create_html_content(self, content: str) -> str:
        """Create HTML version of the email content"""
        return f"""
        <html>
            <body>
                <div style="font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto;">
                    <div style="background-color: #f8f9fa; padding: 20px; border-radius: 5px;">
                        <div style="white-space: pre-wrap;">{content}</div>
                    </div>
                    <div style="margin-top: 20px; color: #6c757d; font-size: 12px;">
                        <p>This is an automated message from {self.app_name}.</p>
                        <p>Please do not reply to this email.</p>
                    </div>
                </div>
            </body>
        </html>
        """

    def _create_attachment(self, attachment: Dict[str, Any]) -> Optional[MIMEApplication]:
        """Create email attachment"""
        try:
            if "content" in attachment:
                # Create attachment from content
                part = MIMEApplication(
                    attachment["content"].encode("utf-8"),
                    _subtype=self._get_subtype(attachment["content_type"])
                )
            elif "filepath" in attachment:
                # Create attachment from file
                if not os.path.exists(attachment["filepath"]):
                    self.logger.warning(f"Attachment file not found: {attachment['filepath']}")
                    return None
                    
                with open(attachment["filepath"], "rb") as f:
                    part = MIMEApplication(
                        f.read(),
                        _subtype=self._get_subtype(attachment["content_type"])
                    )
            else:
                self.logger.warning("Invalid attachment format")
                return None
            
            # Add filename
            part.add_header(
                "Content-Disposition",
                "attachment",
                filename=attachment["filename"]
            )
            
            return part
            
        except Exception as e:
            self.logger.error(f"Failed to create attachment: {str(e)}")
            return None

    def _get_subtype(self, content_type: str) -> str:
        """Get MIME subtype from content type"""
        try:
            return content_type.split("/")[1]
        except:
            return "octet-stream"
