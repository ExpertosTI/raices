import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import './shared/styles/global.css'
import { GoogleOAuthProvider } from '@react-oauth/google';

const GOOGLE_CLIENT_ID = "PLACEHOLDER_CLIENT_ID"; // Replace with env variable later

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
      <App />
    </GoogleOAuthProvider>
  </StrictMode>,
)
