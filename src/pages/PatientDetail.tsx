import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router';
import TopNav from '../components/TopNav';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '../components/ui/dialog';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Textarea } from '../components/ui/textarea';
import { Progress } from '../components/ui/progress';
import { Switch } from '../components/ui/switch';
import ConfidenceMeter from '../components/ConfidenceMeter';
import {
  fetchPatient,
  fetchEntries,
  createEntry,
  analyzeText,
  flagPatientForFollowup,
  toStoredResult,
  type AnalyzeResponse,
  type PatientResponse,
  type JournalEntryResponse,
} from '../lib/api';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from 'recharts';
import { ArrowLeft, CheckCircle, XCircle, Plus, Calendar, Download, Flag, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

type AnalysisStep = 'preprocessing' | 'mentalbert' | 'complete' | null;

function escapeHtml(s: string): string {
  const map: Record<string, string> = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
  return s.replace(/[&<>"']/g, (ch) => map[ch] ?? ch);
}

function entryToDisplay(e: JournalEntryResponse, pid: string): { id: string; patientId: string; date: string; text: string; prediction: 'depressed' | 'not_depressed'; confidence: number; riskScore: number; sentiment: { joy: number; sadness: number; fear: number }; practitionerNotes?: string } {
  const d = e.created_at.split('T')[0];
  return {
    id: String(e.id),
    patientId: pid,
    date: d,
    text: e.text,
    prediction: e.prediction as 'depressed' | 'not_depressed',
    confidence: e.confidence,
    riskScore: e.risk_score,
    sentiment: { joy: e.sentiment_polarity === 'positive' ? (e.sentiment_score ?? 50) : 0, sadness: e.sentiment_polarity === 'negative' ? (e.sentiment_score ?? 50) : 0, fear: 0 },
    practitionerNotes: e.practitioner_notes ?? undefined,
  };
}

export default function PatientDetail() {
  const { patientId } = useParams();
  const navigate = useNavigate();
  const [processing, setProcessing] = useState(false);
  const [validated, setValidated] = useState(false);
  const [validationType, setValidationType] = useState<'confirmed' | 'overridden' | null>(null);
  const [flaggedForFollowup, setFlaggedForFollowup] = useState(false);

  const [patient, setPatient] = useState<PatientResponse | null>(null);
  const [entries, setEntries] = useState<JournalEntryResponse[]>([]);
  const [loading, setLoading] = useState(true);

  const [isEntryModalOpen, setIsEntryModalOpen] = useState(false);
  const [patientNarrative, setPatientNarrative] = useState('');
  const [practitionerNotes, setPractitionerNotes] = useState('');
  const [analysisStep, setAnalysisStep] = useState<AnalysisStep>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [lastAnalysisResult, setLastAnalysisResult] = useState<AnalyzeResponse | null>(null);

  useEffect(() => {
    if (!patientId) return;
    const id = Number(patientId);
    if (Number.isNaN(id)) {
      setPatient(null);
      setEntries([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    Promise.all([fetchPatient(id), fetchEntries(id)])
      .then(([p, es]) => {
        setPatient(p);
        setEntries(es);
        setFlaggedForFollowup(p.flagged_for_followup ?? false);
      })
      .catch(() => {
        setPatient(null);
        setEntries([]);
      })
      .finally(() => setLoading(false));
  }, [patientId]);

  const pid = patientId ?? '';
  const patientEntries = entries.map(e => entryToDisplay(e, pid));
  const latestEntry = patientEntries[0] ?? null;
  const historicalData = patientEntries.map(e => ({ date: e.date, riskScore: e.riskScore }));

  // When patient is not in mock list (e.g. new patient or after refresh), show report from stored analysis if available
  const [storedReport, setStoredReport] = useState<{
    patientId: string;
    patientName: string;
    narrative: string;
    practitionerNotes: string;
    prediction: 'depressed' | 'not_depressed';
    confidence: number;
    riskScore: number;
    sentiment: { polarity: string; score: number };
    detectedPatterns: string[];
  } | null>(null);

  useEffect(() => {
    if (latestEntry?.practitionerValidation) {
      setValidated(true);
      setValidationType(latestEntry.practitionerValidation);
    }
  }, [latestEntry]);

  useEffect(() => {
    if (patientId) {
      try {
        const raw = sessionStorage.getItem('analysisResult');
        if (raw) {
          const data = JSON.parse(raw);
          if (data.patientId === patientId) setStoredReport(data);
          else setStoredReport(null);
        } else setStoredReport(null);
      } catch {
        setStoredReport(null);
      }
    } else setStoredReport(null);
  }, [patientId]);

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col" style={{ backgroundColor: 'var(--gray-25)' }}>
        <TopNav />
        <div className="flex-1 flex items-center justify-center px-4 py-8">
          <div className="flex flex-col items-center gap-4">
            <Loader2 className="w-10 h-10 animate-spin" style={{ color: 'var(--brand-600)' }} />
            <p className="text-sm" style={{ color: 'var(--gray-700)' }}>Loading patient...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!patient) {
    if (storedReport && storedReport.patientId === patientId) {
      const getRiskColor = (score: number) => {
        if (score >= 70) return 'var(--red-700)';
        if (score >= 40) return '#F59E0B';
        return 'var(--green-700)';
      };
      return (
        <div className="min-h-screen" style={{ backgroundColor: 'var(--gray-25)' }}>
          <TopNav />
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <Button
              variant="ghost"
              className="mb-4"
              onClick={() => navigate('/analysis-results')}
              style={{ color: 'var(--brand-600)' }}
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Analysis Results
            </Button>
            <h1 className="text-3xl font-semibold mb-1" style={{ color: 'var(--gray-900)' }}>
              {storedReport.patientName}
            </h1>
            <p className="text-sm mb-6" style={{ color: 'var(--gray-700)' }}>
              Patient ID: {storedReport.patientId}
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card style={{ borderColor: 'var(--gray-200)' }}>
                <CardHeader>
                  <CardTitle>Mood Status</CardTitle>
                </CardHeader>
                <CardContent>
                  <Badge
                    variant="outline"
                    className={storedReport.prediction === 'depressed' ? 'border-[var(--red-700)] text-[var(--red-700)] bg-red-50' : 'border-[var(--green-700)] text-[var(--green-700)] bg-green-50'}
                  >
                    {storedReport.prediction === 'depressed' ? 'Depressed' : 'Not Depressed'}
                  </Badge>
                  <p className="text-sm mt-3" style={{ color: 'var(--gray-700)' }}>
                    Confidence: <strong>{storedReport.confidence}%</strong>
                  </p>
                  <p className="text-sm" style={{ color: 'var(--gray-700)' }}>
                    Risk Score: <strong style={{ color: getRiskColor(storedReport.riskScore) }}>{storedReport.riskScore}/100</strong>
                  </p>
                </CardContent>
              </Card>
              <Card style={{ borderColor: 'var(--gray-200)' }}>
                <CardHeader>
                  <CardTitle>Patient Narrative</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm whitespace-pre-wrap" style={{ color: 'var(--gray-900)' }}>{storedReport.narrative || '—'}</p>
                </CardContent>
              </Card>
            </div>
            {storedReport.detectedPatterns?.length > 0 && (
              <Card className="mt-6" style={{ borderColor: 'var(--gray-200)' }}>
                <CardHeader>
                  <CardTitle>Detected Patterns</CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="list-disc list-inside text-sm space-y-1" style={{ color: 'var(--gray-700)' }}>
                    {storedReport.detectedPatterns.map((p, i) => <li key={i}>{p}</li>)}
                  </ul>
                </CardContent>
              </Card>
            )}
            <Button
              className="mt-6"
              variant="outline"
              onClick={() => navigate('/dashboard')}
            >
              Return to Dashboard
            </Button>
          </div>
        </div>
      );
    }
    return (
      <div className="min-h-screen" style={{ backgroundColor: 'var(--gray-25)' }}>
        <TopNav />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <p>Patient not found</p>
          <Button className="mt-4" variant="outline" onClick={() => navigate('/dashboard')}>
            Return to Dashboard
          </Button>
        </div>
      </div>
    );
  }

  const handleValidation = (action: 'confirm' | 'override') => {
    setProcessing(true);
    setValidationType(action === 'confirm' ? 'confirmed' : 'overridden');
    
    // Simulate processing
    setTimeout(() => {
      setProcessing(false);
      setValidated(true);
    }, 1500);
  };

  const getRiskColor = (score: number) => {
    if (score >= 70) return 'var(--red-700)';
    if (score >= 40) return '#F59E0B';
    return 'var(--green-700)';
  };

  const handleDownloadPDF = () => {
    if (!patient) return;
    const reportDate = new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
    const dob = patient.date_of_birth
      ? new Date(patient.date_of_birth).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
      : '—';
    const latestStatus = patient.latest_status === 'not_depressed' ? 'Not Depressed' : 'Depressed';
    const entriesRows = patientEntries
      .map(
        (e) =>
          `<tr>
            <td class="cell-date">${new Date(e.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</td>
            <td class="cell-text">${escapeHtml((e.text || '').slice(0, 500))}${(e.text || '').length > 500 ? '…' : ''}</td>
            <td class="cell-class">${e.prediction === 'depressed' ? 'Depressed' : 'Not Depressed'}</td>
            <td class="cell-conf">${e.confidence}%</td>
            <td class="cell-notes">${escapeHtml((e.practitionerNotes || '—').slice(0, 300))}${(e.practitionerNotes || '').length > 300 ? '…' : ''}</td>
          </tr>`
      )
      .join('');
    const practitionerNotesSection =
      latestEntry?.practitionerNotes?.trim() ?
        `<section class="section">
          <h2 class="section-title">Practitioner Notes (Latest)</h2>
          <p class="notes-text">${escapeHtml(latestEntry.practitionerNotes)}</p>
        </section>`
        : '';

    const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Patient Report - ${escapeHtml(patient.name)}</title>
  <style>
    * { box-sizing: border-box; }
    body { font-family: 'Segoe UI', system-ui, sans-serif; color: #1a1a1a; margin: 0; padding: 24px 32px; font-size: 12px; line-height: 1.4; }
    .header { border-bottom: 2px solid #0d9488; padding-bottom: 12px; margin-bottom: 20px; }
    .logo { font-size: 18px; font-weight: 700; color: #0d9488; letter-spacing: -0.02em; }
    .sub { font-size: 10px; color: #64748b; margin-top: 2px; }
    h1 { font-size: 16px; margin: 0 0 4px 0; font-weight: 600; }
    .meta { color: #64748b; font-size: 11px; margin-bottom: 16px; }
    .summary { display: flex; gap: 24px; flex-wrap: wrap; margin-bottom: 20px; }
    .summary-item { background: #f1f5f9; padding: 10px 14px; border-radius: 8px; }
    .summary-item strong { display: block; font-size: 10px; text-transform: uppercase; letter-spacing: 0.05em; color: #64748b; margin-bottom: 4px; }
    .section { margin-bottom: 20px; }
    .section-title { font-size: 13px; font-weight: 600; margin: 0 0 10px 0; color: #0d9488; }
    table { width: 100%; border-collapse: collapse; font-size: 11px; }
    th { text-align: left; padding: 8px 10px; background: #0d9488; color: #fff; font-weight: 600; }
    td { padding: 8px 10px; border-bottom: 1px solid #e2e8f0; vertical-align: top; }
    .cell-date { white-space: nowrap; }
    .cell-text, .cell-notes { max-width: 280px; word-break: break-word; }
    .cell-class { font-weight: 500; }
    .notes-text { white-space: pre-wrap; background: #f8fafc; padding: 10px; border-radius: 6px; margin: 0; }
    .footer { margin-top: 28px; padding-top: 12px; border-top: 1px solid #e2e8f0; font-size: 10px; color: #64748b; }
    @media print { body { padding: 16px 24px; } }
  </style>
</head>
<body>
  <div class="header">
    <div class="logo">DeepEcho</div>
    <div class="sub">Clinical Platform — Patient Report</div>
  </div>
  <h1>${escapeHtml(patient.name)}</h1>
  <p class="meta">Report date: ${reportDate} · Patient ID: #${patient.id}</p>
  <div class="summary">
    <div class="summary-item"><strong>Date of birth</strong>${dob}</div>
    <div class="summary-item"><strong>Risk score</strong>${(patient.risk_score ?? latestEntry?.riskScore) != null ? (patient.risk_score ?? latestEntry?.riskScore) + '/100' : '—'}</div>
    <div class="summary-item"><strong>Latest status</strong>${latestStatus}</div>
    <div class="summary-item"><strong>AI certainty</strong>${(latestEntry?.confidence ?? patient.confidence) != null ? (latestEntry?.confidence ?? patient.confidence) + '%' : '—'}</div>
  </div>
  <section class="section">
    <h2 class="section-title">Journal entries</h2>
    <table>
      <thead><tr><th>Date</th><th>Excerpt</th><th>Classification</th><th>Confidence</th><th>Practitioner notes</th></tr></thead>
      <tbody>${entriesRows || '<tr><td colspan="5">No entries.</td></tr>'}</tbody>
    </table>
  </section>
  ${practitionerNotesSection}
  <div class="footer">Generated by DeepEcho Clinical Platform</div>
  <script>
    window.onload = function() { window.print(); window.onafterprint = function() { window.close(); }; };
  </script>
</body>
</html>`;

    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      toast.error('Popup blocked. Please allow popups to print the report.');
      return;
    }
    printWindow.document.write(html);
    printWindow.document.close();
    printWindow.focus();
  };

  const handleAddEntry = () => {
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
    if (!patientId || !patient || !patientNarrative.trim()) return;
    setIsAnalyzing(true);
    setAnalysisStep('preprocessing');
    try {
      setAnalysisStep('mentalbert');
      const entry = await createEntry(Number(patientId), patientNarrative.trim(), practitionerNotes || undefined);
      const detectedPatterns: string[] = entry.detected_patterns
        ? (typeof entry.detected_patterns === 'string' ? JSON.parse(entry.detected_patterns) : entry.detected_patterns)
        : [];
      const analysisResult = {
        patientId,
        patientName: patient.name,
        narrative: entry.text,
        practitionerNotes: entry.practitioner_notes ?? '',
        prediction: entry.prediction as 'depressed' | 'not_depressed',
        confidence: entry.confidence,
        riskScore: entry.risk_score,
        sentiment: { polarity: (entry.sentiment_polarity ?? 'neutral') as 'positive' | 'negative' | 'neutral', score: entry.sentiment_score ?? 50 },
        detectedPatterns,
      };
      sessionStorage.setItem('analysisResult', JSON.stringify(analysisResult));
      setEntries(prev => [entry, ...prev]);
      toast.success('Entry saved');
      setIsEntryModalOpen(false);
      setPatientNarrative('');
      setPractitionerNotes('');
      setAnalysisStep(null);
      setLastAnalysisResult(null);
      navigate('/analysis-results');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to save entry');
    } finally {
      setIsAnalyzing(false);
      setAnalysisStep(null);
    }
  };

  const renderAnalysisSteps = () => {
    if (!analysisStep) return null;

    return (
      <div className="py-4 space-y-3">
        {/* Step 1: Cleaning Text */}
        <div className="flex items-center gap-3">
          <div 
            className={`w-8 h-8 rounded-full flex items-center justify-center ${
              analysisStep === 'preprocessing' ? 'animate-pulse' : ''
            }`}
            style={{
              backgroundColor: 
                analysisStep === 'mentalbert' || analysisStep === 'complete' 
                  ? 'var(--green-700)' 
                  : analysisStep === 'preprocessing'
                  ? 'var(--brand-600)'
                  : 'var(--gray-200)',
              color: analysisStep === 'preprocessing' || analysisStep === 'mentalbert' || analysisStep === 'complete' ? 'white' : 'var(--gray-700)'
            }}
          >
            {analysisStep === 'mentalbert' || analysisStep === 'complete' ? '✓' : '1'}
          </div>
          <div>
            <p className="text-sm font-medium">Cleaning Text</p>
            <p className="text-xs" style={{ color: 'var(--gray-700)' }}>
              {analysisStep === 'preprocessing' ? 'Preparing text for analysis...' : 'Complete'}
            </p>
          </div>
        </div>

        {/* Step 2: MentalBERT Analysis */}
        <div className="flex items-center gap-3">
          <div 
            className={`w-8 h-8 rounded-full flex items-center justify-center ${
              analysisStep === 'mentalbert' ? 'animate-pulse' : ''
            }`}
            style={{
              backgroundColor: 
                analysisStep === 'complete' 
                  ? 'var(--green-700)' 
                  : analysisStep === 'mentalbert'
                  ? 'var(--brand-600)'
                  : 'var(--gray-200)',
              color: analysisStep === 'mentalbert' || analysisStep === 'complete' ? 'white' : 'var(--gray-700)'
            }}
          >
            {analysisStep === 'complete' ? '✓' : '2'}
          </div>
          <div>
            <p className="text-sm font-medium">MentalBERT Analysis</p>
            <p className="text-xs" style={{ color: 'var(--gray-700)' }}>
              {analysisStep === 'mentalbert' ? 'Running AI model...' : 
               analysisStep === 'complete' ? 'Complete' : 'Waiting...'}
            </p>
          </div>
        </div>

        {/* Step 3: Finalizing Report */}
        <div className="flex items-center gap-3">
          <div 
            className={`w-8 h-8 rounded-full flex items-center justify-center ${
              analysisStep === 'complete' ? 'animate-pulse' : ''
            }`}
            style={{
              backgroundColor: analysisStep === 'complete' ? 'var(--green-700)' : 'var(--gray-200)',
              color: analysisStep === 'complete' ? 'white' : 'var(--gray-700)'
            }}
          >
            {analysisStep === 'complete' ? '✓' : '3'}
          </div>
          <div>
            <p className="text-sm font-medium">Finalizing Report</p>
            <p className="text-xs" style={{ color: 'var(--gray-700)' }}>
              {analysisStep === 'complete' ? 'Complete' : 'Waiting...'}
            </p>
          </div>
        </div>

        {/* Results Summary */}
        {analysisStep === 'complete' && (
          <div className="mt-4 p-4 rounded-lg" style={{ backgroundColor: 'var(--gray-50)', borderLeft: '4px solid var(--brand-600)' }}>
            <p className="text-sm font-medium mb-2">Analysis Complete</p>
            <div className="space-y-1 text-xs" style={{ color: 'var(--gray-700)' }}>
              <p>• Mood Status: <span className="font-medium">{lastAnalysisResult ? (lastAnalysisResult.prediction === 'depressed' ? 'Depressed' : 'Not Depressed') : '—'}</span></p>
              <p>• AI Certainty: <span className="font-medium">{lastAnalysisResult ? `${lastAnalysisResult.confidence}%` : '—'}</span></p>
              <p>• Risk Score: <span className="font-medium">{lastAnalysisResult ? `${lastAnalysisResult.risk_score}/100` : '—'}</span></p>
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="min-h-screen" style={{ backgroundColor: 'var(--gray-25)' }}>
      <TopNav />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex flex-col gap-4 mb-6">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <Button
                variant="ghost"
                className="mb-4"
                onClick={() => navigate('/dashboard')}
                style={{ color: 'var(--brand-600)' }}
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Dashboard
              </Button>
              <div className="flex items-center gap-4">
                <h1 className="text-3xl font-semibold" style={{ color: 'var(--gray-900)' }}>
                  {patient.name}
                </h1>
                {/* Flag for Follow-up Toggle */}
                <div className="flex items-center gap-2 p-2 rounded-lg" style={{ backgroundColor: flaggedForFollowup ? 'var(--yellow-50)' : 'var(--gray-50)' }}>
                  <Flag 
                    className="w-4 h-4" 
                    style={{ color: flaggedForFollowup ? '#F59E0B' : 'var(--gray-700)' }} 
                  />
                  <span className="text-sm font-medium" style={{ color: 'var(--gray-700)' }}>
                    Flag for Follow-up
                  </span>
                  <Switch
                    checked={flaggedForFollowup}
                    onCheckedChange={async (checked) => {
                      if (!patient) return;
                      try {
                        const updated = await flagPatientForFollowup(patient.id, checked);
                        setFlaggedForFollowup(updated.flagged_for_followup);
                        setPatient(updated);
                        toast.success(checked ? 'Patient flagged for follow-up' : 'Follow-up flag removed');
                      } catch {
                        toast.error('Failed to update follow-up flag');
                      }
                    }}
                    className={flaggedForFollowup ? '[&[data-state=checked]]:bg-[#F59E0B]' : ''}
                  />
                </div>
              </div>
              <p className="mt-1" style={{ color: 'var(--gray-700)' }}>
                Patient Results & Analysis
              </p>
            </div>
            <div className="flex items-center gap-3">
              <Button
                variant="outline"
                onClick={handleDownloadPDF}
                style={{ borderColor: 'var(--gray-200)' }}
              >
                <Download className="w-4 h-4 mr-2" />
                Download PDF Report
              </Button>
              <Button
                onClick={handleAddEntry}
                style={{ backgroundColor: 'var(--brand-600)' }}
              >
                <Plus className="w-4 h-4 mr-2" />
                Add Patient Entry
              </Button>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - 2/3 width */}
          <div className="lg:col-span-2 space-y-6">
            {/* Latest Analysis Card */}
            {latestEntry && (
              <Card style={{ borderColor: 'var(--gray-200)' }}>
                <CardHeader className="p-6">
                  <CardTitle>Latest Analysis</CardTitle>
                  <p className="text-sm mt-1" style={{ color: 'var(--gray-700)' }}>
                    Submitted on {new Date(latestEntry.date).toLocaleDateString('en-US', { 
                      weekday: 'long', 
                      year: 'numeric', 
                      month: 'long', 
                      day: 'numeric' 
                    })}
                  </p>
                </CardHeader>
                <CardContent className="p-6 pt-0 space-y-6">
                  {/* Mood Status - Large Pill Badge */}
                  <div>
                    <p className="text-sm font-medium mb-3" style={{ color: 'var(--gray-700)' }}>
                      Mood Status
                    </p>
                    {latestEntry.prediction === 'not_depressed' ? (
                      <Badge 
                        variant="outline"
                        className="border-[var(--green-700)] text-[var(--green-700)] bg-green-50 text-lg px-6 py-3"
                      >
                        <CheckCircle className="w-5 h-5 mr-2" />
                        Not Depressed
                      </Badge>
                    ) : (
                      <Badge 
                        variant="outline"
                        className="border-[var(--red-700)] text-[var(--red-700)] bg-red-50 text-lg px-6 py-3"
                      >
                        <XCircle className="w-5 h-5 mr-2" />
                        Depressed
                      </Badge>
                    )}
                  </div>

                  {/* AI Certainty */}
                  <div className="flex items-center justify-center py-4">
                    <div className="text-center">
                      <ConfidenceMeter confidence={latestEntry.confidence} size={160} />
                      <p className="text-sm mt-3" style={{ color: 'var(--gray-700)' }}>
                        AI Certainty: <span className="font-semibold text-lg">{latestEntry.confidence}%</span>
                      </p>
                    </div>
                  </div>

                  {/* Risk Score - Horizontal Progress Bar */}
                  <div>
                    <div className="flex justify-between items-center mb-3">
                      <p className="text-sm font-medium" style={{ color: 'var(--gray-700)' }}>
                        Risk Score
                      </p>
                      <span 
                        className="text-2xl font-semibold"
                        style={{ color: getRiskColor(latestEntry.riskScore) }}
                      >
                        {latestEntry.riskScore}<span className="text-lg">/100</span>
                      </span>
                    </div>
                    <div className="relative">
                      <Progress 
                        value={latestEntry.riskScore} 
                        className="h-6"
                        style={{
                          backgroundColor: 'var(--gray-100)',
                        }}
                      />
                      <div 
                        className="absolute top-0 left-0 h-6 rounded-full transition-all duration-500"
                        style={{ 
                          width: `${latestEntry.riskScore}%`,
                          backgroundColor: getRiskColor(latestEntry.riskScore),
                        }}
                      />
                    </div>
                    <p className="text-xs mt-2" style={{ color: 'var(--gray-700)' }}>
                      {latestEntry.riskScore >= 70 ? 'High risk - immediate attention recommended' :
                       latestEntry.riskScore >= 40 ? 'Medium risk - continued monitoring advised' :
                       'Low risk - routine follow-up appropriate'}
                    </p>
                  </div>

                  {/* Patient Text */}
                  <div>
                    <p className="text-sm font-medium mb-2" style={{ color: 'var(--gray-700)' }}>
                      Patient Text
                    </p>
                    <div 
                      className="p-4 rounded-lg"
                      style={{ backgroundColor: 'var(--gray-50)' }}
                    >
                      <p className="text-sm leading-relaxed whitespace-pre-wrap break-words" style={{ color: 'var(--gray-900)' }}>
                        {latestEntry.text}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Expert Verification Section */}
            {latestEntry && (
              <Card style={{ borderColor: validated ? 'var(--green-200)' : 'var(--gray-200)' }}>
                <CardHeader className="p-6">
                  <CardTitle>Expert Verification</CardTitle>
                  <p className="text-sm mt-1" style={{ color: 'var(--gray-700)' }}>
                    {validated 
                      ? 'You have verified this analysis' 
                      : 'Review and verify the AI analysis result'}
                  </p>
                </CardHeader>
                <CardContent className="p-6 pt-0">
                  {validated ? (
                    <div className="p-4 rounded-lg" style={{ backgroundColor: 'var(--green-50)', borderLeft: '4px solid var(--green-700)' }}>
                      <div className="flex items-center gap-2">
                        <CheckCircle className="w-5 h-5" style={{ color: 'var(--green-700)' }} />
                        <p className="text-sm font-medium" style={{ color: 'var(--green-700)' }}>
                          {validationType === 'confirmed' ? 'AI Result Confirmed' : 'AI Result Overridden'}
                        </p>
                      </div>
                      <p className="text-xs mt-2" style={{ color: 'var(--gray-700)' }}>
                        {validationType === 'confirmed' 
                          ? 'You confirmed the AI classification matches your clinical judgment.'
                          : 'You indicated the AI classification does not match your clinical judgment.'}
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <p className="text-sm" style={{ color: 'var(--gray-700)' }}>
                        Do you agree with the AI's assessment?
                      </p>
                      <div className="flex gap-3">
                        <Button
                          className="flex-1"
                          variant="outline"
                          style={{ 
                            borderColor: 'var(--green-700)', 
                            color: 'var(--green-700)' 
                          }}
                          onClick={() => handleValidation('confirm')}
                          disabled={processing}
                        >
                          <CheckCircle className="w-4 h-4 mr-2" />
                          Confirm AI Result
                        </Button>
                        <Button
                          className="flex-1"
                          variant="outline"
                          style={{ 
                            borderColor: 'var(--red-700)', 
                            color: 'var(--red-700)' 
                          }}
                          onClick={() => handleValidation('override')}
                          disabled={processing}
                        >
                          <XCircle className="w-4 h-4 mr-2" />
                          Override Result
                        </Button>
                      </div>
                      {processing && (
                        <p className="text-xs text-center" style={{ color: 'var(--gray-700)' }}>
                          Saving your verification...
                        </p>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Progress Over Time Chart */}
            <Card style={{ borderColor: 'var(--gray-200)' }}>
              <CardHeader className="p-6">
                <CardTitle>Mood History (Last 30 Days)</CardTitle>
                <p className="text-sm mt-1" style={{ color: 'var(--gray-700)' }}>
                  Track risk score changes over time
                </p>
              </CardHeader>
              <CardContent className="p-6 pt-0">
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={historicalData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--gray-100)" />
                    <XAxis 
                      dataKey="date" 
                      tickFormatter={(value) => new Date(value).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                      stroke="var(--gray-700)"
                    />
                    <YAxis 
                      domain={[0, 100]} 
                      stroke="var(--gray-700)"
                    />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: 'white', 
                        border: '1px solid var(--gray-200)',
                        borderRadius: '8px'
                      }}
                    />
                    <defs>
                      <linearGradient id="colorRisk" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="var(--brand-600)" stopOpacity={0.8}/>
                        <stop offset="95%" stopColor="var(--brand-600)" stopOpacity={0.1}/>
                      </linearGradient>
                    </defs>
                    <Line 
                      type="monotone" 
                      dataKey="riskScore" 
                      stroke="var(--brand-600)" 
                      strokeWidth={3}
                      fill="url(#colorRisk)"
                      dot={false}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Previous Entries Timeline */}
            <Card style={{ borderColor: 'var(--gray-200)' }}>
              <CardHeader className="p-6">
                <CardTitle>Previous Entries</CardTitle>
                <p className="text-sm mt-1" style={{ color: 'var(--gray-700)' }}>
                  Historical patient notes and analysis results
                </p>
              </CardHeader>
              <CardContent className="p-6 pt-0 space-y-4">
                {patientEntries.map((entry, index) => (
                  <div 
                    key={entry.id} 
                    className="border-l-4 pl-4 py-3"
                    style={{ borderColor: entry.prediction === 'depressed' ? 'var(--red-700)' : 'var(--green-700)' }}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4" style={{ color: 'var(--gray-700)' }} />
                        <span className="text-sm font-medium" style={{ color: 'var(--gray-700)' }}>
                          {new Date(entry.date).toLocaleDateString('en-US', { 
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric'
                          })}
                        </span>
                      </div>
                      {entry.prediction === 'not_depressed' ? (
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
                    </div>
                    <p className="text-sm leading-relaxed whitespace-pre-wrap break-words mb-3" style={{ color: 'var(--gray-900)' }}>
                      {entry.text}
                    </p>
                    <div className="flex items-center gap-4 text-xs" style={{ color: 'var(--gray-700)' }}>
                      <span>AI Certainty: <span className="font-medium">{entry.confidence}%</span></span>
                      <span>Risk Score: <span className="font-medium">{entry.riskScore}/100</span></span>
                      {entry.practitionerValidation && (
                        <Badge variant="secondary" className="text-xs">
                          {entry.practitionerValidation === 'confirmed' ? 'Confirmed' : 'Overridden'}
                        </Badge>
                      )}
                    </div>
                    {entry.practitionerNotes && (
                      <div className="mt-3 p-3 rounded" style={{ backgroundColor: 'var(--gray-50)' }}>
                        <p className="text-xs font-medium mb-1" style={{ color: 'var(--gray-700)' }}>
                          Practitioner Notes:
                        </p>
                        <p className="text-sm whitespace-pre-wrap break-words" style={{ color: 'var(--gray-900)' }}>
                          {entry.practitionerNotes}
                        </p>
                      </div>
                    )}
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>

          {/* Right Column - 1/3 width */}
          <div className="space-y-6">
            {/* Patient Info Card */}
            <Card style={{ borderColor: 'var(--gray-200)' }}>
              <CardHeader className="p-6">
                <CardTitle>Patient Information</CardTitle>
              </CardHeader>
              <CardContent className="p-6 pt-0 space-y-4">
                <div>
                  <p className="text-xs font-medium mb-1" style={{ color: 'var(--gray-700)' }}>
                    Patient ID
                  </p>
                  <p className="text-sm" style={{ color: 'var(--gray-900)' }}>
                    #{patient.id}
                  </p>
                </div>
                <div>
                  <p className="text-xs font-medium mb-1" style={{ color: 'var(--gray-700)' }}>
                    Total Entries
                  </p>
                  <p className="text-sm" style={{ color: 'var(--gray-900)' }}>
                    {patient.total_entries} submissions
                  </p>
                </div>
                <div>
                  <p className="text-xs font-medium mb-1" style={{ color: 'var(--gray-700)' }}>
                    Last Entry Date
                  </p>
                  <p className="text-sm" style={{ color: 'var(--gray-900)' }}>
                    {patient.last_entry_date
                      ? new Date(patient.last_entry_date).toLocaleDateString('en-US', {
                          month: 'long', day: 'numeric', year: 'numeric'
                        })
                      : 'No entries yet'}
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Current Status Summary */}
            <Card style={{ borderColor: 'var(--gray-200)' }}>
              <CardHeader className="p-6">
                <CardTitle>Current Status Summary</CardTitle>
              </CardHeader>
              <CardContent className="p-6 pt-0 space-y-4">
                <div>
                  <p className="text-xs font-medium mb-2" style={{ color: 'var(--gray-700)' }}>
                    Latest Status
                  </p>
                  {patient.latest_status === 'not_depressed' ? (
                    <Badge 
                      variant="outline"
                      className="border-[var(--green-700)] text-[var(--green-700)] bg-green-50"
                    >
                      Not Depressed
                    </Badge>
                  ) : (
                    <Badge 
                      variant="outline"
                      className="border-[var(--red-700)] text-[var(--red-700)] bg-red-50"
                    >
                      Depressed
                    </Badge>
                  )}
                </div>
                <div>
                  <p className="text-xs font-medium mb-2" style={{ color: 'var(--gray-700)' }}>
                    Current Risk Score
                  </p>
                  <div className="flex items-center gap-2">
                    <span 
                      className="text-2xl font-semibold"
                      style={{ color: getRiskColor(patient.risk_score ?? 0) }}
                    >
                      {patient.risk_score ?? '—'}
                    </span>
                    <span className="text-sm" style={{ color: 'var(--gray-700)' }}>/100</span>
                  </div>
                </div>
                <div>
                  <p className="text-xs font-medium mb-2" style={{ color: 'var(--gray-700)' }}>
                    AI Certainty
                  </p>
                  <span className="text-lg font-semibold">
                    {patient.confidence}%
                  </span>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* Add Entry Modal */}
      <Dialog open={isEntryModalOpen} onOpenChange={setIsEntryModalOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Add Patient Entry</DialogTitle>
            <DialogDescription>
              <span className="font-medium" style={{ color: 'var(--gray-600)' }}>
                Patient: {patient.name}
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
                  fontFamily: 'Inter Tight',
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
                  fontFamily: 'Inter Tight',
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
            {analysisStep !== 'complete' ? (
              <Button 
                onClick={handleAnalyze}
                style={{ backgroundColor: 'var(--brand-600)' }}
                disabled={!patientNarrative || isAnalyzing}
              >
                {isAnalyzing ? 'Analyzing...' : 'Analyze'}
              </Button>
            ) : (
              <Button 
                onClick={handleSaveEntry}
                style={{ backgroundColor: 'var(--green-700)' }}
              >
                Save Entry
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}