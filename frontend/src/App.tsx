
import { useEffect, useState } from 'react'
import './App.css'

interface HealthResponse {
  status: string
  database: string
}

function App() {
  const [health, setHealth] = useState<HealthResponse | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/health')
      .then(response => {
        if (!response.ok) {
          throw new Error('Backend nicht erreichbar')
        }

        return response.json()
      })
      .then(data => setHealth(data))
      .catch(error => setError(error.message))
  }, [])

  return (
    <main>
      <h1>VideoStream</h1>

      <p>Meine persönliche Medienbibliothek</p>

      <h2>Backend-Verbindung</h2>

      {health && (
        <div>
          <p>Status: {health.status}</p>
          <p>Datenbank: {health.database}</p>
        </div>
      )}

      {error && (
        <p>Fehler: {error}</p>
      )}
    </main>
  )
}

export default App
