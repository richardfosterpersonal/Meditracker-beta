from flask import Blueprint, request, jsonify, current_app, send_file
from flask_jwt_extended import jwt_required, get_jwt_identity
from datetime import datetime
from ..services.report_service import report_service
from .. import db

reports_bp = Blueprint('reports', __name__, url_prefix='/api/reports')

@reports_bp.route('/compliance', methods=['GET'])
@jwt_required()
def get_compliance_report():
    """Get compliance report for the current user"""
    try:
        user_id = get_jwt_identity()
        
        # Get date range from query parameters
        start_date = request.args.get('start_date')
        end_date = request.args.get('end_date')
        
        if start_date:
            start_date = datetime.fromisoformat(start_date)
        if end_date:
            end_date = datetime.fromisoformat(end_date)
            
        report_data = report_service.generate_compliance_report(
            user_id,
            start_date,
            end_date
        )
        
        return jsonify(report_data), 200
        
    except Exception as e:
        current_app.logger.error(f"Error generating compliance report: {str(e)}")
        return jsonify({
            'message': 'Error generating compliance report',
            'error': str(e)
        }), 500

@reports_bp.route('/compliance/pdf', methods=['GET'])
@jwt_required()
def get_compliance_pdf():
    """Get PDF compliance report for the current user"""
    try:
        user_id = get_jwt_identity()
        
        # Get date range from query parameters
        start_date = request.args.get('start_date')
        end_date = request.args.get('end_date')
        
        if start_date:
            start_date = datetime.fromisoformat(start_date)
        if end_date:
            end_date = datetime.fromisoformat(end_date)
            
        # Generate report data
        report_data = report_service.generate_compliance_report(
            user_id,
            start_date,
            end_date
        )
        
        # Generate PDF
        pdf_buffer = report_service.generate_pdf_report(user_id, report_data)
        
        return send_file(
            pdf_buffer,
            mimetype='application/pdf',
            as_attachment=True,
            download_name='medication_compliance_report.pdf'
        )
        
    except Exception as e:
        current_app.logger.error(f"Error generating PDF report: {str(e)}")
        return jsonify({
            'message': 'Error generating PDF report',
            'error': str(e)
        }), 500

@reports_bp.route('/export', methods=['GET'])
@jwt_required()
def export_data():
    """Export all medication data for the current user"""
    try:
        user_id = get_jwt_identity()
        export_format = request.args.get('format', 'json')
        
        if export_format not in ['json', 'csv']:
            return jsonify({
                'message': 'Invalid export format. Must be json or csv.'
            }), 400
            
        data = report_service.export_medication_data(user_id, export_format)
        
        if export_format == 'json':
            return jsonify(data), 200
        else:
            return send_file(
                io.StringIO(data),
                mimetype='text/csv',
                as_attachment=True,
                download_name='medication_data_export.csv'
            )
            
    except Exception as e:
        current_app.logger.error(f"Error exporting data: {str(e)}")
        return jsonify({
            'message': 'Error exporting data',
            'error': str(e)
        }), 500
