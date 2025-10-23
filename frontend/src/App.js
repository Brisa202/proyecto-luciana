import { Routes, Route, Navigate } from 'react-router-dom';
import ProtectedRoute from './components/ProtectedRoute';

import Landing from './pages/Landing';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';

import Employees from './pages/Employees';
import EmployeeCreate from './pages/EmployeeCreate';

import Products from './pages/Products';
import ProductCreate from './pages/ProductCreate';

import Incidents from './pages/Incidents';
import IncidentCreate from './pages/IncidentCreate';

import Rentals from './pages/Rentals';
import RentalCreate from './pages/RentalCreate';

import RentalEdit from './pages/RentalEdit';

import Clients from './pages/Clients';
import ClientForm from './pages/ClientForm';


export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/login" element={<Login />} />

      {/* protegidas por token */}
      <Route
        path="/dashboard"
        element={<ProtectedRoute><Dashboard /></ProtectedRoute>}
      />
      <Route
        path="/empleados"
        element={<ProtectedRoute><Employees /></ProtectedRoute>}
      />
      <Route
        path="/empleados/nuevo"
        element={<ProtectedRoute><EmployeeCreate /></ProtectedRoute>}
      />
      <Route
        path="/empleados/:id/editar"
        element={<ProtectedRoute><EmployeeCreate /></ProtectedRoute>}
      />

      {/* comodín */}
      <Route path="*" element={<Navigate to="/dashboard" replace />} />

      <Route path="/productos" element={<ProtectedRoute><Products /></ProtectedRoute>} />
      <Route path="/productos/nuevo" element={<ProtectedRoute><ProductCreate /></ProtectedRoute>} />
      <Route path="/productos/:id/editar" element={<ProtectedRoute><ProductCreate /></ProtectedRoute>} />

      <Route path="/incidentes" element={<ProtectedRoute><Incidents /></ProtectedRoute>} />
      <Route path="/incidentes/nuevo" element={<ProtectedRoute><IncidentCreate /></ProtectedRoute>} />
      <Route path="/incidentes/:id/editar" element={<ProtectedRoute><IncidentCreate /></ProtectedRoute>} /> 
      <Route path="/alquileres" element={<ProtectedRoute><Rentals /></ProtectedRoute>} />
      <Route path="/alquileres/nuevo" element={<ProtectedRoute><RentalCreate /></ProtectedRoute>} />
      <Route path="/alquileres/:id/editar" element={<ProtectedRoute><RentalEdit /></ProtectedRoute>} />
      <Route path="/clientes" element={<ProtectedRoute><Clients /></ProtectedRoute>} />
      <Route path="/clientes/nuevo" element={<ProtectedRoute><ClientForm /></ProtectedRoute>} />
      <Route path="/clientes/:id/editar" element={<ProtectedRoute><ClientForm /></ProtectedRoute>} />
    </Routes>
  );

}
