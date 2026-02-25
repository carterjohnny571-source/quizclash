const MC_COLORS = ['bg-quiz-red', 'bg-quiz-blue', 'bg-quiz-yellow', 'bg-quiz-green']
const TF_COLORS = ['bg-quiz-blue', 'bg-quiz-red']

export default function AnswerDistribution({ distribution, options, correctIndex, type }) {
  const totalAnswers = Object.values(distribution).reduce((sum, count) => sum + count, 0) || 1
  const colors = type === 'tf' ? TF_COLORS : MC_COLORS

  return (
    <div className="w-full max-w-2xl mx-auto space-y-3">
      {options.map((option, index) => {
        const count = distribution[index] || 0
        const percentage = Math.round((count / totalAnswers) * 100)
        const isCorrect = index === correctIndex
        const color = colors[index] || colors[0]

        return (
          <div key={index} className="flex items-center gap-3">
            <div className="w-32 text-right text-sm font-medium truncate">
              {option}
            </div>
            <div className="flex-1 h-8 bg-dark-surface rounded-lg overflow-hidden relative">
              <div
                className={`h-full ${color} rounded-lg animate-grow-bar ${isCorrect ? 'ring-2 ring-white' : ''}`}
                style={{ width: `${percentage}%` }}
              />
              <span className="absolute inset-0 flex items-center justify-center text-sm font-bold">
                {count} ({percentage}%)
              </span>
            </div>
            {isCorrect && <span className="text-xl">✓</span>}
          </div>
        )
      })}
    </div>
  )
}
