import { Routes, Route, Link } from 'react-router-dom'
import TeacherHost from './pages/TeacherHost'
import StudentJoin from './pages/StudentJoin'
import StudentGame from './pages/StudentGame'

function Landing() {
  return (
    <div className="min-h-screen bg-dark-bg flex flex-col items-center justify-center p-6">
      {/* Logo */}
      <div className="text-center mb-12">
        <h1 className="text-6xl md:text-8xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-quiz-blue via-quiz-purple to-quiz-red mb-4">
          QuizClash
        </h1>
        <p className="text-xl md:text-2xl text-gray-400">
          Students write the questions. Everyone plays the quiz.
        </p>
      </div>

      {/* Buttons */}
      <div className="flex flex-col sm:flex-row gap-6 w-full max-w-md">
        <Link
          to="/host"
          className="flex-1 bg-quiz-blue hover:bg-blue-600 text-white text-2xl font-bold py-6 px-8 rounded-2xl text-center btn-press transition-all no-underline"
        >
          🎓 Host a Game
        </Link>
        <Link
          to="/play"
          className="flex-1 bg-quiz-green hover:bg-green-600 text-white text-2xl font-bold py-6 px-8 rounded-2xl text-center btn-press transition-all no-underline"
        >
          📱 Join a Game
        </Link>
      </div>

      <p className="text-gray-600 text-sm mt-12">
        Built for classrooms. Best on a projector + phones.
      </p>
    </div>
  )
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/host" element={<TeacherHost />} />
      <Route path="/play" element={<StudentJoin />} />
      <Route path="/play/game" element={<StudentGame />} />
    </Routes>
  )
}
