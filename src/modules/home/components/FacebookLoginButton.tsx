import { useEffect, useState } from 'react';

// Declare FB on window
declare global {
    interface Window {
        FB: any;
        fbAsyncInit: () => void;
    }
}

interface FacebookLoginButtonProps {
    onSuccess: (data: any) => void;
    onError: (error: string) => void;
}

export const FacebookLoginButton = ({ onSuccess, onError }: FacebookLoginButtonProps) => {
    const [isSdkLoaded, setIsSdkLoaded] = useState(false);

    useEffect(() => {
        // Load Facebook SDK
        if (document.getElementById('facebook-jssdk')) {
            setIsSdkLoaded(true);
            return;
        }

        window.fbAsyncInit = function () {
            window.FB.init({
                appId: import.meta.env.VITE_FACEBOOK_APP_ID, // Will need this vars
                cookie: true,
                xfbml: true,
                version: 'v18.0'
            });
            setIsSdkLoaded(true);
        };

        const script = document.createElement('script');
        script.id = 'facebook-jssdk';
        script.src = "https://connect.facebook.net/en_US/sdk.js";
        script.async = true;
        script.defer = true;
        document.body.appendChild(script);

        return () => {
            // Cleanup if needed
        };
    }, []);

    const handleLogin = () => {
        if (!window.FB) {
            onError('Facebook SDK no está listo.');
            return;
        }

        window.FB.login((response: any) => {
            if (response.authResponse) {
                // User authorized
                exchangeToken(response.authResponse.accessToken, response.authResponse.userID);
            } else {
                // User cancelled
                console.log('User cancelled login or did not fully authorize.');
            }
        }, { scope: 'public_profile,email' });
    };

    const exchangeToken = async (accessToken: string, userID: string) => {
        try {
            const res = await fetch('/api/auth/facebook', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ accessToken, userID }),
            });

            if (res.ok) {
                const data = await res.json();
                onSuccess(data);
            } else {
                const err = await res.json();
                onError(err.error || 'Falló el inicio de sesión con Facebook');
            }
        } catch (err) {
            onError('Error de conexión con el servidor');
        }
    };

    return (
        <button
            onClick={handleLogin}
            disabled={!isSdkLoaded}
            style={{
                backgroundColor: '#1877F2',
                color: 'white',
                border: 'none',
                borderRadius: '999px',
                padding: '10px 20px',
                fontSize: '14px',
                fontWeight: 600,
                cursor: isSdkLoaded ? 'pointer' : 'not-allowed',
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                width: '250px',
                justifyContent: 'center',
                opacity: isSdkLoaded ? 1 : 0.7,
                marginTop: '10px'
            }}
        >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="white">
                <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.791-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
            </svg>
            Continuar con Facebook
        </button>
    );
};
