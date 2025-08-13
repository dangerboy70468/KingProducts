import { useState } from "react";
import { ReactNode } from "react";
import {
  BrowserRouter as Router,
  Route,
  Routes,
  Navigate,
} from "react-router-dom";
import { Sidebar } from "./components/Sidebar";
import { Dashboard } from "./components/Dashboard";
import { ProductManagement } from "./components/ProductManagement";
import { ClientManagement } from "./components/ClientManagement";
import { EmployeeManagement } from "./components/EmployeeManagement";
import { OrderManagement } from "./components/OrderManagement";
import { InventoryManagement } from "./components/InventoryManagement";
import { DistributionManagement } from "./components/DistributionManagement";
import { AttendanceManagement } from "./components/AttendanceManagement";
import { PayrollManagement } from "./components/PayrollManagement";
import { SalesManagement } from "./components/SalesManagement";
import { ToProduce } from "./components/ToProduce";
import { Header } from "./components/Header";
import { Login } from "./components/Login";
// TODO: Create an axios instance with base URL
// export const api = axios.create({
//   baseURL: 'http://localhost:3000/api',
//   headers: {
//     'Content-Type': 'application/json'
//   }
// });
// Protected Route Component

interface ProtectedRouteProps {
  children: ReactNode;
}

const ProtectedRoute = ({ children }: ProtectedRouteProps) => {
  // Check for JWT token
  const token = localStorage.getItem("token");
  if (!token) {
    return <Navigate to="/login" replace />;
  }
  return children;
};
export function App() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  return (
    <Router>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route
          path="/*"
          element={
            <ProtectedRoute>
              <div className="flex h-screen bg-[#c3e0e5] overflow-hidden">
                <Sidebar isOpen={isSidebarOpen} setIsOpen={setIsSidebarOpen} />
                <div className="flex flex-col flex-1 w-0">
                  <Header
                    toggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)}
                  />
                  <main className="flex-1 overflow-y-auto p-4 bg-[#c3e0e5]">
                    <Routes>
                      <Route path="/" element={<Dashboard />} />
                      <Route path="/dashboard" element={<Dashboard />} />
                      <Route path="/products" element={<ProductManagement />} />
                      <Route path="/clients" element={<ClientManagement />} />
                      <Route path="/orders" element={<OrderManagement />} />
                      <Route
                        path="/employees"
                        element={<EmployeeManagement />}
                      />
                      <Route
                        path="/inventory"
                        element={<InventoryManagement />}
                      />
                      <Route
                        path="/distribution"
                        element={<DistributionManagement />}
                      />
                      <Route
                        path="/attendance"
                        element={<AttendanceManagement />}
                      />
                      <Route path="/payroll" element={<PayrollManagement />} />
                      <Route path="/sales" element={<SalesManagement />} />
                      <Route path="/to-produce" element={<ToProduce />} />
                    </Routes>
                  </main>
                </div>
              </div>
            </ProtectedRoute>
          }
        />
      </Routes>
    </Router>
  );
}
