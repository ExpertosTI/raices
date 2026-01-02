import { GoogleLogin } from '@react-oauth/google';
import { useNavigate } from 'react-router-dom';
import './LoginScreen.css';

export const LoginScreen = () => {
    const navigate = useNavigate();

    const handleSuccess = async (credentialResponse: any) => {
        try {
            const res = await fetch('/api/auth/google', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ credential: credentialResponse.credential }),
            });

            if (res.ok) {
                const data = await res.json();
                localStorage.setItem('token', data.token);
                localStorage.setItem('user', JSON.stringify(data.user));
                navigate('/app');
            } else {
                console.error('Login failed');
            }
        } catch (error) {
            console.error('Error logging in:', error);
        }
    };

    return (
        <div className="login-screen">
            <div className="login-card">
                <h1>Raíces App</h1>
                <p>Ingresa para acceder al árbol familiar</p>

                <div className="google-btn-container">
                    <GoogleLogin
                        onSuccess={handleSuccess}
                        onError={() => console.log('Login Failed')}
                        useOneTap
                    />
                </div>
            </div>
        </div>
    );
};
