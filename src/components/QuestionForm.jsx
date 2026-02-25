import { useState } from 'react'

export default function QuestionForm({ onSubmit }) {
  const [type, setType] = useState('mc')
  const [text, setText] = useState('')
  const [options, setOptions] = useState(['', '', '', ''])
  const [correctIndex, setCorrectIndex] = useState(null)
  const [submitting, setSubmitting] = useState(false)

  const tfOptions = ['True', 'False']

  const handleSubmit = async (e) => {
    e.preventDefault()

    const finalOptions = type === 'tf' ? tfOptions : options
    if (!text.trim()) return
    if (correctIndex === null) return
    if (type === 'mc' && finalOptions.some(o => !o.trim())) return

    setSubmitting(true)
    await onSubmit({
      text: text.trim(),
      type,
      options: finalOptions,
      correctIndex
    })

    // Reset form
    setText('')
    setOptions(['', '', '', ''])
    setCorrectIndex(null)
    setSubmitting(false)
  }

  const updateOption = (index, value) => {
    const newOptions = [...options]
    newOptions[index] = value
    setOptions(newOptions)
  }

  const mcColors = [
    'border-quiz-red focus:ring-quiz-red',
    'border-quiz-blue focus:ring-quiz-blue',
    'border-quiz-yellow focus:ring-quiz-yellow',
    'border-quiz-green focus:ring-quiz-green',
  ]

  const isValid = type === 'tf'
    ? text.trim() && correctIndex !== null
    : text.trim() && correctIndex !== null && options.every(o => o.trim())

  return (
    <form onSubmit={handleSubmit} className="w-full max-w-lg mx-auto space-y-4">
      {/* Type toggle */}
      <div className="flex gap-2 justify-center">
        <button
          type="button"
          onClick={() => { setType('mc'); setCorrectIndex(null) }}
          className={`px-4 py-2 rounded-lg font-bold transition-all cursor-pointer ${
            type === 'mc' ? 'bg-quiz-blue text-white' : 'bg-dark-surface text-gray-400'
          }`}
        >
          Multiple Choice
        </button>
        <button
          type="button"
          onClick={() => { setType('tf'); setCorrectIndex(null) }}
          className={`px-4 py-2 rounded-lg font-bold transition-all cursor-pointer ${
            type === 'tf' ? 'bg-quiz-purple text-white' : 'bg-dark-surface text-gray-400'
          }`}
        >
          True / False
        </button>
      </div>

      {/* Question text */}
      <input
        type="text"
        value={text}
        onChange={e => setText(e.target.value)}
        placeholder="Type your question..."
        className="w-full bg-dark-surface border-2 border-gray-600 rounded-xl px-4 py-3 text-lg text-white placeholder-gray-500 focus:border-quiz-blue focus:outline-none"
        maxLength={200}
      />

      {type === 'mc' ? (
        /* MC options */
        <div className="space-y-2">
          {options.map((opt, i) => (
            <div key={i} className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setCorrectIndex(i)}
                className={`w-10 h-10 rounded-full border-2 flex items-center justify-center text-lg font-bold shrink-0 cursor-pointer transition-all ${
                  correctIndex === i
                    ? 'bg-quiz-green border-quiz-green text-white'
                    : 'border-gray-600 text-gray-500 hover:border-gray-400'
                }`}
              >
                {correctIndex === i ? '✓' : String.fromCharCode(65 + i)}
              </button>
              <input
                type="text"
                value={opt}
                onChange={e => updateOption(i, e.target.value)}
                placeholder={`Option ${String.fromCharCode(65 + i)}`}
                className={`flex-1 bg-dark-surface border-2 ${mcColors[i]} rounded-lg px-3 py-2 text-white placeholder-gray-500 focus:outline-none focus:ring-1`}
                maxLength={100}
              />
            </div>
          ))}
          <p className="text-sm text-gray-500 text-center">Tap the circle to mark the correct answer</p>
        </div>
      ) : (
        /* TF options */
        <div className="grid grid-cols-2 gap-3">
          {tfOptions.map((label, i) => (
            <button
              key={i}
              type="button"
              onClick={() => setCorrectIndex(i)}
              className={`py-4 rounded-xl text-xl font-bold transition-all cursor-pointer ${
                correctIndex === i
                  ? i === 0 ? 'bg-quiz-green text-white ring-2 ring-white' : 'bg-quiz-red text-white ring-2 ring-white'
                  : 'bg-dark-surface text-gray-400 hover:text-white'
              }`}
            >
              {label}
            </button>
          ))}
          <p className="col-span-2 text-sm text-gray-500 text-center">Tap the correct answer</p>
        </div>
      )}

      {/* Submit */}
      <button
        type="submit"
        disabled={!isValid || submitting}
        className={`w-full py-4 rounded-xl text-xl font-bold transition-all cursor-pointer ${
          isValid && !submitting
            ? 'bg-quiz-green text-white hover:bg-green-600 btn-press'
            : 'bg-gray-700 text-gray-500 cursor-not-allowed'
        }`}
      >
        {submitting ? 'Submitting...' : 'Submit Question'}
      </button>
    </form>
  )
}
