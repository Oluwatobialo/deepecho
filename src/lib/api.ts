/**
 * DeepEcho backend API client (FastAPI + MentalBERT local).
 * Set VITE_API_URL in .env or leave default to http://127.0.0.1:8002.
 * In dev, set VITE_API_URL= (empty) to use Vite proxy and avoid CORS.
 */

const getApiBase = (): string => {
  try {
    const env = (import.meta as { env?: { VITE_API_URL?: string } }).env;
    // Use VITE_API_URL if set (use "" in .env to hit same-origin and use Vite proxy)
    if (env?.VITE_API_URL !== undefined) return env.VITE_API_URL;
  } catch {
    // ignore
  }
  return "http://127.0.0.1:8002";
};
export const API_BASE = getApiBase();

const AUTH_TOKEN_KEY = "deepecho_token";

export function getToken(): string | null {
  return localStorage.getItem(AUTH_TOKEN_KEY);
}

export function setToken(token: string): void {
  localStorage.setItem(AUTH_TOKEN_KEY, token);
}

export function clearToken(): void {
  localStorage.removeItem(AUTH_TOKEN_KEY);
}

function fetchWithAuth(
  url: string,
  options: RequestInit = {}
): Promise<Response> {
  const token = getToken();
  const headers = new Headers(options.headers);
  if (token) headers.set("Authorization", `Bearer ${token}`);
  return fetch(url, { ...options, headers }).then((res) => {
    if (res.status === 401) {
      clearToken();
      window.location.href = "/";
    }
    return res;
  });
}

// --- Auth types and API ---
export interface UserResponse {
  id: string;  // UUID string from Supabase
  email: string;
  full_name: string;
  created_at: string;
}

export interface TokenResponse {
  access_token: string;
  token_type: string;
  user: UserResponse;
}

function isNetworkError(e: unknown): boolean {
  const msg = e instanceof Error ? e.message : String(e);
  return msg === "Failed to fetch" || msg.includes("fetch") || msg.includes("NetworkError") || msg.includes("Load failed");
}

export const SERVER_UNREACHABLE_MSG =
  "Backend is not running. Start it with run-backend.bat (project root) or run in a terminal: cd backend then py -m uvicorn main:app --host 127.0.0.1 --port 8002. See START.md for details.";

export async function login(email: string, password: string): Promise<TokenResponse> {
  let res: Response;
  try {
    res = await fetch(`${API_BASE}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
  } catch (e) {
    if (isNetworkError(e)) throw new Error(SERVER_UNREACHABLE_MSG);
    throw e;
  }
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.detail ?? "Login failed");
  }
  return res.json();
}

/** Response when email confirmation is required (no token until user confirms). */
export interface RegisterConfirmResponse {
  requires_confirmation: true;
  message: string;
}

export async function register(
  email: string,
  password: string,
  fullName: string
): Promise<TokenResponse | RegisterConfirmResponse> {
  let res: Response;
  try {
    res = await fetch(`${API_BASE}/api/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password, full_name: fullName }),
    });
  } catch (e) {
    if (isNetworkError(e)) throw new Error(SERVER_UNREACHABLE_MSG);
    throw e;
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const detail = data.detail;
    const message = Array.isArray(detail)
      ? detail.map((x: { msg?: string }) => x.msg ?? JSON.stringify(x)).join(" ")
      : typeof detail === "string"
        ? detail
        : detail?.message ?? "Registration failed";
    throw new Error(message || "Registration failed");
  }
  return data as TokenResponse | RegisterConfirmResponse;
}

export async function getMe(): Promise<UserResponse | null> {
  if (!getToken()) return null;
  const res = await fetchWithAuth(`${API_BASE}/api/auth/me`);
  if (!res.ok) return null;
  return res.json();
}

// --- Patients (API types match backend schemas) ---
export interface PatientResponse {
  id: number;
  name: string;
  date_of_birth: string | null;
  initial_concern: string | null;
  created_at: string;
  last_entry_date: string | null;
  latest_status: string | null;
  risk_score: number | null;
  confidence: number | null;
  total_entries: number;
}

export async function fetchPatients(): Promise<PatientResponse[]> {
  const res = await fetchWithAuth(`${API_BASE}/api/patients`);
  if (!res.ok) throw new Error("Failed to load patients");
  return res.json();
}

/** Thrown when duplicate patient is detected (409). Has matches array. */
export class DuplicatePatientError extends Error {
  matches: PatientResponse[];
  constructor(message: string, matches: PatientResponse[]) {
    super(message);
    this.name = "DuplicatePatientError";
    this.matches = matches;
  }
}

export async function createPatient(body: {
  name: string;
  date_of_birth?: string | null;
  initial_concern?: string | null;
  force?: boolean;
}): Promise<PatientResponse> {
  const res = await fetchWithAuth(`${API_BASE}/api/patients`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (res.status === 409 && data.detail === "duplicate_found" && Array.isArray(data.matches)) {
    throw new DuplicatePatientError("A patient with this name and date of birth already exists", data.matches);
  }
  if (!res.ok) {
    throw new Error(data.detail ?? "Failed to add patient");
  }
  return data as PatientResponse;
}

export async function fetchPatient(patientId: number): Promise<PatientResponse> {
  const res = await fetchWithAuth(`${API_BASE}/api/patients/${patientId}`);
  if (!res.ok) {
    if (res.status === 404) throw new Error("Patient not found");
    throw new Error("Failed to load patient");
  }
  return res.json();
}

// --- Journal entries ---
export interface JournalEntryResponse {
  id: number;
  patient_id: number;
  text: string;
  practitioner_notes: string | null;
  prediction: string;
  confidence: number;
  risk_score: number;
  sentiment_polarity: string | null;
  sentiment_score: number | null;
  detected_patterns: string | null;
  created_at: string;
}

export async function fetchEntries(patientId: number): Promise<JournalEntryResponse[]> {
  const res = await fetchWithAuth(`${API_BASE}/api/patients/${patientId}/entries`);
  if (!res.ok) throw new Error("Failed to load entries");
  return res.json();
}

export async function createEntry(
  patientId: number,
  text: string,
  practitionerNotes?: string | null
): Promise<JournalEntryResponse> {
  const res = await fetchWithAuth(`${API_BASE}/api/patients/${patientId}/entries`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text, practitioner_notes: practitionerNotes ?? null }),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.detail ?? "Failed to save entry");
  }
  return res.json();
}

export interface AnalyzeResponse {
  prediction: "depressed" | "not_depressed";
  confidence: number;
  risk_score: number;
  sentiment: { polarity: "positive" | "negative" | "neutral"; score: number };
  detected_patterns: string[];
}

export interface AnalysisResultForStorage {
  patientId: string;
  patientName: string;
  narrative: string;
  practitionerNotes: string;
  prediction: "depressed" | "not_depressed";
  confidence: number;
  riskScore: number;
  sentiment: { polarity: "positive" | "negative" | "neutral"; score: number };
  detectedPatterns: string[];
}

export async function analyzeText(
  text: string,
  practitionerNotes?: string | null
): Promise<AnalyzeResponse> {
  let res: Response;
  try {
    res = await fetchWithAuth(`${API_BASE}/api/analyze`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        text,
        practitioner_notes: practitionerNotes || null,
      }),
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (msg === "Failed to fetch" || msg.includes("fetch") || msg.includes("NetworkError")) {
      throw new Error(
        "Cannot reach the analysis server. In a new terminal run: cd backend then py -m uvicorn main:app --host 0.0.0.0 --port 8000"
      );
    }
    throw err;
  }
  if (!res.ok) {
    const detail = (await res.json().catch(() => ({}))).detail ?? res.statusText;
    throw new Error(detail);
  }
  return res.json();
}

/** Build the object saved to sessionStorage and used by AnalysisResults page. */
export function toStoredResult(
  api: AnalyzeResponse,
  patientId: string,
  patientName: string,
  narrative: string,
  practitionerNotes: string
): AnalysisResultForStorage {
  return {
    patientId,
    patientName,
    narrative,
    practitionerNotes,
    prediction: api.prediction,
    confidence: api.confidence,
    riskScore: api.risk_score,
    sentiment: api.sentiment,
    detectedPatterns: api.detected_patterns,
  };
}
