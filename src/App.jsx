import React, { Suspense } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { UserProvider } from './context/UserContext';
import { useAuth } from './context/useAuth';

// Layout and Core elements loaded synchronously
import Layout from './components/Layout';
import Landing from './pages/Landing';
import Dashboard from './pages/Dashboard';
import NotFound from './pages/NotFound';

// Features loaded lazily for performance code-splitting
const ResumeAnalyzer = React.lazy(() => import('./pages/ResumeAnalyzer'));
const ResumeTailor = React.lazy(() => import('./pages/ResumeTailor'));
const EmployabilityReport = React.lazy(() => import('./pages/EmployabilityReport'));
const EmailGenerator = React.lazy(() => import('./pages/EmailGenerator'));
const BlogWriter = React.lazy(() => import('./pages/BlogWriter'));
const AiInterviewer = React.lazy(() => import('./pages/AiInterviewer'));
const ReadComprehension = React.lazy(() => import('./pages/ReadComprehension'));
const Profile = React.lazy(() => import('./pages/Profile'));
const AiToolsHub = React.lazy(() => import('./pages/AiToolsHub'));
const Settings = React.lazy(() => import('./pages/Settings'));
const AdminPanel = React.lazy(() => import('./pages/AdminPanel'));
const CourseDetail = React.lazy(() => import('./pages/CourseDetail'));
const QuizViewer = React.lazy(() => import('./pages/QuizViewer'));
const CertificateViewer = React.lazy(() => import('./pages/CertificateViewer'));
import { ThemeProvider } from './context/ThemeContext';


function AuthLoadingScreen() {
  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'grid',
        placeItems: 'center',
        background: 'var(--bg-hero)',
        color: 'white',
        fontSize: '1rem',
        fontWeight: 600,
      }}
    >
      Restoring your learning session...
    </div>
  );
}

function ProtectedRoute({ children }) {
  const { isAuthenticated, isLoadingAuth } = useAuth();
  if (isLoadingAuth) {
    return <AuthLoadingScreen />;
  }
  return isAuthenticated ? children : <Navigate to="/" replace />;
}

function AdminRoute({ children }) {
  const { user, isAuthenticated, isLoadingAuth } = useAuth();
  if (isLoadingAuth) {
    return <AuthLoadingScreen />;
  }
  if (!isAuthenticated) {
    return <Navigate to="/" replace />;
  }
  if (user?.role !== 'admin') {
    return <Navigate to="/dashboard" replace />;
  }
  return children;
}


function AppRoutes() {
  const { isAuthenticated, isLoadingAuth } = useAuth();
  // ... rest follows the same protected route logic. We will replace the whole AppRoutes function and App component
  
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin"></div>
      </div>
    }>
      <Routes>
        <Route path="/" element={isLoadingAuth ? <AuthLoadingScreen /> : (isAuthenticated ? <Navigate to="/dashboard" replace /> : <Landing />)} />
        <Route path="/dashboard" element={<ProtectedRoute><Layout><Dashboard /></Layout></ProtectedRoute>} />
        <Route path="/course/:id" element={<ProtectedRoute><Layout><CourseDetail /></Layout></ProtectedRoute>} />
        <Route path="/quiz/:id" element={<ProtectedRoute><Layout><QuizViewer /></Layout></ProtectedRoute>} />
        <Route path="/certificate/:id" element={<ProtectedRoute><Layout><CertificateViewer /></Layout></ProtectedRoute>} />
        <Route path="/interview" element={<ProtectedRoute><Layout><AiInterviewer /></Layout></ProtectedRoute>} />
        <Route path="/resume" element={<ProtectedRoute><Layout><ResumeAnalyzer /></Layout></ProtectedRoute>} />
        <Route path="/resume-tailor" element={<ProtectedRoute><Layout><ResumeTailor /></Layout></ProtectedRoute>} />
        <Route path="/report" element={<ProtectedRoute><Layout><EmployabilityReport /></Layout></ProtectedRoute>} />
        <Route path="/email-writer" element={<ProtectedRoute><Layout><EmailGenerator /></Layout></ProtectedRoute>} />
        <Route path="/blog-writer" element={<ProtectedRoute><Layout><BlogWriter /></Layout></ProtectedRoute>} />
        <Route path="/read-comprehension" element={<ProtectedRoute><Layout><ReadComprehension /></Layout></ProtectedRoute>} />
        <Route path="/profile" element={<ProtectedRoute><Layout><Profile /></Layout></ProtectedRoute>} />
        <Route path="/ai-tools" element={<ProtectedRoute><Layout><AiToolsHub /></Layout></ProtectedRoute>} />
        <Route path="/settings" element={<ProtectedRoute><Layout><Settings /></Layout></ProtectedRoute>} />
        <Route path="/admin" element={<AdminRoute><Layout><AdminPanel /></Layout></AdminRoute>} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </Suspense>
  );
}

function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <UserProvider>
          <AppRoutes />
        </UserProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;
