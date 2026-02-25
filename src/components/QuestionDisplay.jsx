const MC_COLORS = ['bg-quiz-red', 'bg-quiz-blue', 'bg-quiz-yellow', 'bg-quiz-green']
const TF_COLORS = ['bg-quiz-blue', 'bg-quiz-red']

export default function QuestionDisplay({ question, showCorrect = false, questionNumber, totalQuestions }) {
  const colors = question.type === 'tf' ? TF_COLORS : MC_COLORS

  return (
    <div className="w-full max-w-4xl mx-auto">
      {questionNumber && (
        <div className="text-center text-gray-400 text-lg mb-2">
          Question {questionNumber} of {totalQuestions}
        </div>
      )}

      <h2 className="text-3xl md:text-5xl font-bold text-center mb-8 leading-tight">
        {question.text}
      </h2>

      <div className={`grid gap-4 ${question.type === 'tf' ? 'grid-cols-2' : 'grid-cols-1 md:grid-cols-2'}`}>
        {question.options.map((option, index) => {
          const isCorrect = index === question.correctIndex
          const color = colors[index] || colors[0]

          return (
            <div
              key={index}
              className={`
                ${color} rounded-xl py-5 px-6 text-xl md:text-2xl font-bold text-center text-white
                transition-all duration-300
                ${showCorrect && isCorrect ? 'ring-4 ring-white scale-105 animate-flash-green' : ''}
                ${showCorrect && !isCorrect ? 'opacity-40' : ''}
              `}
            >
              {option}
            </div>
          )
        })}
      </div>
    </div>
  )
}
