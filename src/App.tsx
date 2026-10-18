import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { DataProvider } from '@/context/DataContext';
import { AppLayout } from '@/components/AppLayout';
import { DashboardPage } from '@/pages/DashboardPage';
import { MyPlantsPage } from '@/pages/MyPlantsPage';
import { PlantDetailsPage } from '@/pages/PlantDetailsPage';
import { AnalysisPage } from '@/pages/AnalysisPage';
import { SensorHistoryPage } from '@/pages/SensorHistoryPage';
import { AlertsPage } from '@/pages/AlertsPage';
import { SettingsPage } from '@/pages/SettingsPage';
import { NotFoundPage } from '@/pages/NotFoundPage';

function App() {
  return (
    <BrowserRouter>
      <DataProvider>
        <AppLayout>
          <Routes>
            <Route path="/" element={<DashboardPage />} />
            <Route path="/plants" element={<MyPlantsPage />} />
            <Route path="/plants/:id" element={<PlantDetailsPage />} />
            <Route path="/analysis" element={<AnalysisPage />} />
            <Route path="/sensors" element={<SensorHistoryPage />} />
            <Route path="/alerts" element={<AlertsPage />} />
            <Route path="/settings" element={<SettingsPage />} />
            <Route path="*" element={<NotFoundPage />} />
          </Routes>
        </AppLayout>
      </DataProvider>
    </BrowserRouter>
  );
}

export default App;
