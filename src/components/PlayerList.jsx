import { getAvatarUrl } from './AvatarPicker'

export default function PlayerList({ players, showScore = false }) {
  return (
    <div className="flex flex-wrap gap-2 justify-center max-w-2xl mx-auto">
      {players.map(player => (
        <div
          key={player.id}
          className={`
            flex items-center gap-2 px-3 py-2 rounded-full text-sm font-medium
            ${player.connected !== false ? 'bg-dark-surface text-white' : 'bg-gray-800 text-gray-500'}
            transition-all duration-300
          `}
        >
          {player.avatar && (
            <img
              src={getAvatarUrl(player.avatar)}
              alt=""
              className={`w-7 h-7 rounded-full object-cover ${player.connected === false ? 'grayscale' : ''}`}
            />
          )}
          {player.name}
          {player.connected === false && ' (disconnected)'}
          {showScore && (
            <span className="ml-1 text-quiz-yellow font-mono">{player.score?.toLocaleString()}</span>
          )}
        </div>
      ))}
    </div>
  )
}
