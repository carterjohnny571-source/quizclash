export default function CountdownTimer({ secondsLeft, totalSeconds, size = 'large' }) {
  const minutes = Math.floor(secondsLeft / 60)
  const seconds = secondsLeft % 60
  const timeStr = minutes > 0
    ? `${minutes}:${String(seconds).padStart(2, '0')}`
    : `${seconds}`
  const progress = totalSeconds > 0 ? secondsLeft / totalSeconds : 0
  const isUrgent = secondsLeft <= 5

  const sizeClasses = size === 'large'
    ? 'text-7xl md:text-9xl'
    : 'text-4xl md:text-5xl'

  return (
    <div className="flex flex-col items-center gap-4">
      <div className={`font-bold font-mono ${sizeClasses} ${isUrgent ? 'text-quiz-red animate-pulse-glow' : 'text-white'}`}>
        {timeStr}
      </div>

      {/* Timer bar */}
      <div className="w-full max-w-xl h-3 bg-dark-surface rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-1000 ease-linear ${
            isUrgent ? 'bg-quiz-red' : progress > 0.5 ? 'bg-quiz-green' : 'bg-quiz-yellow'
          }`}
          style={{ width: `${progress * 100}%` }}
        />
      </div>
    </div>
  )
}
