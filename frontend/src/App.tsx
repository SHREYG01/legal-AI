import { BrowserRouter, Routes, Route } from "react-router-dom";
import LandingPage from "./pages/LandingPage";
import DashboardPage from "./pages/DashboardPage";
import ContractsPage from "./pages/ContractsPage";
import ContractAnalysisPage from "./pages/ContractAnalysisPage";
import AskAIPage from "./pages/AskAIPage";
import ComparisonPage from "./pages/ComparisonPage";
import DashboardLayout from "./layouts/DashboardLayout";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route element={<DashboardLayout />}>
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/contracts" element={<ContractsPage />} />
          <Route path="/contracts/:id" element={<ContractAnalysisPage />} />
          <Route path="/ask-ai" element={<AskAIPage />} />
          <Route path="/compare" element={<ComparisonPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
