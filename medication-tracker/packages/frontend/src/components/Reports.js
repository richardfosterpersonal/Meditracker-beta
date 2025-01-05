import React, { useState } from 'react';
import { Button, Card, Container, Row, Col, Form, Alert } from 'react-bootstrap';
import DatePicker from 'react-datepicker';
import "react-datepicker/dist/react-datepicker.css";
import { useAuth } from '../contexts/AuthContext';
import axios from 'axios';

const Reports = () => {
    const { getAuthHeaders } = useAuth();
    const [startDate, setStartDate] = useState(new Date(Date.now() - 30 * 24 * 60 * 60 * 1000));
    const [endDate, setEndDate] = useState(new Date());
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [report, setReport] = useState(null);

    const fetchReport = async () => {
        try {
            setLoading(true);
            setError('');

            const response = await axios.get(
                `/api/reports/compliance?start_date=${startDate.toISOString()}&end_date=${endDate.toISOString()}`,
                { headers: getAuthHeaders() }
            );

            setReport(response.data);
        } catch (err) {
            setError('Failed to fetch report: ' + err.message);
        } finally {
            setLoading(false);
        }
    };

    const downloadPDF = async () => {
        try {
            setLoading(true);
            setError('');

            const response = await axios.get(
                `/api/reports/compliance/pdf?start_date=${startDate.toISOString()}&end_date=${endDate.toISOString()}`,
                {
                    headers: getAuthHeaders(),
                    responseType: 'blob'
                }
            );

            // Create blob link to download
            const url = window.URL.createObjectURL(new Blob([response.data]));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', 'medication_compliance_report.pdf');
            document.body.appendChild(link);
            link.click();
            link.remove();
        } catch (err) {
            setError('Failed to download PDF: ' + err.message);
        } finally {
            setLoading(false);
        }
    };

    const exportData = async (format) => {
        try {
            setLoading(true);
            setError('');

            const response = await axios.get(
                `/api/reports/export?format=${format}`,
                {
                    headers: getAuthHeaders(),
                    responseType: format === 'csv' ? 'blob' : 'json'
                }
            );

            if (format === 'csv') {
                const url = window.URL.createObjectURL(new Blob([response.data]));
                const link = document.createElement('a');
                link.href = url;
                link.setAttribute('download', 'medication_data_export.csv');
                document.body.appendChild(link);
                link.click();
                link.remove();
            } else {
                // For JSON, create a formatted download
                const jsonStr = JSON.stringify(response.data, null, 2);
                const blob = new Blob([jsonStr], { type: 'application/json' });
                const url = window.URL.createObjectURL(blob);
                const link = document.createElement('a');
                link.href = url;
                link.setAttribute('download', 'medication_data_export.json');
                document.body.appendChild(link);
                link.click();
                link.remove();
            }
        } catch (err) {
            setError('Failed to export data: ' + err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <Container className="my-4">
            <h2 className="mb-4">Medication Reports</h2>
            
            {error && <Alert variant="danger">{error}</Alert>}
            
            <Card className="mb-4">
                <Card.Body>
                    <h4>Compliance Report</h4>
                    <Row className="align-items-end mb-3">
                        <Col md={4}>
                            <Form.Group>
                                <Form.Label>Start Date</Form.Label>
                                <DatePicker
                                    selected={startDate}
                                    onChange={date => setStartDate(date)}
                                    className="form-control"
                                />
                            </Form.Group>
                        </Col>
                        <Col md={4}>
                            <Form.Group>
                                <Form.Label>End Date</Form.Label>
                                <DatePicker
                                    selected={endDate}
                                    onChange={date => setEndDate(date)}
                                    className="form-control"
                                />
                            </Form.Group>
                        </Col>
                        <Col md={4}>
                            <Button 
                                variant="primary" 
                                onClick={fetchReport}
                                disabled={loading}
                                className="me-2"
                            >
                                Generate Report
                            </Button>
                            <Button
                                variant="secondary"
                                onClick={downloadPDF}
                                disabled={loading}
                            >
                                Download PDF
                            </Button>
                        </Col>
                    </Row>

                    {report && (
                        <div>
                            <h5>Overall Compliance: {report.overall_compliance}%</h5>
                            <h6 className="mt-4">Medications</h6>
                            <div className="table-responsive">
                                <table className="table">
                                    <thead>
                                        <tr>
                                            <th>Medication</th>
                                            <th>Dosage</th>
                                            <th>Total Doses</th>
                                            <th>Doses Taken</th>
                                            <th>Compliance Rate</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {report.medications.map((med, idx) => (
                                            <tr key={idx}>
                                                <td>{med.name}</td>
                                                <td>{med.dosage}</td>
                                                <td>{med.total_doses}</td>
                                                <td>{med.doses_taken}</td>
                                                <td>{med.compliance_rate}%</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>

                            {report.missed_doses.length > 0 && (
                                <>
                                    <h6 className="mt-4">Missed Doses</h6>
                                    <div className="table-responsive">
                                        <table className="table">
                                            <thead>
                                                <tr>
                                                    <th>Medication</th>
                                                    <th>Scheduled Time</th>
                                                    <th>Reason</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {report.missed_doses.map((dose, idx) => (
                                                    <tr key={idx}>
                                                        <td>{dose.medication_name}</td>
                                                        <td>{new Date(dose.scheduled_time).toLocaleString()}</td>
                                                        <td>{dose.reason || 'No reason provided'}</td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </>
                            )}
                        </div>
                    )}
                </Card.Body>
            </Card>

            <Card>
                <Card.Body>
                    <h4>Export Data</h4>
                    <p>Export all your medication data in your preferred format:</p>
                    <Button
                        variant="primary"
                        onClick={() => exportData('json')}
                        disabled={loading}
                        className="me-2"
                    >
                        Export as JSON
                    </Button>
                    <Button
                        variant="primary"
                        onClick={() => exportData('csv')}
                        disabled={loading}
                    >
                        Export as CSV
                    </Button>
                </Card.Body>
            </Card>
        </Container>
    );
};

export default Reports;
