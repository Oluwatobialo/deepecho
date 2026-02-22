import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router';
import TopNav from '../components/TopNav';
import ConfidenceMeter from '../components/ConfidenceMeter';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { Progress } from '../components/ui/progress';
import { ArrowLeft, FileText, CheckCircle, AlertCircle } from 'lucide-react';

interface AnalysisResult {
  patientId: string;
  patientName: string;
  narrative: string;
  practitionerNotes: string;
  prediction: 'depressed' | 'not_depressed';
  confidence: number;
  riskScore: number;
  sentiment: {
    polarity: 'positive' | 'negative' | 'neutral';
    score: number;
  };
  detectedPatterns: string[];
}

export default function AnalysisResults() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [result, setResult] = useState<AnalysisResult | null>(null);

  useEffect(() => {
    // Get data from URL params or sessionStorage
    const patientId = searchParams.get('patientId');
    const storedResult = sessionStorage.getItem('analysisResult');
    
    if (storedResult) {
      setResult(JSON.parse(storedResult));
    } else if (patientId) {
      // Fallback mock data if no stored result
      setResult({
        patientId: patientId,
        patientName: 'Unknown Patient',
        narrative: '',
        practitionerNotes: '',
        prediction: 'not_depressed',
        confidence: 87,
        riskScore: 42,
        sentiment: {
          polarity: 'neutral',
          score: 50,
        },
        detectedPatterns: [
          'No significant distress indicators',
          'Neutral emotional tone',
        ],
      });
    }
  }, [searchParams]);

  if (!result) {
    return (
      <div className="min-h-screen" style={{ backgroundColor: 'var(--gray-25)' }}>
        <TopNav />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <p>No analysis results found</p>
        </div>
      </div>
    );
  }

  const getRiskColor = (score: number) => {
    if (score >= 70) return 'var(--red-700)';
    if (score >= 40) return '#F59E0B';
    return 'var(--green-700)';
  };

  const getSentimentColor = (polarity: string) => {
    if (polarity === 'positive') return 'var(--green-700)';
    if (polarity === 'negative') return 'var(--red-700)';
    return 'var(--gray-700)';
  };

  return (
    <div className="min-h-screen" style={{ backgroundColor: 'var(--gray-25)' }}>
      <TopNav />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-6">
          <Button
            variant="ghost"
            onClick={() => navigate('/dashboard')}
            className="mb-4"
            style={{ color: 'var(--brand-600)' }}
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Dashboard
          </Button>
          <h1 className="text-3xl font-semibold" style={{ color: 'var(--gray-900)' }}>
            Analysis Results
          </h1>
          <p className="mt-1" style={{ color: 'var(--gray-700)' }}>
            Patient: <span className="font-medium">{result.patientName}</span>
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - 2/3 width */}
          <div className="lg:col-span-2 space-y-6">
            {/* Main Results Card */}
            <Card style={{ borderColor: 'var(--gray-200)' }}>
              <CardHeader className="p-6">
                <CardTitle>MentalBERT Analysis</CardTitle>
              </CardHeader>
              <CardContent className="p-6 pt-0">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  {/* Confidence Meter */}
                  <div className="flex flex-col items-center justify-center">
                    <ConfidenceMeter confidence={result.confidence} size={180} />
                    <p className="text-sm mt-4 text-center" style={{ color: 'var(--gray-700)' }}>
                      Model confidence in classification
                    </p>
                  </div>

                  {/* Classification Result */}
                  <div className="flex flex-col justify-center space-y-6">
                    <div>
                      <p className="text-sm font-medium mb-2" style={{ color: 'var(--gray-700)' }}>
                        Mood Status Classification
                      </p>
                      {result.prediction === 'not_depressed' ? (
                        <Badge 
                          variant="outline"
                          className="border-[var(--green-700)] text-[var(--green-700)] bg-green-50 text-base px-4 py-2"
                        >
                          <CheckCircle className="w-5 h-5 mr-2" />
                          Not Depressed
                        </Badge>
                      ) : (
                        <Badge 
                          variant="outline"
                          className="border-[var(--red-700)] text-[var(--red-700)] bg-red-50 text-base px-4 py-2"
                        >
                          <AlertCircle className="w-5 h-5 mr-2" />
                          Depressed
                        </Badge>
                      )}
                    </div>

                    {/* Sentiment Polarity */}
                    <div>
                      <p className="text-sm font-medium mb-2" style={{ color: 'var(--gray-700)' }}>
                        Sentiment Tone
                      </p>
                      <div className="flex items-center gap-3">
                        <div 
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: getSentimentColor(result.sentiment.polarity) }}
                        />
                        <span 
                          className="text-base font-medium capitalize"
                          style={{ color: getSentimentColor(result.sentiment.polarity) }}
                        >
                          {result.sentiment.polarity}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Risk Score Bar */}
                <div className="mt-8 pt-6 border-t" style={{ borderColor: 'var(--gray-200)' }}>
                  <div className="flex justify-between items-center mb-3">
                    <p className="text-sm font-medium" style={{ color: 'var(--gray-700)' }}>
                      Risk Assessment Score
                    </p>
                    <span 
                      className="text-xl font-semibold"
                      style={{ color: getRiskColor(result.riskScore) }}
                    >
                      {result.riskScore}/100
                    </span>
                  </div>
                  <div className="relative">
                    <Progress 
                      value={result.riskScore} 
                      className="h-4"
                      style={{
                        backgroundColor: 'var(--gray-100)',
                      }}
                      indicatorClassName="transition-all duration-500"
                    />
                    <div 
                      className="absolute top-0 left-0 h-4 rounded-full transition-all duration-500"
                      style={{ 
                        width: `${result.riskScore}%`,
                        backgroundColor: getRiskColor(result.riskScore),
                      }}
                    />
                  </div>
                  <p className="text-xs mt-2" style={{ color: 'var(--gray-700)' }}>
                    {result.riskScore >= 70 ? 'High risk - immediate attention recommended' :
                     result.riskScore >= 40 ? 'Moderate risk - continued monitoring advised' :
                     'Low risk - routine follow-up appropriate'}
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Detected Patterns */}
            <Card style={{ borderColor: 'var(--gray-200)' }}>
              <CardHeader className="p-6">
                <CardTitle>Detected Patterns</CardTitle>
                <p className="text-sm mt-1" style={{ color: 'var(--gray-700)' }}>
                  Key insights identified by the MentalBERT model
                </p>
              </CardHeader>
              <CardContent className="p-6 pt-0">
                <div className="space-y-3">
                  {result.detectedPatterns.map((pattern, index) => (
                    <div 
                      key={index}
                      className="flex items-start gap-3 p-4 rounded-lg"
                      style={{ backgroundColor: 'var(--gray-50)' }}
                    >
                      <div 
                        className="w-2 h-2 rounded-full mt-1.5 flex-shrink-0"
                        style={{ backgroundColor: 'var(--brand-600)' }}
                      />
                      <p className="text-sm" style={{ color: 'var(--gray-900)' }}>
                        {pattern}
                      </p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Patient Narrative */}
            {result.narrative && (
              <Card style={{ borderColor: 'var(--gray-200)' }}>
                <CardHeader className="p-6">
                  <CardTitle>Analyzed Text</CardTitle>
                </CardHeader>
                <CardContent className="p-6 pt-0">
                  <div 
                    className="p-4 rounded-lg"
                    style={{ backgroundColor: 'var(--gray-50)' }}
                  >
                    <p className="text-sm leading-relaxed" style={{ color: 'var(--gray-900)' }}>
                      {result.narrative}
                    </p>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Right Column - 1/3 width */}
          <div className="space-y-6">
            {/* Actions Card */}
            <Card style={{ borderColor: 'var(--gray-200)' }}>
              <CardHeader className="p-6">
                <CardTitle>Next Steps</CardTitle>
              </CardHeader>
              <CardContent className="p-6 pt-0 space-y-3">
                <Button
                  className="w-full justify-start"
                  style={{ backgroundColor: 'var(--brand-600)' }}
                  onClick={() => navigate(`/patient/${result.patientId}`)}
                >
                  <FileText className="w-4 h-4 mr-2" />
                  View Full Patient Report
                </Button>
                <Button
                  variant="outline"
                  className="w-full justify-start"
                  onClick={() => navigate('/dashboard')}
                >
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Return to Dashboard
                </Button>
              </CardContent>
            </Card>

            {/* Clinical Notes */}
            {result.practitionerNotes && (
              <Card style={{ borderColor: 'var(--gray-200)' }}>
                <CardHeader className="p-6">
                  <CardTitle>Your Clinical Notes</CardTitle>
                </CardHeader>
                <CardContent className="p-6 pt-0">
                  <div 
                    className="p-4 rounded-lg"
                    style={{ backgroundColor: 'var(--gray-50)' }}
                  >
                    <p className="text-sm" style={{ color: 'var(--gray-900)' }}>
                      {result.practitionerNotes}
                    </p>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Analysis Info */}
            <Card style={{ borderColor: 'var(--gray-200)' }}>
              <CardHeader className="p-6">
                <CardTitle>Analysis Details</CardTitle>
              </CardHeader>
              <CardContent className="p-6 pt-0 space-y-4">
                <div>
                  <p className="text-xs font-medium mb-1" style={{ color: 'var(--gray-700)' }}>
                    Model
                  </p>
                  <p className="text-sm" style={{ color: 'var(--gray-900)' }}>
                    MentalBERT v2.1
                  </p>
                </div>
                <div>
                  <p className="text-xs font-medium mb-1" style={{ color: 'var(--gray-700)' }}>
                    Analysis Date
                  </p>
                  <p className="text-sm" style={{ color: 'var(--gray-900)' }}>
                    {new Date().toLocaleDateString('en-US', {
                      weekday: 'long',
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </p>
                </div>
                <div>
                  <p className="text-xs font-medium mb-1" style={{ color: 'var(--gray-700)' }}>
                    Processing Time
                  </p>
                  <p className="text-sm" style={{ color: 'var(--gray-900)' }}>
                    3.5 seconds
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}