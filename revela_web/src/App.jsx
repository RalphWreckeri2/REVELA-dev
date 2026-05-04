import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { ThemeProvider } from './context/ThemeContext';
import LoginPage from './pages/LoginPage';
import HomePage from './pages/HomePage';
import MapPage from './pages/MapPage';
import RegistryPage from './pages/RegistryPage';
import AnalyticsPage from './pages/AnalyticsPage';
import InspectionPage from './pages/InspectionPage';
import UserManagementPage from './pages/UserManagementPage';
import ExportReportsPage from './pages/ExportReportsPage';
import SettingsPage from './pages/SettingsPage';
import ProfilePage from './pages/ProfilePage';

function App() {
  return (
    <ThemeProvider>
      <BrowserRouter>
        <Routes>
        <Route path="/" element={<LoginPage />} />
        <Route path="/home" element={<HomePage />} />
        <Route path="/map" element={<MapPage />} />
        <Route path="/registry" element={<RegistryPage />} />
        <Route path="/analytics" element={<AnalyticsPage />} />
        <Route path="/inspections" element={<InspectionPage />} />
        <Route path="/users" element={<UserManagementPage />} />
        <Route path="/reports" element={<ExportReportsPage />} />
        <Route path="/settings" element={<SettingsPage />} />
        <Route path="/profile" element={<ProfilePage />} />
        </Routes>
      </BrowserRouter>
    </ThemeProvider>
  );
}

export default App;