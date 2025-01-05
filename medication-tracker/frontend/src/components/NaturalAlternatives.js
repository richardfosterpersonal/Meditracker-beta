import React, { useState, useEffect } from 'react';
import {
  Box,
  Button,
  TextField,
  Typography,
  Card,
  CardContent,
  Alert,
  CircularProgress,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  List,
  ListItem,
  ListItemText,
  Divider,
  IconButton,
  Tooltip,
} from '@mui/material';
import { History as HistoryIcon, Info as InfoIcon } from '@mui/icons-material';
import { useAuth } from '../contexts/AuthContext';
import axios from 'axios';

const severityColors = {
  Major: 'error',
  Moderate: 'warning',
  Minor: 'info',
  Unknown: 'default'
};

const NaturalAlternatives = ({ medication, onClose }) => {
  const { getAuthHeaders } = useAuth();
  const [herb, setHerb] = useState('');
  const [drug, setDrug] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [interactionData, setInteractionData] = useState(null);
  const [showHistory, setShowHistory] = useState(false);
  const [history, setHistory] = useState([]);
  const [historyPage, setHistoryPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [showAllMedications, setShowAllMedications] = useState(false);
  const [medicationInteractions, setMedicationInteractions] = useState(null);
  const [alternatives, setAlternatives] = useState(null);
  const [safetyInfo, setSafetyInfo] = useState(null);
  const [selectedAlternative, setSelectedAlternative] = useState(null);
  const [showSafetyModal, setShowSafetyModal] = useState(false);
  const [interactions, setInteractions] = useState(null);
  const [monograph, setMonograph] = useState(null);
  const [showMonographModal, setShowMonographModal] = useState(false);

  useEffect(() => {
    fetchAlternatives();
    if (alternatives) {
      checkInteractions();
    }
  }, [medication, alternatives]);

  const fetchAlternatives = async () => {
    try {
      setLoading(true);
      setError('');

      const response = await axios.get(
        `/api/natural-alternatives/${encodeURIComponent(medication.name)}`,
        { headers: getAuthHeaders() }
      );

      setAlternatives(response.data);
    } catch (err) {
      setError('Failed to fetch natural alternatives: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchSafetyInfo = async (alternativeName) => {
    try {
      setLoading(true);
      setError('');

      const response = await axios.get(
        `/api/natural-alternatives/safety/${encodeURIComponent(alternativeName)}`,
        { headers: getAuthHeaders() }
      );

      setSafetyInfo(response.data);
      setSelectedAlternative(alternativeName);
      setShowSafetyModal(true);
    } catch (err) {
      setError('Failed to fetch safety information: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const checkInteractions = async () => {
    try {
      setLoading(true);
      setError('');

      // Get list of natural products from alternatives
      const naturalProducts = [
        ...alternatives.herbs.map(herb => herb.name),
        ...alternatives.supplements.map(supp => supp.name)
      ];

      const response = await axios.post(
        '/api/herb-drug-interactions/check',
        { natural_products: naturalProducts },
        { headers: getAuthHeaders() }
      );

      setInteractions(response.data);
    } catch (err) {
      setError('Failed to check interactions: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchMonograph = async (naturalProduct) => {
    try {
      setLoading(true);
      setError('');

      const response = await axios.get(
        `/api/herb-drug-interactions/monograph/${encodeURIComponent(naturalProduct)}`,
        { headers: getAuthHeaders() }
      );

      setMonograph(response.data);
      setShowMonographModal(true);
    } catch (err) {
      setError('Failed to fetch monograph: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  // Fetch interaction history
  const fetchHistory = async (page = 1) => {
    try {
      const response = await axios.get(
        `/api/herb-drug/interaction-history?page=${page}`,
        { headers: getAuthHeaders() }
      );
      setHistory(response.data.data.history);
      setTotalPages(response.data.data.total_pages);
    } catch (err) {
      console.error('Error fetching history:', err);
    }
  };

  // Check interaction between a single herb and drug
  const checkInteraction = async () => {
    setLoading(true);
    setError(null);
    setInteractionData(null);

    try {
      const response = await axios.post(
        '/api/herb-drug/check-interaction',
        { herb, drug },
        { headers: getAuthHeaders() }
      );
      setInteractionData(response.data.data);
    } catch (err) {
      setError(err.response?.data?.error || 'Error checking interaction');
    } finally {
      setLoading(false);
    }
  };

  // Check interactions with all user medications
  const checkAllMedications = async () => {
    setLoading(true);
    setError(null);
    setMedicationInteractions(null);

    try {
      const response = await axios.post(
        '/api/herb-drug/check-user-medications',
        { herb },
        { headers: getAuthHeaders() }
      );
      setMedicationInteractions(response.data.data);
    } catch (err) {
      setError(err.response?.data?.error || 'Error checking medications');
    } finally {
      setLoading(false);
    }
  };

  // Render interaction details
  const InteractionDetails = ({ data }) => (
    <Card variant="outlined" sx={{ mt: 2 }}>
      <CardContent>
        <Box display="flex" alignItems="center" gap={1} mb={2}>
          <Typography variant="h6">Interaction Details</Typography>
          <Chip
            label={data.severity}
            color={severityColors[data.severity]}
            size="small"
          />
          <Chip
            label={`Evidence: ${data.evidence}`}
            variant="outlined"
            size="small"
          />
        </Box>
        <Typography variant="body1" paragraph>
          {data.effect}
        </Typography>
        <Box mt={1}>
          <Typography variant="subtitle2" color="text.secondary">
            Sources: {data.sources.join(', ')}
          </Typography>
        </Box>
      </CardContent>
    </Card>
  );

  // Render medication interactions list
  const MedicationInteractionsList = ({ data }) => (
    <Card variant="outlined" sx={{ mt: 2 }}>
      <CardContent>
        <Typography variant="h6" gutterBottom>
          Interactions with Current Medications
        </Typography>
        <Typography variant="body2" color="text.secondary" paragraph>
          Checked {data.medications_checked} medications, 
          found {data.interactions_found} potential interactions
        </Typography>
        <List>
          {data.interactions.map((item, index) => (
            <React.Fragment key={item.medication}>
              {index > 0 && <Divider />}
              <ListItem>
                <ListItemText
                  primary={
                    <Box display="flex" alignItems="center" gap={1}>
                      <Typography variant="subtitle1">
                        {item.medication}
                      </Typography>
                      <Chip
                        label={item.interaction.severity}
                        color={severityColors[item.interaction.severity]}
                        size="small"
                      />
                    </Box>
                  }
                  secondary={item.interaction.effect}
                />
              </ListItem>
            </React.Fragment>
          ))}
        </List>
      </CardContent>
    </Card>
  );

  // History dialog
  const HistoryDialog = () => (
    <Dialog
      open={showHistory}
      onClose={() => setShowHistory(false)}
      maxWidth="md"
      fullWidth
    >
      <DialogTitle>Interaction Check History</DialogTitle>
      <DialogContent>
        <List>
          {history.map((item, index) => (
            <React.Fragment key={index}>
              {index > 0 && <Divider />}
              <ListItem>
                <ListItemText
                  primary={
                    <Box display="flex" alignItems="center" gap={1}>
                      <Typography variant="subtitle1">
                        {item.herb} + {item.drug}
                      </Typography>
                      <Chip
                        label={item.result.severity}
                        color={severityColors[item.result.severity]}
                        size="small"
                      />
                    </Box>
                  }
                  secondary={
                    <>
                      <Typography variant="body2" color="text.secondary">
                        {new Date(item.timestamp).toLocaleString()}
                      </Typography>
                      <Typography variant="body2">
                        {item.result.effect}
                      </Typography>
                    </>
                  }
                />
              </ListItem>
            </React.Fragment>
          ))}
        </List>
      </DialogContent>
      <DialogActions>
        <Button
          disabled={historyPage === 1}
          onClick={() => {
            setHistoryPage(prev => prev - 1);
            fetchHistory(historyPage - 1);
          }}
        >
          Previous
        </Button>
        <Button
          disabled={historyPage === totalPages}
          onClick={() => {
            setHistoryPage(prev => prev + 1);
            fetchHistory(historyPage + 1);
          }}
        >
          Next
        </Button>
      </DialogActions>
    </Dialog>
  );

  if (loading) {
    return (
      <Container className="text-center my-4">
        <Spinner animation="border" />
      </Container>
    );
  }

  return (
    <Container className="my-4">
      <h3>Natural Alternatives for {medication.name}</h3>
      {error && <Alert variant="danger">{error}</Alert>}

      {interactions && interactions.interactions.length > 0 && (
        <Card className="mb-4 border-warning">
          <Card.Header className="bg-warning text-white">
            <h5 className="mb-0">⚠️ Potential Interactions Found</h5>
          </Card.Header>
          <Card.Body>
            <Alert variant="warning">
              {interactions.interactions.map((interaction, idx) => (
                <div key={idx} className="mb-3">
                  <h6>
                    {interaction.natural_product} + {interaction.medication}
                  </h6>
                  <ul className="mb-2">
                    <li><strong>Severity:</strong> {interaction.severity}</li>
                    <li><strong>Effect:</strong> {interaction.effect}</li>
                    <li><strong>Recommendation:</strong> {interaction.recommendation}</li>
                  </ul>
                </div>
              ))}
              <div className="mt-3">
                <strong>Important Note:</strong>
                <ul>
                  {interactions.general_advice.map((advice, idx) => (
                    <li key={idx}>{advice}</li>
                  ))}
                </ul>
              </div>
            </Alert>
          </Card.Body>
        </Card>
      )}

      {alternatives && (
        <Accordion className="mb-4">
          {alternatives.herbs.length > 0 && (
            <Accordion.Item eventKey="0">
              <Accordion.Header>
                Herbal Alternatives
              </Accordion.Header>
              <Accordion.Body>
                <Row xs={1} md={2} className="g-4">
                  {alternatives.herbs.map((herb, idx) => (
                    <Col key={idx}>
                      <Card>
                        <Card.Body>
                          <Card.Title>{herb.name}</Card.Title>
                          <Card.Text>{herb.description}</Card.Text>
                          <Button
                            variant="outline-info"
                            size="sm"
                            onClick={() => fetchSafetyInfo(herb.name)}
                          >
                            View Safety Information
                          </Button>
                          <Button
                            variant="outline-info"
                            size="sm"
                            onClick={() => fetchMonograph(herb.name)}
                            className="ms-2"
                          >
                            View Detailed Information
                          </Button>
                        </Card.Body>
                      </Card>
                    </Col>
                  ))}
                </Row>
              </Accordion.Body>
            </Accordion.Item>
          )}

          {alternatives.supplements.length > 0 && (
            <Accordion.Item eventKey="1">
              <Accordion.Header>
                Supplements
              </Accordion.Header>
              <Accordion.Body>
                <Row xs={1} md={2} className="g-4">
                  {alternatives.supplements.map((supplement, idx) => (
                    <Col key={idx}>
                      <Card>
                        <Card.Body>
                          <Card.Title>{supplement.name}</Card.Title>
                          <Card.Text>{supplement.description}</Card.Text>
                          <Button
                            variant="outline-info"
                            size="sm"
                            onClick={() => fetchSafetyInfo(supplement.name)}
                          >
                            View Safety Information
                          </Button>
                        </Card.Body>
                      </Card>
                    </Col>
                  ))}
                </Row>
              </Accordion.Body>
            </Accordion.Item>
          )}

          {alternatives.lifestyle.length > 0 && (
            <Accordion.Item eventKey="2">
              <Accordion.Header>
                Lifestyle Changes
              </Accordion.Header>
              <Accordion.Body>
                <ul className="list-unstyled">
                  {alternatives.lifestyle.map((change, idx) => (
                    <li key={idx} className="mb-2">
                      <Badge bg="success" className="me-2">✓</Badge>
                      {change}
                    </li>
                  ))}
                </ul>
              </Accordion.Body>
            </Accordion.Item>
          )}

          <Accordion.Item eventKey="3">
            <Accordion.Header>
              Important Precautions
            </Accordion.Header>
            <Accordion.Body>
              <Alert variant="warning">
                <ul className="mb-0">
                  {alternatives.precautions.map((precaution, idx) => (
                    <li key={idx}>{precaution}</li>
                  ))}
                </ul>
              </Alert>
            </Accordion.Body>
          </Accordion.Item>
        </Accordion>
      )}

      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h5">Natural Product Interaction Checker</Typography>
        <Tooltip title="View History">
          <IconButton
            onClick={() => {
              setShowHistory(true);
              fetchHistory();
            }}
          >
            <HistoryIcon />
          </IconButton>
        </Tooltip>
      </Box>

      <Box display="flex" gap={2} mb={3}>
        <TextField
          label="Natural Product / Herb"
          value={herb}
          onChange={(e) => setHerb(e.target.value)}
          fullWidth
        />
        {!showAllMedications && (
          <TextField
            label="Medication"
            value={drug}
            onChange={(e) => setDrug(e.target.value)}
            fullWidth
          />
        )}
      </Box>

      <Box display="flex" gap={2} mb={3}>
        {!showAllMedications ? (
          <>
            <Button
              variant="contained"
              onClick={checkInteraction}
              disabled={!herb || !drug || loading}
            >
              Check Interaction
            </Button>
            <Button
              variant="outlined"
              onClick={() => setShowAllMedications(true)}
            >
              Check All My Medications
            </Button>
          </>
        ) : (
          <>
            <Button
              variant="contained"
              onClick={checkAllMedications}
              disabled={!herb || loading}
            >
              Check All Medications
            </Button>
            <Button
              variant="outlined"
              onClick={() => setShowAllMedications(false)}
            >
              Check Single Medication
            </Button>
          </>
        )}
      </Box>

      {loading && (
        <Box display="flex" justifyContent="center" my={3}>
          <CircularProgress />
        </Box>
      )}

      {error && (
        <Alert severity="error" sx={{ mt: 2 }}>
          {error}
        </Alert>
      )}

      {interactionData && !showAllMedications && (
        <InteractionDetails data={interactionData} />
      )}

      {medicationInteractions && showAllMedications && (
        <MedicationInteractionsList data={medicationInteractions} />
      )}

      <HistoryDialog />

      <Modal
        show={showSafetyModal}
        onHide={() => setShowSafetyModal(false)}
        size="lg"
      >
        <Modal.Header closeButton>
          <Modal.Title>Safety Information - {selectedAlternative}</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {safetyInfo && (
            <>
              <h5>General Precautions</h5>
              <ul>
                {safetyInfo.general_precautions.map((precaution, idx) => (
                  <li key={idx}>{precaution}</li>
                ))}
              </ul>

              <h5>Possible Interactions</h5>
              <ul>
                {safetyInfo.possible_interactions.map((interaction, idx) => (
                  <li key={idx}>{interaction}</li>
                ))}
              </ul>

              <h5>Contraindications</h5>
              <ul>
                {safetyInfo.contraindications.map((contraindication, idx) => (
                  <li key={idx}>{contraindication}</li>
                ))}
              </ul>

              <h5>Recommended Usage</h5>
              <ul>
                {safetyInfo.recommended_usage.map((usage, idx) => (
                  <li key={idx}>{usage}</li>
                ))}
              </ul>
            </>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowSafetyModal(false)}>
            Close
          </Button>
        </Modal.Footer>
      </Modal>

      {/* Monograph Modal */}
      <Modal
        show={showMonographModal}
        onHide={() => setShowMonographModal(false)}
        size="lg"
      >
        <Modal.Header closeButton>
          <Modal.Title>
            {monograph?.name} - Detailed Information
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {monograph && (
            <>
              <h5>Overview</h5>
              <p><strong>Scientific Name:</strong> {monograph.scientific_name}</p>
              <p><strong>Common Names:</strong> {monograph.common_names.join(', ')}</p>
              <p><strong>Safety Rating:</strong> {monograph.safety_rating}</p>
              <p><strong>Effectiveness Rating:</strong> {monograph.effectiveness_rating}</p>

              <h5>Common Uses</h5>
              <ul>
                {monograph.common_uses.map((use, idx) => (
                  <li key={idx}>{use}</li>
                ))}
              </ul>

              <h5>Mechanism of Action</h5>
              <p>{monograph.mechanism_of_action}</p>

              <h5>Pharmacokinetics</h5>
              <ul>
                <li><strong>Absorption:</strong> {monograph.pharmacokinetics.absorption}</li>
                <li><strong>Distribution:</strong> {monograph.pharmacokinetics.distribution}</li>
                <li><strong>Metabolism:</strong> {monograph.pharmacokinetics.metabolism}</li>
                <li><strong>Elimination:</strong> {monograph.pharmacokinetics.elimination}</li>
              </ul>

              <h5>Adverse Reactions</h5>
              <ul>
                {monograph.adverse_reactions.map((reaction, idx) => (
                  <li key={idx}>{reaction}</li>
                ))}
              </ul>

              <h5>Drug Interactions</h5>
              <ul>
                {monograph.drug_interactions.map((interaction, idx) => (
                  <li key={idx}>{interaction}</li>
                ))}
              </ul>

              <h5>Dosing Information</h5>
              <ul>
                <li><strong>Adults:</strong> {monograph.dosing.adult}</li>
                <li><strong>Children:</strong> {monograph.dosing.pediatric}</li>
                <li><strong>Elderly:</strong> {monograph.dosing.elderly}</li>
              </ul>

              <Alert variant="info">
                <strong>Pregnancy Safety:</strong> {monograph.pregnancy_safety}
              </Alert>
            </>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowMonographModal(false)}>
            Close
          </Button>
        </Modal.Footer>
      </Modal>
    </Container>
  );
};

export default NaturalAlternatives;
