from jinja2 import Template, Environment, BaseLoader
from datetime import datetime

class EmailTemplates:
    @staticmethod
    def get_base_template():
        return """
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="utf-8">
            <style>
                body {
                    font-family: Arial, sans-serif;
                    line-height: 1.6;
                    color: #333;
                    max-width: 600px;
                    margin: 0 auto;
                    padding: 20px;
                }
                .header {
                    background-color: #4a90e2;
                    color: white;
                    padding: 20px;
                    text-align: center;
                    border-radius: 5px 5px 0 0;
                }
                .content {
                    background-color: #f9f9f9;
                    padding: 20px;
                    border-radius: 0 0 5px 5px;
                }
                .button {
                    display: inline-block;
                    padding: 10px 20px;
                    background-color: #4a90e2;
                    color: white;
                    text-decoration: none;
                    border-radius: 5px;
                    margin-top: 15px;
                }
                .footer {
                    text-align: center;
                    margin-top: 20px;
                    font-size: 12px;
                    color: #666;
                }
                .warning {
                    color: #d93025;
                    font-weight: bold;
                }
            </style>
        </head>
        <body>
            <div class="header">
                <h1>{{ title }}</h1>
            </div>
            <div class="content">
                {{ content | safe }}
            </div>
            <div class="footer">
                <p>This email was sent by Medication Tracker. To update your email preferences, 
                <a href="{{ preferences_url }}">click here</a>.</p>
                <p>&copy; {{ current_year }} Medication Tracker. All rights reserved.</p>
            </div>
        </body>
        </html>
        """

    @staticmethod
    def upcoming_dose_template():
        return """
        <p>Hello {{ user_name }},</p>
        <p>This is a reminder that you have an upcoming medication dose:</p>
        <ul>
            <li><strong>Medication:</strong> {{ medication.name }}</li>
            <li><strong>Dosage:</strong> {{ medication.dosage }}</li>
            <li><strong>Time:</strong> {{ scheduled_time }}</li>
            {% if medication.instructions %}
            <li><strong>Instructions:</strong> {{ medication.instructions }}</li>
            {% endif %}
        </ul>
        <a href="{{ action_url }}" class="button">View Medication Details</a>
        """

    @staticmethod
    def missed_dose_template():
        return """
        <p>Hello {{ user_name }},</p>
        <p class="warning">You may have missed a medication dose:</p>
        <ul>
            <li><strong>Medication:</strong> {{ medication.name }}</li>
            <li><strong>Dosage:</strong> {{ medication.dosage }}</li>
            <li><strong>Scheduled Time:</strong> {{ scheduled_time }}</li>
        </ul>
        <p>Please take your medication if you haven't already done so, and mark it as taken in the app.</p>
        <a href="{{ action_url }}" class="button">Mark as Taken</a>
        """

    @staticmethod
    def interaction_warning_template():
        return """
        <p>Hello {{ user_name }},</p>
        <p class="warning">Important: Potential Medication Interaction Detected</p>
        <p>We've detected a potential interaction between your medications:</p>
        <ul>
            {% for med in medications %}
            <li><strong>{{ med.name }}</strong> ({{ med.dosage }})</li>
            {% endfor %}
        </ul>
        <p>Please consult your healthcare provider about this potential interaction.</p>
        <a href="{{ action_url }}" class="button">View Details</a>
        """

    @staticmethod
    def refill_reminder_template():
        return """
        <p>Hello {{ user_name }},</p>
        <p>Your medication supply is running low:</p>
        <ul>
            <li><strong>Medication:</strong> {{ medication.name }}</li>
            <li><strong>Current Supply:</strong> {{ medication.remaining_doses }} doses remaining</li>
            <li><strong>Days Left:</strong> Approximately {{ days_left }} days</li>
        </ul>
        <p>Please arrange for a refill to ensure you don't run out.</p>
        <a href="{{ action_url }}" class="button">Order Refill</a>
        """

    @staticmethod
    def render_template(template_func, **kwargs):
        """Render a template with the given kwargs"""
        env = Environment(loader=BaseLoader())
        
        # First render the content
        content_template = env.from_string(template_func())
        content = content_template.render(**kwargs)
        
        # Then render the base template with the content
        base_template = env.from_string(EmailTemplates.get_base_template())
        kwargs.update({
            'content': content,
            'current_year': datetime.now().year,
            'preferences_url': f"{kwargs.get('base_url', '')}/settings/notifications"
        })
        
        return base_template.render(**kwargs)
