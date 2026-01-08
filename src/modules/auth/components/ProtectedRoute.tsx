import { Navigate, Outlet, useLocation } from 'react-router-dom';

export const ProtectedRoute = () => {
    const token = localStorage.getItem('token');
    const storedUser = localStorage.getItem('user');
    const user = storedUser ? JSON.parse(storedUser) : null;
    const location = useLocation();

    // If no token, redirect to login
    if (!token) {
        return <Navigate to="/login" replace />;
    }

    // If user has no family and is NOT already on family-setup, redirect there
    // Exception: allow /onboarding for users who already have a familyId
    const noFamilyPaths = ['/family-setup', '/join'];
    const isOnNoFamilyPath = noFamilyPaths.some(path => location.pathname.startsWith(path));

    if (!user?.familyId && !isOnNoFamilyPath) {
        return <Navigate to="/family-setup" replace />;
    }

    // If token exists and user has family (or is on family-setup), render child routes
    return <Outlet />;
};
