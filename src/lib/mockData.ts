export interface Patient {
  id: string;
  name: string;
  lastEntryDate: string;
  latestStatus: 'depressed' | 'not_depressed';
  riskScore: number;
  confidence: number;
  totalEntries: number;
  avatar?: string;
}

export interface JournalEntry {
  id: string;
  patientId: string;
  date: string;
  text: string;
  prediction: 'depressed' | 'not_depressed';
  confidence: number;
  riskScore: number;
  sentiment: {
    joy: number;
    sadness: number;
    fear: number;
  };
  practitionerValidation?: 'confirmed' | 'overridden';
  practitionerNotes?: string;
}

export interface HistoricalDataPoint {
  date: string;
  riskScore: number;
}

// Mock patients data
export const mockPatients: Patient[] = [
  {
    id: '1',
    name: 'Sarah Thompson',
    lastEntryDate: '2026-02-10',
    latestStatus: 'not_depressed',
    riskScore: 32,
    confidence: 92,
    totalEntries: 3,
    avatar: 'https://via.placeholder.com/50',
  },
  {
    id: '2',
    name: 'Michael Chen',
    lastEntryDate: '2026-02-09',
    latestStatus: 'depressed',
    riskScore: 78,
    confidence: 94,
    totalEntries: 3,
    avatar: 'https://via.placeholder.com/50',
  },
  {
    id: '3',
    name: 'Emily Rodriguez',
    lastEntryDate: '2026-02-10',
    latestStatus: 'not_depressed',
    riskScore: 28,
    confidence: 90,
    totalEntries: 1,
    avatar: 'https://via.placeholder.com/50',
  },
  {
    id: '4',
    name: 'James Wilson',
    lastEntryDate: '2026-02-08',
    latestStatus: 'depressed',
    riskScore: 82,
    confidence: 96,
    totalEntries: 1,
    avatar: 'https://via.placeholder.com/50',
  },
  {
    id: '5',
    name: 'Lisa Anderson',
    lastEntryDate: '2026-02-10',
    latestStatus: 'not_depressed',
    riskScore: 25,
    confidence: 90,
    totalEntries: 1,
    avatar: 'https://via.placeholder.com/50',
  },
  {
    id: '6',
    name: 'David Kim',
    lastEntryDate: '2026-02-07',
    latestStatus: 'not_depressed',
    riskScore: 41,
    confidence: 88,
    totalEntries: 1,
    avatar: 'https://via.placeholder.com/50',
  },
];

// Mock journal entries for patients
export const mockJournalEntries: JournalEntry[] = [
  {
    id: 'e1',
    patientId: '1',
    date: '2026-02-10',
    text: 'Today was a good day. I went for a walk in the park and felt really refreshed. The weather was nice and I met up with a friend for coffee. Feeling optimistic about the week ahead.',
    prediction: 'not_depressed',
    confidence: 92,
    riskScore: 32,
    sentiment: { joy: 75, sadness: 10, fear: 15 },
    practitionerValidation: 'confirmed',
  },
  {
    id: 'e2',
    patientId: '1',
    date: '2026-02-08',
    text: 'Had a productive day at work. Completed my project on time and received positive feedback from my manager. Feeling accomplished.',
    prediction: 'not_depressed',
    confidence: 88,
    riskScore: 28,
    sentiment: { joy: 80, sadness: 5, fear: 15 },
  },
  {
    id: 'e3',
    patientId: '1',
    date: '2026-02-06',
    text: 'Spent quality time with family over the weekend. We had dinner together and played some board games. These moments make me happy.',
    prediction: 'not_depressed',
    confidence: 90,
    riskScore: 25,
    sentiment: { joy: 85, sadness: 5, fear: 10 },
  },
  {
    id: 'e4',
    patientId: '2',
    date: '2026-02-09',
    text: "I don't see the point anymore. Everything feels heavy and I can't find joy in things I used to love. Just getting out of bed is exhausting. I feel so alone even when people are around me.",
    prediction: 'depressed',
    confidence: 94,
    riskScore: 78,
    sentiment: { joy: 5, sadness: 85, fear: 60 },
    practitionerValidation: 'confirmed',
    practitionerNotes: 'Patient showing clear signs of depressive episode. Scheduled follow-up session for tomorrow. Monitor closely.',
  },
  {
    id: 'e5',
    patientId: '2',
    date: '2026-02-07',
    text: 'Another sleepless night. My thoughts keep racing and I feel overwhelmed by everything. Work feels impossible and I keep making mistakes.',
    prediction: 'depressed',
    confidence: 89,
    riskScore: 81,
    sentiment: { joy: 8, sadness: 78, fear: 72 },
  },
  {
    id: 'e6',
    patientId: '2',
    date: '2026-02-05',
    text: "Can't shake this feeling of hopelessness. Nothing seems to matter anymore. I'm withdrawing from everyone because it's just easier.",
    prediction: 'depressed',
    confidence: 92,
    riskScore: 85,
    sentiment: { joy: 3, sadness: 90, fear: 68 },
  },
  {
    id: 'e7',
    patientId: '4',
    date: '2026-02-08',
    text: "The darkness feels endless. I wake up already exhausted, dreading the day ahead. My appetite is gone and nothing brings me comfort. I don't know how to ask for help.",
    prediction: 'depressed',
    confidence: 96,
    riskScore: 82,
    sentiment: { joy: 2, sadness: 92, fear: 75 },
  },
];

// Generate historical data for charts (30 days)
export function generateHistoricalData(patientId: string): HistoricalDataPoint[] {
  const data: HistoricalDataPoint[] = [];
  const today = new Date('2026-02-10');
  
  // Base risk scores for different patients
  const baseRisk: { [key: string]: number } = {
    '1': 30,
    '2': 80,
    '3': 25,
    '4': 85,
    '5': 22,
    '6': 40,
  };
  
  const base = baseRisk[patientId] || 50;
  
  for (let i = 29; i >= 0; i--) {
    const date = new Date(today);
    date.setDate(date.getDate() - i);
    
    // Add some variance to make it look realistic
    const variance = Math.random() * 20 - 10;
    const score = Math.max(0, Math.min(100, base + variance));
    
    data.push({
      date: date.toISOString().split('T')[0],
      riskScore: Math.round(score),
    });
  }
  
  return data;
}