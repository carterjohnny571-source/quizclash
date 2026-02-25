const MC_COLORS = [
  { bg: 'bg-quiz-red', hover: 'hover:bg-red-600', icon: '▲' },
  { bg: 'bg-quiz-blue', hover: 'hover:bg-blue-600', icon: '◆' },
  { bg: 'bg-quiz-yellow', hover: 'hover:bg-yellow-600', icon: '●' },
  { bg: 'bg-quiz-green', hover: 'hover:bg-green-600', icon: '■' },
]

const TF_COLORS = [
  { bg: 'bg-quiz-blue', hover: 'hover:bg-blue-600', icon: '✓' },
  { bg: 'bg-quiz-red', hover: 'hover:bg-red-600', icon: '✗' },
]

export default function AnswerButtons({ options, type, onAnswer, disabled, selectedIndex, correctIndex, showResult }) {
  const colors = type === 'tf' ? TF_COLORS : MC_COLORS

  return (
    <div className={`grid gap-3 w-full ${type === 'tf' ? 'grid-cols-1' : 'grid-cols-1 sm:grid-cols-2'}`}>
      {options.map((option, index) => {
        const color = colors[index] || colors[0]
        const isSelected = selectedIndex === index
        const isCorrect = correctIndex === index

        let extraClasses = ''
        if (showResult) {
          if (isCorrect) extraClasses = 'ring-4 ring-white scale-105'
          else if (isSelected && !isCorrect) extraClasses = 'opacity-50'
          else extraClasses = 'opacity-40'
        }

        return (
          <button
            key={index}
            onClick={() => onAnswer(index)}
            disabled={disabled}
            className={`
              ${color.bg} ${!disabled ? color.hover : ''}
              btn-press text-white font-bold text-xl md:text-2xl
              py-6 px-4 rounded-xl
              transition-all duration-200
              ${isSelected ? 'ring-4 ring-white' : ''}
              ${extraClasses}
              ${disabled ? 'cursor-not-allowed' : 'cursor-pointer'}
            `}
          >
            <span className="mr-2 text-2xl">{color.icon}</span>
            {option}
          </button>
        )
      })}
    </div>
  )
}
