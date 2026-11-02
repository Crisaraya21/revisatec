// src/main.jsx
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { GoogleOAuthProvider } from '@react-oauth/google'
import App from './App.jsx'
import { ThemeProvider } from './context/ThemeContext'
import { CourseProvider } from './context/CourseContext'
import './theme.css'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <GoogleOAuthProvider clientId={import.meta.env.VITE_GOOGLE_CLIENT_ID}>
      <ThemeProvider>
        <CourseProvider>
          <App />
        </CourseProvider>
      </ThemeProvider>
    </GoogleOAuthProvider>
  </StrictMode>,
)