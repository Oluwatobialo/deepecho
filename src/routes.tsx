import { createBrowserRouter, Navigate } from 'react-router';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import PatientDetail from './pages/PatientDetail';
import AnalysisResults from './pages/AnalysisResults';
import Settings from './pages/Settings';
import ProtectedRoute from './components/ProtectedRoute';

export const router = createBrowserRouter([
  { path: '/', Component: Login },
  { path: '/register', Component: Register },
  {
    element: <ProtectedRoute />,
    children: [
      { path: '/dashboard', Component: Dashboard },
      { path: '/patient/:patientId', Component: PatientDetail },
      { path: '/analysis-results', Component: AnalysisResults },
      { path: '/settings', Component: Settings },
    ],
  },
  { path: '*', element: <Navigate to="/" replace /> },
]);
