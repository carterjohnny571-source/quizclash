import { useEffect } from 'react'
import confetti from 'canvas-confetti'
import { getAvatarUrl } from './AvatarPicker'

const podiumConfig = [
  { place: 2, height: 'h-32', color: 'bg-gray-400', emoji: '🥈', delay: 0.3 },
  { place: 1, height: 'h-48', color: 'bg-quiz-yellow', emoji: '🥇', delay: 0 },
  { place: 3, height: 'h-24', color: 'bg-amber-700', emoji: '🥉', delay: 0.6 },
]

export default function Podium({ players }) {
  const top3 = [...players].sort((a, b) => b.score - a.score).slice(0, 3)

  // Reorder for podium display: 2nd, 1st, 3rd
  const podiumOrder = []
  if (top3[1]) podiumOrder.push({ ...top3[1], ...podiumConfig[0] })
  if (top3[0]) podiumOrder.push({ ...top3[0], ...podiumConfig[1] })
  if (top3[2]) podiumOrder.push({ ...top3[2], ...podiumConfig[2] })

  useEffect(() => {
    const duration = 3000
    const end = Date.now() + duration

    const frame = () => {
      confetti({
        particleCount: 3,
        angle: 60,
        spread: 55,
        origin: { x: 0 },
        colors: ['#f39c12', '#e74c3c', '#3498db', '#2ecc71']
      })
      confetti({
        particleCount: 3,
        angle: 120,
        spread: 55,
        origin: { x: 1 },
        colors: ['#f39c12', '#e74c3c', '#3498db', '#2ecc71']
      })

      if (Date.now() < end) requestAnimationFrame(frame)
    }
    frame()
  }, [])

  return (
    <div className="flex items-end justify-center gap-4 mt-8 mb-8">
      {podiumOrder.map((player, i) => (
        <div
          key={player.id || i}
          className="flex flex-col items-center animate-podium"
          style={{ animationDelay: `${player.delay}s` }}
        >
          <div className="text-4xl mb-2">{player.emoji}</div>
          {player.avatar ? (
            <img
              src={getAvatarUrl(player.avatar)}
              alt=""
              className="w-16 h-16 md:w-20 md:h-20 rounded-full object-cover border-3 border-white mb-2"
            />
          ) : null}
          <div className="font-bold text-lg md:text-2xl mb-1 truncate max-w-[120px]">
            {player.name}
          </div>
          <div className="text-quiz-yellow font-mono font-bold text-lg mb-2">
            {player.score?.toLocaleString()}
          </div>
          <div className={`${player.color} ${player.height} w-24 md:w-32 rounded-t-lg flex items-start justify-center pt-4`}>
            <span className="text-3xl font-bold">#{player.place}</span>
          </div>
        </div>
      ))}
    </div>
  )
}
