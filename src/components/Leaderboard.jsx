import { getAvatarUrl } from './AvatarPicker'

const medals = ['🥇', '🥈', '🥉']

export default function Leaderboard({ players, limit = 5, showBreakdown = false }) {
  const sorted = [...players]
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)

  return (
    <div className="w-full max-w-lg mx-auto space-y-2">
      {sorted.map((player, index) => {
        const barWidth = sorted[0]?.score > 0
          ? Math.max(15, (player.score / sorted[0].score) * 100)
          : 15

        return (
          <div
            key={player.id}
            className="leaderboard-item animate-slide-up"
            style={{ animationDelay: `${index * 0.1}s` }}
          >
            <div className="flex items-center gap-3 mb-1">
              <span className="text-2xl w-10 text-center">
                {index < 3 ? medals[index] : `#${index + 1}`}
              </span>
              {player.avatar && (
                <img
                  src={getAvatarUrl(player.avatar)}
                  alt=""
                  className="w-9 h-9 rounded-full object-cover"
                />
              )}
              <span className="font-bold text-lg flex-1 truncate">{player.name}</span>
              <span className="font-mono font-bold text-xl text-quiz-yellow">
                {player.score.toLocaleString()}
              </span>
            </div>

            <div className="ml-13 h-2 bg-dark-surface rounded-full overflow-hidden">
              <div
                className="h-full rounded-full animate-grow-bar"
                style={{
                  width: `${barWidth}%`,
                  backgroundColor: index === 0 ? '#f39c12' : index === 1 ? '#bdc3c7' : index === 2 ? '#cd6133' : '#3498db'
                }}
              />
            </div>

            {showBreakdown && (
              <div className="ml-13 mt-1 text-sm text-gray-400 flex gap-4">
                <span>Answers: {player.answeringScore?.toLocaleString() || 0}</span>
                <span>Author: {player.authorScore?.toLocaleString() || 0}</span>
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
