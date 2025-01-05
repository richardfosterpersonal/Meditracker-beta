from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from app.services.carer_service import CarerService
from app.models.user import User
from app.models.carer import Carer, CarerAssignment

carer_bp = Blueprint('carer', __name__)
carer_service = CarerService()

@carer_bp.route('/carer/register', methods=['POST'])
@jwt_required()
def register_carer():
    """Register current user as a carer"""
    current_user_id = get_jwt_identity()
    data = request.get_json()
    
    carer = carer_service.create_carer(
        user_id=current_user_id,
        carer_type=data.get('type', 'family')
    )
    
    return jsonify(carer.to_dict()), 201

@carer_bp.route('/carer/assign', methods=['POST'])
@jwt_required()
def assign_carer():
    """Assign a carer to a patient"""
    data = request.get_json()
    
    assignment = carer_service.assign_carer(
        carer_id=data['carer_id'],
        patient_id=data['patient_id'],
        permissions=data.get('permissions')
    )
    
    return jsonify(assignment.to_dict()), 201

@carer_bp.route('/carer/patients', methods=['GET'])
@jwt_required()
def get_patients():
    """Get all patients for the current carer"""
    current_user_id = get_jwt_identity()
    carer = Carer.query.filter_by(user_id=current_user_id).first()
    
    if not carer:
        return jsonify({'error': 'Not registered as a carer'}), 404
        
    patients = carer_service.get_carer_patients(carer.id)
    return jsonify([
        {
            'id': patient.id,
            'name': patient.name,
            'email': patient.email
        } for patient in patients
    ]), 200

@carer_bp.route('/patient/carers', methods=['GET'])
@jwt_required()
def get_carers():
    """Get all carers for the current patient"""
    current_user_id = get_jwt_identity()
    carers = carer_service.get_patient_carers(current_user_id)
    
    return jsonify([
        {
            'id': carer.id,
            'name': carer.user.name,
            'type': carer.type,
            'verified': carer.verified
        } for carer in carers
    ]), 200

@carer_bp.route('/carer/assignment/<int:assignment_id>/permissions', methods=['PUT'])
@jwt_required()
def update_permissions(assignment_id):
    """Update permissions for a carer assignment"""
    data = request.get_json()
    
    assignment = carer_service.update_permissions(
        assignment_id=assignment_id,
        permissions=data['permissions']
    )
    
    if not assignment:
        return jsonify({'error': 'Assignment not found'}), 404
        
    return jsonify(assignment.to_dict()), 200

@carer_bp.route('/carer/assignment/<int:assignment_id>', methods=['DELETE'])
@jwt_required()
def remove_assignment(assignment_id):
    """Remove a carer assignment"""
    success = carer_service.remove_assignment(assignment_id)
    
    if not success:
        return jsonify({'error': 'Assignment not found'}), 404
        
    return jsonify({'message': 'Assignment removed successfully'}), 200
