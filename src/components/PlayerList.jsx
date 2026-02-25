export default function PlayerList({ players, showScore = false }) {
  return (
    <div className="flex flex-wrap gap-2 justify-center max-w-2xl mx-auto">
      {players.map(player => (
        <div
          key={player.id}
          className={`
            px-4 py-2 rounded-full text-sm font-medium
            ${player.connected !== false ? 'bg-dark-surface text-white' : 'bg-gray-800 text-gray-500'}
            transition-all duration-300
          `}
        >
          {player.name}
          {player.connected === false && ' (disconnected)'}
          {showScore && (
            <span className="ml-2 text-quiz-yellow font-mono">{player.score?.toLocaleString()}</span>
          )}
        </div>
      ))}
    </div>
  )
}
