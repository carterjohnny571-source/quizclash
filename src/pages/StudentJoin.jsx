import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { gameExists, joinGame, getOrCreatePlayerId, setSessionRoomCode } from '../firebase/database'

export default function StudentJoin() {
  const [roomCode, setRoomCode] = useState('')
  const [name, setName] = useState('')
  const [error, setError] = useState('')
  const [joining, setJoining] = useState(false)
  const navigate = useNavigate()

  const handleJoin = async (e) => {
    e.preventDefault()
    setError('')

    const code = roomCode.trim()
    const displayName = name.trim()

    if (!code || code.length !== 4) {
      setError('Enter a 4-digit room code')
      return
    }
    if (!displayName) {
      setError('Enter a display name')
      return
    }
    if (displayName.length > 20) {
      setError('Name must be 20 characters or less')
      return
    }

    setJoining(true)

    const exists = await gameExists(code)
    if (!exists) {
      setError('Game not found. Check the room code.')
      setJoining(false)
      return
    }

    const playerId = getOrCreatePlayerId()
    await joinGame(code, playerId, displayName)
    setSessionRoomCode(code)
    navigate('/play/game')
  }

  return (
    <div className="min-h-screen bg-dark-bg flex flex-col items-center justify-center p-6">
      <h1 className="text-4xl md:text-6xl font-bold mb-2 text-transparent bg-clip-text bg-gradient-to-r from-quiz-blue to-quiz-purple">
        QuizClash
      </h1>
      <p className="text-gray-400 text-lg mb-10">Join a Game</p>

      <form onSubmit={handleJoin} className="w-full max-w-sm space-y-4">
        <input
          type="text"
          inputMode="numeric"
          pattern="[0-9]*"
          maxLength={4}
          value={roomCode}
          onChange={e => setRoomCode(e.target.value.replace(/\D/g, ''))}
          placeholder="Room Code"
          className="w-full bg-dark-surface border-2 border-gray-600 rounded-xl px-4 py-4 text-center text-3xl font-mono font-bold text-white placeholder-gray-500 tracking-widest focus:border-quiz-yellow focus:outline-none"
          autoFocus
        />

        <input
          type="text"
          maxLength={20}
          value={name}
          onChange={e => setName(e.target.value)}
          placeholder="Your Name"
          className="w-full bg-dark-surface border-2 border-gray-600 rounded-xl px-4 py-4 text-center text-xl text-white placeholder-gray-500 focus:border-quiz-blue focus:outline-none"
        />

        {error && (
          <div className="text-quiz-red text-center font-medium">{error}</div>
        )}

        <button
          type="submit"
          disabled={joining}
          className="w-full bg-quiz-green hover:bg-green-600 text-white text-2xl font-bold py-4 rounded-xl btn-press transition-all cursor-pointer disabled:bg-gray-700 disabled:text-gray-500 disabled:cursor-not-allowed"
        >
          {joining ? 'Joining...' : 'Join!'}
        </button>
      </form>
    </div>
  )
}
