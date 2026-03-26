import { Route, Routes } from "react-router-dom";
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

import { ProtectedRoute } from "./components/ProtectedRoute";
import { Layout } from "./components/Layout";
import { LoginPage } from "./pages/LoginPage";
import { RegisterPage } from "./pages/RegisterPage";
import { DashboardPage } from "./pages/DashboardPage";
import { LeadsPage } from "./pages/LeadsPage";
import { DealersPage } from "./pages/DealersPage";
import { DealerProfilePage } from "./pages/DealerProfilePage";
import { OrdersPage } from "./pages/OrdersPage";
import { OrderDetailsPage } from "./pages/OrderDetailsPage";
import { PaymentsPage } from "./pages/PaymentsPage";
import { SchemesPage } from "./pages/SchemesPage";
import { ComplaintsPage } from "./pages/ComplaintsPage";
import { ComplaintDetailsPage } from "./pages/ComplaintDetailsPage";
import { SalesTeamPage } from "./pages/SalesTeamPage";
import { SalesProfilePage } from "./pages/SalesProfilePage";
import { NotFoundPage } from "./pages/NotFoundPage";

function App() {
  return (
    <>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />

        <Route element={<ProtectedRoute />}>
          <Route element={<Layout />}>
            <Route index element={<DashboardPage />} />
            <Route path="leads" element={<LeadsPage />} />
            <Route path="dealers" element={<DealersPage />} />
            <Route path="dealers/:id" element={<DealerProfilePage />} />
            <Route path="dealer-profile" element={<DealerProfilePage />} />
            <Route path="orders" element={<OrdersPage />} />
            <Route path="orders/:id" element={<OrderDetailsPage />} />
            <Route path="payments" element={<PaymentsPage />} />
            <Route path="schemes" element={<SchemesPage />} />
            <Route path="complaints" element={<ComplaintsPage />} />
            <Route path="complaints/:id" element={<ComplaintDetailsPage />} />
            <Route path="sales" element={<SalesTeamPage />} />
            <Route path="sales/:id" element={<SalesProfilePage />} />
            <Route path="sales-profile" element={<SalesProfilePage />} />
          </Route>
        </Route>

        <Route path="*" element={<NotFoundPage />} />
      </Routes>
      <ToastContainer position="top-right" autoClose={2500} hideProgressBar />
    </>
  );
}

export default App;
