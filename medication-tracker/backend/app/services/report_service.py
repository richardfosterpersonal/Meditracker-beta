import pandas as pd
from datetime import datetime, timedelta
from flask import current_app
import json
import csv
import io
from ..models.medication import Medication
from ..models.medication_history import MedicationHistory
from ..models.notification import Notification

class ReportService:
    @staticmethod
    def generate_compliance_report(user_id, start_date=None, end_date=None):
        """Generate a detailed compliance report for the user"""
        try:
            # Set default date range if not provided
            if not end_date:
                end_date = datetime.utcnow()
            if not start_date:
                start_date = end_date - timedelta(days=30)

            # Get all medications for the user
            medications = Medication.query.filter_by(user_id=user_id).all()
            
            report_data = {
                'overall_compliance': 0,
                'medications': [],
                'missed_doses': [],
                'date_range': {
                    'start': start_date.isoformat(),
                    'end': end_date.isoformat()
                }
            }

            total_doses = 0
            total_taken = 0

            for medication in medications:
                # Get medication history
                history = MedicationHistory.query.filter(
                    MedicationHistory.medication_id == medication.id,
                    MedicationHistory.scheduled_time.between(start_date, end_date)
                ).all()

                doses_taken = len([h for h in history if h.taken])
                total_scheduled = len(history)
                
                if total_scheduled > 0:
                    compliance_rate = (doses_taken / total_scheduled) * 100
                else:
                    compliance_rate = 0

                total_doses += total_scheduled
                total_taken += doses_taken

                # Get missed doses
                missed_doses = [h for h in history if not h.taken]
                
                med_data = {
                    'id': medication.id,
                    'name': medication.name,
                    'dosage': medication.dosage,
                    'frequency': medication.frequency,
                    'total_doses': total_scheduled,
                    'doses_taken': doses_taken,
                    'compliance_rate': round(compliance_rate, 2),
                    'missed_doses_count': len(missed_doses)
                }

                report_data['medications'].append(med_data)
                
                # Add missed doses details
                for dose in missed_doses:
                    report_data['missed_doses'].append({
                        'medication_name': medication.name,
                        'scheduled_time': dose.scheduled_time.isoformat(),
                        'reason': dose.notes
                    })

            # Calculate overall compliance
            if total_doses > 0:
                report_data['overall_compliance'] = round((total_taken / total_doses) * 100, 2)

            return report_data

        except Exception as e:
            current_app.logger.error(f"Error generating compliance report: {str(e)}")
            raise

    @staticmethod
    def export_medication_data(user_id, format='json'):
        """Export all medication-related data for the user"""
        try:
            # Get all user's medications and related data
            medications = Medication.query.filter_by(user_id=user_id).all()
            
            export_data = {
                'medications': [],
                'history': [],
                'notifications': [],
                'export_date': datetime.utcnow().isoformat()
            }

            for medication in medications:
                # Medication data
                med_data = medication.to_dict()
                export_data['medications'].append(med_data)

                # Medication history
                history = MedicationHistory.query.filter_by(medication_id=medication.id).all()
                for record in history:
                    history_data = record.to_dict()
                    export_data['history'].append(history_data)

                # Notifications
                notifications = Notification.query.filter_by(
                    medication_id=medication.id
                ).all()
                for notification in notifications:
                    notif_data = notification.to_dict()
                    export_data['notifications'].append(notif_data)

            if format == 'json':
                return json.dumps(export_data, indent=2)
            elif format == 'csv':
                # Create CSV for each data type
                output = io.StringIO()
                writer = csv.writer(output)

                # Write medications
                writer.writerow(['MEDICATIONS'])
                if export_data['medications']:
                    headers = export_data['medications'][0].keys()
                    writer.writerow(headers)
                    for med in export_data['medications']:
                        writer.writerow(med.values())

                writer.writerow([])  # Empty row for separation
                
                # Write history
                writer.writerow(['MEDICATION HISTORY'])
                if export_data['history']:
                    headers = export_data['history'][0].keys()
                    writer.writerow(headers)
                    for history in export_data['history']:
                        writer.writerow(history.values())

                writer.writerow([])
                
                # Write notifications
                writer.writerow(['NOTIFICATIONS'])
                if export_data['notifications']:
                    headers = export_data['notifications'][0].keys()
                    writer.writerow(headers)
                    for notification in export_data['notifications']:
                        writer.writerow(notification.values())

                return output.getvalue()
            else:
                raise ValueError(f"Unsupported export format: {format}")

        except Exception as e:
            current_app.logger.error(f"Error exporting medication data: {str(e)}")
            raise

    @staticmethod
    def generate_pdf_report(user_id, report_data):
        """Generate a PDF report from the compliance data"""
        try:
            from reportlab.lib import colors
            from reportlab.lib.pagesizes import letter
            from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle
            from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
            
            buffer = io.BytesIO()
            doc = SimpleDocTemplate(buffer, pagesize=letter)
            styles = getSampleStyleSheet()
            story = []

            # Title
            title_style = ParagraphStyle(
                'CustomTitle',
                parent=styles['Heading1'],
                fontSize=24,
                spaceAfter=30
            )
            story.append(Paragraph("Medication Compliance Report", title_style))
            story.append(Spacer(1, 12))

            # Date Range
            date_range = (
                f"Report Period: {report_data['date_range']['start']} to "
                f"{report_data['date_range']['end']}"
            )
            story.append(Paragraph(date_range, styles['Normal']))
            story.append(Spacer(1, 12))

            # Overall Compliance
            story.append(Paragraph(
                f"Overall Compliance Rate: {report_data['overall_compliance']}%",
                styles['Heading2']
            ))
            story.append(Spacer(1, 12))

            # Medications Table
            story.append(Paragraph("Medication Details", styles['Heading2']))
            story.append(Spacer(1, 12))

            # Create medications table
            med_data = [[
                'Medication',
                'Dosage',
                'Total Doses',
                'Taken',
                'Compliance Rate'
            ]]
            
            for med in report_data['medications']:
                med_data.append([
                    med['name'],
                    med['dosage'],
                    str(med['total_doses']),
                    str(med['doses_taken']),
                    f"{med['compliance_rate']}%"
                ])

            med_table = Table(med_data)
            med_table.setStyle(TableStyle([
                ('BACKGROUND', (0, 0), (-1, 0), colors.grey),
                ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
                ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
                ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
                ('FONTSIZE', (0, 0), (-1, 0), 14),
                ('BOTTOMPADDING', (0, 0), (-1, 0), 12),
                ('BACKGROUND', (0, 1), (-1, -1), colors.beige),
                ('TEXTCOLOR', (0, 1), (-1, -1), colors.black),
                ('FONTNAME', (0, 1), (-1, -1), 'Helvetica'),
                ('FONTSIZE', (0, 1), (-1, -1), 12),
                ('GRID', (0, 0), (-1, -1), 1, colors.black)
            ]))
            story.append(med_table)
            story.append(Spacer(1, 20))

            # Missed Doses
            if report_data['missed_doses']:
                story.append(Paragraph("Missed Doses", styles['Heading2']))
                story.append(Spacer(1, 12))

                missed_data = [['Medication', 'Scheduled Time', 'Reason']]
                for dose in report_data['missed_doses']:
                    missed_data.append([
                        dose['medication_name'],
                        dose['scheduled_time'],
                        dose.get('reason', 'No reason provided')
                    ])

                missed_table = Table(missed_data)
                missed_table.setStyle(TableStyle([
                    ('BACKGROUND', (0, 0), (-1, 0), colors.red),
                    ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
                    ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
                    ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
                    ('FONTSIZE', (0, 0), (-1, 0), 14),
                    ('BOTTOMPADDING', (0, 0), (-1, 0), 12),
                    ('BACKGROUND', (0, 1), (-1, -1), colors.lightgrey),
                    ('TEXTCOLOR', (0, 1), (-1, -1), colors.black),
                    ('FONTNAME', (0, 1), (-1, -1), 'Helvetica'),
                    ('FONTSIZE', (0, 1), (-1, -1), 12),
                    ('GRID', (0, 0), (-1, -1), 1, colors.black)
                ]))
                story.append(missed_table)

            # Build PDF
            doc.build(story)
            buffer.seek(0)
            return buffer

        except Exception as e:
            current_app.logger.error(f"Error generating PDF report: {str(e)}")
            raise

# Create singleton instance
report_service = ReportService()
