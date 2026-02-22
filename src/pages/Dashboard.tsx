import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router';
import TopNav from '../components/TopNav';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '../components/ui/dialog';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Textarea } from '../components/ui/textarea';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table';
import { Tabs, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Avatar, AvatarFallback } from '../components/ui/avatar';
import {
  fetchPatients,
  createPatient,
  createEntry,
  analyzeText,
  toStoredResult,
  type AnalyzeResponse,
  type PatientResponse,
} from '../lib/api';
import { Users, AlertTriangle, FileText, Search, Filter, Plus, Eye, UserPlus, Calendar } from 'lucide-react';
import { toast } from 'sonner';

type TabValue = 'all' | 'high-risk' | 'recent';
type FilterValue = 'all' | 'high-risk' | 'low-risk' | 'newest';
type AnalysisStep = 'preprocessing' | 'mentalbert' | 'complete' | null;

export default function Dashboard() {
  const [isEntryModalOpen, setIsEntryModalOpen] = useState(false);
  const [isAddPatientModalOpen, setIsAddPatientModalOpen] = useState(false);
  const [selectedPatientId, setSelectedPatientId] = useState('');
  const [patientNarrative, setPatientNarrative] = useState('');
  const [practitionerNotes, setPractitionerNotes] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<TabValue>('all');
  const [filterValue, setFilterValue] = useState<FilterValue>('all');
  const [analysisStep, setAnalysisStep] = useState<AnalysisStep>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [lastAnalysisResult, setLastAnalysisResult] = useState<AnalyzeResponse | null>(null);
  
  // New Patient Form State
  const [newPatientName, setNewPatientName] = useState('');
  const [newPatientDob, setNewPatientDob] = useState('');
  const [newPatientConcern, setNewPatientConcern] = useState('');
  const [nameError, setNameError] = useState(false);
  const [patients, setPatients] = useState<PatientResponse[]>([]);
  const [patientsLoading, setPatientsLoading] = useState(true);
  
  const navigate = useNavigate();

  useEffect(() => {
    fetchPatients()
      .then(setPatients)
      .catch(() => toast.error('Failed to load patients'))
      .finally(() => setPatientsLoading(false));
  }, []);

  const totalPatients = patients.length;
  const highRiskCount = patients.filter(p => (p.risk_score ?? 0) >= 70).length;
  const todayEntries = 0;

  const selectedPatient = patients.find(p => String(p.id) === selectedPatientId);

  const openAddPatientModal = () => {
    setIsAddPatientModalOpen(true);
    setNewPatientName('');
    setNewPatientDob('');
    setNewPatientConcern('');
    setNameError(false);
    setTimeout(() => document.getElementById('newPatientName')?.focus(), 100);
  };

  const handleAddEntry = (patientId: string) => {
    setSelectedPatientId(patientId);
    setIsEntryModalOpen(true);
    setPatientNarrative('');
    setPractitionerNotes('');
    setAnalysisStep(null);
    setLastAnalysisResult(null);
  };

  const handleAnalyze = async () => {
    if (!patientNarrative.trim()) return;
    setIsAnalyzing(true);
    setAnalysisStep('preprocessing');
    setLastAnalysisResult(null);
    try {
      await new Promise(resolve => setTimeout(resolve, 400));
      setAnalysisStep('mentalbert');
      const apiResult = await analyzeText(patientNarrative.trim(), practitionerNotes || undefined);
      setLastAnalysisResult(apiResult);
      setAnalysisStep('complete');
      toast.success('Analysis complete');
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Analysis failed';
      toast.error(message);
      setAnalysisStep(null);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleSaveEntry = async () => {
    const patientName = selectedPatient?.name ?? 'Unknown Patient';
    if (!patientNarrative.trim()) return;
    setIsAnalyzing(true);
    setAnalysisStep('preprocessing');
    try {
      setAnalysisStep('mentalbert');
      const entry = await createEntry(
        Number(selectedPatientId),
        patientNarrative.trim(),
        practitionerNotes || undefined
      );
      const detectedPatterns: string[] = entry.detected_patterns
        ? (typeof entry.detected_patterns === 'string' ? JSON.parse(entry.detected_patterns) : entry.detected_patterns)
        : [];
      const analysisResult = {
        patientId: selectedPatientId,
        patientName,
        narrative: entry.text,
        practitionerNotes: entry.practitioner_notes ?? '',
        prediction: entry.prediction as 'depressed' | 'not_depressed',
        confidence: entry.confidence,
        riskScore: entry.risk_score,
        sentiment: {
          polarity: (entry.sentiment_polarity ?? 'neutral') as 'positive' | 'negative' | 'neutral',
          score: entry.sentiment_score ?? 50,
        },
        detectedPatterns,
      };
      sessionStorage.setItem('analysisResult', JSON.stringify(analysisResult));
      toast.success('Entry saved');
      navigate('/analysis-results');
      setPatients(prev => prev.map(p => p.id === Number(selectedPatientId) ? { ...p, total_entries: p.total_entries + 1, last_entry_date: entry.created_at.split('T')[0], latest_status: entry.prediction, risk_score: entry.risk_score, confidence: entry.confidence } : p));
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to save entry');
    } finally {
      setIsAnalyzing(false);
      setAnalysisStep(null);
      setIsEntryModalOpen(false);
      setSelectedPatientId('');
      setPatientNarrative('');
      setPractitionerNotes('');
      setLastAnalysisResult(null);
    }
  };

  const getRiskLevel = (riskScore: number) => {
    if (riskScore >= 70) return { label: 'High', color: 'var(--red-700)', bg: 'bg-red-50' };
    if (riskScore >= 40) return { label: 'Medium', color: '#F59E0B', bg: 'bg-amber-50' };
    return { label: 'Low', color: 'var(--green-700)', bg: 'bg-green-50' };
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase();
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
  };

  type DisplayPatient = { id: string; name: string; lastEntryDate: string; latestStatus: 'depressed' | 'not_depressed'; riskScore: number; confidence: number; totalEntries: number };
  const toDisplay = (p: PatientResponse): DisplayPatient => ({
    id: String(p.id),
    name: p.name,
    lastEntryDate: p.last_entry_date ?? '',
    latestStatus: (p.latest_status === 'depressed' ? 'depressed' : 'not_depressed') as 'depressed' | 'not_depressed',
    riskScore: p.risk_score ?? 0,
    confidence: p.confidence ?? 0,
    totalEntries: p.total_entries,
  });
  const filteredPatients: DisplayPatient[] = patients
    .map(toDisplay)
    .filter(patient => {
      if (activeTab === 'high-risk' && patient.riskScore < 70) return false;
      if (activeTab === 'recent') {
        const today = new Date().toISOString().split('T')[0];
        if (patient.lastEntryDate !== today) return false;
      }
      if (searchQuery && !patient.name.toLowerCase().includes(searchQuery.toLowerCase())) return false;
      if (filterValue === 'high-risk' && patient.riskScore < 70) return false;
      if (filterValue === 'low-risk' && patient.riskScore >= 40) return false;
      return true;
    })
    .sort((a, b) => {
      if (filterValue === 'newest') return new Date(b.lastEntryDate || 0).getTime() - new Date(a.lastEntryDate || 0).getTime();
      return 0;
    });

  const renderAnalysisSteps = () => {
    if (!analysisStep) return null;

    return (
      <div className="py-4 space-y-3">
        <div className="flex items-center gap-3">
          <div 
            className={`w-8 h-8 rounded-full flex items-center justify-center ${
              analysisStep === 'preprocessing' ? 'bg-blue-500 text-white' : 
              analysisStep === 'mentalbert' || analysisStep === 'complete' ? 'bg-green-500 text-white' : 
              'bg-gray-200'
            }`}
          >
            {analysisStep === 'mentalbert' || analysisStep === 'complete' ? '✓' : '1'}
          </div>
          <div>
            <p className="text-sm font-medium">Step 1: Text Review</p>
            <p className="text-xs" style={{ color: 'var(--gray-700)' }}>
              {analysisStep === 'preprocessing' ? 'Checking text...' : 'Complete'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div 
            className={`w-8 h-8 rounded-full flex items-center justify-center ${
              analysisStep === 'mentalbert' ? 'bg-blue-500 text-white' : 
              analysisStep === 'complete' ? 'bg-green-500 text-white' : 
              'bg-gray-200'
            }`}
          >
            {analysisStep === 'complete' ? '✓' : '2'}
          </div>
          <div>
            <p className="text-sm font-medium">Step 2: Mood Analysis</p>
            <p className="text-xs" style={{ color: 'var(--gray-700)' }}>
              {analysisStep === 'mentalbert' ? 'Analyzing mood...' : 
               analysisStep === 'complete' ? 'Complete' : 'Waiting...'}
            </p>
          </div>
        </div>

        {analysisStep === 'complete' && (
          <div className="mt-4 p-4 rounded-lg" style={{ backgroundColor: 'var(--gray-50)', borderLeft: '4px solid var(--brand-600)' }}>
            <p className="text-sm font-medium mb-2">Analysis Complete</p>
            <div className="space-y-1 text-xs" style={{ color: 'var(--gray-700)' }}>
              <p>• Mood Status: <span className="font-medium">{lastAnalysisResult ? (lastAnalysisResult.prediction === 'depressed' ? 'Depressed' : 'Not Depressed') : '—'}</span></p>
              <p>• AI Certainty Score: <span className="font-medium">{lastAnalysisResult ? `${lastAnalysisResult.confidence}%` : '—'}</span></p>
              <p>• Risk Score: <span className="font-medium">{lastAnalysisResult ? `${lastAnalysisResult.risk_score}/100` : '—'}</span></p>
            </div>
          </div>
        )}
      </div>
    );
  };

  const handleAddPatient = async () => {
    if (!newPatientName.trim()) {
      setNameError(true);
      return;
    }
    setNameError(false);
    try {
      const created = await createPatient({
        name: newPatientName.trim(),
        date_of_birth: newPatientDob || null,
        initial_concern: newPatientConcern || null,
      });
      setPatients(prev => [created, ...prev]);
      toast.success('Patient added');
      setIsAddPatientModalOpen(false);
      setNewPatientName('');
      setNewPatientDob('');
      setNewPatientConcern('');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to add patient');
    }
  };

  return (
    <div className="min-h-screen" style={{ backgroundColor: 'var(--gray-25)' }}>
      <TopNav />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-semibold" style={{ color: 'var(--gray-900)' }}>
            Clinical Dashboard
          </h1>
          <p className="mt-1" style={{ color: 'var(--gray-700)' }}>
            Patient monitoring and mental health assessment
          </p>
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card style={{ borderColor: 'var(--gray-200)' }}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium" style={{ color: 'var(--gray-700)' }}>
                Total Patients
              </CardTitle>
              <Users className="w-5 h-5" style={{ color: 'var(--brand-600)' }} />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-semibold">{totalPatients}</div>
              <p className="text-xs mt-1" style={{ color: 'var(--gray-700)' }}>
                Active in monitoring
              </p>
            </CardContent>
          </Card>

          <Card style={{ borderColor: 'var(--gray-200)' }}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium" style={{ color: 'var(--gray-700)' }}>
                High-Risk Alerts
              </CardTitle>
              <AlertTriangle className="w-5 h-5" style={{ color: 'var(--red-700)' }} />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-semibold" style={{ color: 'var(--red-700)' }}>
                {highRiskCount}
              </div>
              <p className="text-xs mt-1" style={{ color: 'var(--gray-700)' }}>
                Require immediate attention
              </p>
            </CardContent>
          </Card>

          <Card style={{ borderColor: 'var(--gray-200)' }}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium" style={{ color: 'var(--gray-700)' }}>
                Recent Entries Today
              </CardTitle>
              <FileText className="w-5 h-5" style={{ color: 'var(--blue-500)' }} />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-semibold">{todayEntries}</div>
              <p className="text-xs mt-1" style={{ color: 'var(--gray-700)' }}>
                New journal entries
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Patient Directory */}
        <Card style={{ borderColor: 'var(--gray-200)' }}>
          <CardHeader className="space-y-4 p-6">
            <div className="flex items-center justify-between">
              <CardTitle>Patient Directory</CardTitle>
              <Button
                onClick={openAddPatientModal}
                className="font-medium"
                style={{ 
                  backgroundColor: 'var(--brand-600)',
                  borderRadius: '8px'
                }}
              >
                <UserPlus className="w-4 h-4 mr-2" />
                Add New Patient
              </Button>
            </div>
            
            {/* Tabs and Filter Bar */}
            <div className="flex flex-col sm:flex-row sm:items-center gap-3">
              <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as TabValue)} className="flex-1">
                <TabsList>
                  <TabsTrigger value="all">All Patients</TabsTrigger>
                  <TabsTrigger value="high-risk">High-Risk</TabsTrigger>
                  <TabsTrigger value="recent">Recent Activity</TabsTrigger>
                </TabsList>
              </Tabs>
              
              <div className="flex gap-2">
                <div className="relative w-64">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4" style={{ color: 'var(--gray-700)' }} />
                  <Input
                    placeholder="Search patients..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10 text-sm"
                  />
                </div>
                <Select value={filterValue} onValueChange={(v) => setFilterValue(v as FilterValue)}>
                  <SelectTrigger className="w-[160px]">
                    <Filter className="w-4 h-4 mr-2" />
                    <SelectValue placeholder="Filter by Risk" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Patients</SelectItem>
                    <SelectItem value="high-risk">High-Risk Only</SelectItem>
                    <SelectItem value="low-risk">Low-Risk Only</SelectItem>
                    <SelectItem value="newest">Newest First</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow style={{ borderColor: 'var(--gray-200)' }}>
                  <TableHead className="text-xs" style={{ color: 'var(--gray-700)' }}>Patient Name</TableHead>
                  <TableHead className="text-xs" style={{ color: 'var(--gray-700)' }}>Mood Status</TableHead>
                  <TableHead className="text-xs" style={{ color: 'var(--gray-700)' }}>Risk Level</TableHead>
                  <TableHead className="text-xs" style={{ color: 'var(--gray-700)' }}>AI Certainty</TableHead>
                  <TableHead className="text-xs" style={{ color: 'var(--gray-700)' }}>Total Entries</TableHead>
                  <TableHead className="text-xs" style={{ color: 'var(--gray-700)' }}>Last Entry</TableHead>
                  <TableHead className="text-xs" style={{ color: 'var(--gray-700)' }}>Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredPatients.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8" style={{ color: 'var(--gray-700)' }}>
                      No patients found matching your criteria
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredPatients.map((patient) => {
                    const riskLevel = getRiskLevel(patient.riskScore);
                    return (
                      <TableRow 
                        key={patient.id} 
                        className="hover:bg-[var(--gray-25)] cursor-pointer"
                        style={{ borderColor: 'var(--gray-200)' }}
                        onClick={() => navigate(`/patient/${patient.id}`)}
                      >
                        <TableCell className="text-sm">
                          <div className="flex items-center gap-3">
                            <Avatar className="w-8 h-8">
                              <AvatarFallback style={{ backgroundColor: 'var(--brand-600)', color: 'white', fontSize: '12px' }}>
                                {getInitials(patient.name)}
                              </AvatarFallback>
                            </Avatar>
                            <span className="font-medium">{patient.name}</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-sm">
                          {patient.latestStatus === 'not_depressed' ? (
                            <Badge 
                              variant="outline"
                              className="border-[var(--green-700)] text-[var(--green-700)] bg-green-50 text-xs"
                            >
                              Not Depressed
                            </Badge>
                          ) : (
                            <Badge 
                              variant="outline"
                              className="border-[var(--red-700)] text-[var(--red-700)] bg-red-50 text-xs"
                            >
                              Depressed
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-sm">
                          <div className="flex items-center gap-2">
                            <div 
                              className="w-2.5 h-2.5 rounded-full"
                              style={{ backgroundColor: riskLevel.color }}
                            />
                            <span style={{ color: riskLevel.color, fontSize: '14px' }}>
                              {riskLevel.label}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell className="font-medium text-sm">
                          {patient.confidence}%
                        </TableCell>
                        <TableCell className="text-sm">
                          {patient.totalEntries}
                        </TableCell>
                        <TableCell className="text-sm">
                          {formatDate(patient.lastEntryDate)}
                        </TableCell>
                        <TableCell>
                          <Button 
                            size="sm"
                            variant="ghost"
                            className="text-xs"
                            style={{ color: 'var(--brand-600)' }}
                            onClick={(e) => {
                              e.stopPropagation();
                              navigate(`/patient/${patient.id}`);
                            }}
                          >
                            <Eye className="w-3 h-3 mr-1" />
                            View Results
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      {/* Clinical Entry Modal */}
      <Dialog open={isEntryModalOpen} onOpenChange={setIsEntryModalOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Add Patient Entry</DialogTitle>
            <DialogDescription>
              <span className="font-medium" style={{ color: 'var(--gray-600)' }}>
                Patient: {selectedPatient?.name}
              </span>
            </DialogDescription>
            <p className="text-sm" style={{ color: 'var(--gray-700)' }}>
              Submit patient notes for MentalBERT analysis. Add your observations as needed.
            </p>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="patientNarrative" className="text-xs font-medium" style={{ color: 'var(--gray-700)' }}>
                Patient Notes <span className="text-red-700">*</span>
              </Label>
              <Textarea
                id="patientNarrative"
                placeholder="Enter patient's journal entry, observations, or conversation notes..."
                value={patientNarrative}
                onChange={(e) => setPatientNarrative(e.target.value)}
                className="text-sm p-4 max-h-[300px] overflow-y-auto"
                style={{ 
                  fontFamily: 'Inter',
                  whiteSpace: 'pre-wrap',
                  wordBreak: 'break-word',
                  borderColor: 'var(--gray-200)',
                  borderRadius: '8px'
                }}
                rows={8}
              />
              <p className="text-xs" style={{ color: 'var(--gray-700)' }}>
                This text will be analyzed by the MentalBERT AI model
              </p>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="practitionerNotes" className="text-xs font-medium" style={{ color: 'var(--gray-700)' }}>
                Your Clinical Notes
              </Label>
              <Textarea
                id="practitionerNotes"
                placeholder="Add your observations, context, or notes (optional)..."
                value={practitionerNotes}
                onChange={(e) => setPractitionerNotes(e.target.value)}
                className="text-sm p-4 max-h-[300px] overflow-y-auto"
                style={{ 
                  fontFamily: 'Inter',
                  whiteSpace: 'pre-wrap',
                  wordBreak: 'break-word',
                  borderColor: 'var(--gray-200)',
                  borderRadius: '8px'
                }}
                rows={4}
              />
              <p className="text-xs" style={{ color: 'var(--gray-700)' }}>
                Private notes for clinical records only
              </p>
            </div>

            {renderAnalysisSteps()}
          </div>
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => {
                setIsEntryModalOpen(false);
                setAnalysisStep(null);
              }}
              disabled={isAnalyzing}
            >
              Cancel
            </Button>
            <Button
              onClick={handleAnalyze}
              variant="outline"
              disabled={!patientNarrative.trim() || isAnalyzing}
            >
              {isAnalyzing && analysisStep ? 'Analyzing...' : 'Preview analysis'}
            </Button>
            <Button
              onClick={handleSaveEntry}
              style={{ backgroundColor: 'var(--brand-600)' }}
              disabled={!patientNarrative.trim() || isAnalyzing}
            >
              {isAnalyzing ? 'Saving...' : 'Save entry'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Patient Modal */}
      <Dialog open={isAddPatientModalOpen} onOpenChange={setIsAddPatientModalOpen}>
        <DialogContent className="max-w-lg" style={{ borderRadius: '12px', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)' }}>
          <DialogHeader>
            <DialogTitle style={{ fontFamily: 'Inter', color: 'var(--gray-900)', fontSize: '20px' }}>
              Register New Patient
            </DialogTitle>
            <DialogDescription>
              <p className="text-sm mt-1" style={{ color: 'var(--gray-700)' }}>
                Add a new patient to the monitoring system
              </p>
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-5 py-4">
            {/* Full Name */}
            <div className="space-y-2">
              <Label 
                htmlFor="newPatientName" 
                className="uppercase tracking-wide"
                style={{ 
                  fontFamily: 'Inter',
                  fontSize: '12px',
                  fontWeight: 500,
                  color: 'var(--gray-900)'
                }}
              >
                Full Name
              </Label>
              <Input
                id="newPatientName"
                placeholder="e.g., John Doe"
                value={newPatientName}
                onChange={(e) => {
                  setNewPatientName(e.target.value);
                  setNameError(false);
                }}
                className="p-3"
                style={{ 
                  fontFamily: 'Inter',
                  fontSize: '14px',
                  whiteSpace: 'pre-wrap',
                  wordBreak: 'break-word',
                  borderColor: nameError ? 'var(--red-700)' : 'var(--gray-200)',
                  borderRadius: '8px'
                }}
              />
              {nameError && (
                <p className="text-xs" style={{ color: 'var(--red-700)' }}>
                  Please enter a valid patient name
                </p>
              )}
            </div>

            {/* Date of Birth */}
            <div className="space-y-2">
              <Label 
                htmlFor="newPatientDob" 
                className="uppercase tracking-wide"
                style={{ 
                  fontFamily: 'Inter',
                  fontSize: '12px',
                  fontWeight: 500,
                  color: 'var(--gray-900)'
                }}
              >
                Date of Birth
              </Label>
              <div className="relative">
                <Input
                  id="newPatientDob"
                  type="date"
                  value={newPatientDob}
                  onChange={(e) => setNewPatientDob(e.target.value)}
                  className="p-3"
                  style={{ 
                    fontFamily: 'Inter',
                    fontSize: '14px',
                    borderColor: 'var(--gray-200)',
                    borderRadius: '8px'
                  }}
                />
              </div>
            </div>
          </div>
          <DialogFooter className="gap-3 pt-4">
            <Button 
              variant="outline" 
              onClick={() => {
                setIsAddPatientModalOpen(false);
                setNewPatientName('');
                setNewPatientId('');
                setNewPatientDob('');
                setNameError(false);
              }}
              className="text-sm"
              style={{ 
                color: 'var(--gray-600)',
                borderColor: 'var(--gray-200)'
              }}
            >
              Cancel
            </Button>
            <Button 
              onClick={handleAddPatient}
              className="text-sm font-medium"
              style={{ 
                backgroundColor: 'var(--brand-600)',
                borderRadius: '8px',
                color: 'white'
              }}
            >
              Register Patient
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}