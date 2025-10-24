// src/App.jsx
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import Login from './pages/Auth/Login';
import Register from './pages/Auth/Register';
import ForgotPassword from './pages/Auth/ForgotPassword';
import ResetPassword from './pages/Auth/ResetPassword';
import Dashboard from './pages/Dashboard';
import ProtectedRoute from './components/ProtectedRoute';
import Layout from './components/Layout'; // New import
import UsersList from './pages/Users/UsersList';
import CompanyList from './pages/Companies/CompanyList';
import TechnicianList from './pages/Technicians/TechnicianList';
import ProductList from './pages/Products/ProductList';
import InventoryList from './pages/Inventory/InventoryList';
import InstallationPage from './pages/Installation/InstallationPage';
import CommissionList from './pages/Commission/CommisionList';
import OrderList from './pages/Order/OrderList';
import PaymentList from './pages/Payment/PaymentList';

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* Public routes */}
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/reset-password/:token" element={<ResetPassword />} />
          
          {/* Protected routes with layout */}
          <Route element={<ProtectedRoute />}>
            <Route element={<Layout />}>
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/installation" element={<InstallationPage />} />
              <Route path="/users" element={<UsersList />} />
              <Route path="/companies" element={<CompanyList />} />
              <Route path="/products" element={<ProductList />} />
              <Route path="/technicians" element={<TechnicianList />} />
              <Route path="/inventory" element={<InventoryList />} />
              <Route path="/commission" element={<CommissionList />} />
              <Route path="/order" element={<OrderList />} />\
              <Route path="/payment" element={<PaymentList />} />


              {/* Add other protected routes here */}
            </Route>
          </Route>
          
          <Route path="*" element={<Login />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;