import { BrowserRouter, Route, Routes } from "react-router-dom";
import LandingPage from "./pages/LandingPage";   // Import the new LandingPage
import AdminDashboard from "./pages/AdminDashboard";
import VoterDashboard from "./pages/VoterDashboard";

export const AppRoutes = () => {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<LandingPage />} /> {/* Landing page */}
        <Route path="/admin" element={<AdminDashboard />} />
        <Route path="/voter" element={<VoterDashboard />} />
      </Routes>
    </BrowserRouter>
  );
};
