import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useGameState } from '../hooks/useGameState'
import {
  getOrCreatePlayerId, getSessionRoomCode, submitQuestion,
  submitAnswer, listenToAnswers
} from '../firebase/database'
import CountdownTimer from '../components/CountdownTimer'
import PlayerList from '../components/PlayerList'
import QuestionForm from '../components/QuestionForm'
import AnswerButtons from '../components/AnswerButtons'

function getOrdinal(n) {
  const s = ['th', 'st', 'nd', 'rd']
  const v = n % 100
  return n + (s[(v - 20) % 10] || s[v] || s[0])
}

export default function StudentGame() {
  const navigate = useNavigate()
  const roomCode = getSessionRoomCode()
  const playerId = getOrCreatePlayerId()
  const { settings, players, playerList, questions, questionList, quiz, phase, loading } = useGameState(roomCode)

  // Writing phase
  const [myQuestionCount, setMyQuestionCount] = useState(0)
  const [writingSecondsLeft, setWritingSecondsLeft] = useState(0)
  const writingIntervalRef = useRef(null)

  // Quiz phase
  const [selectedAnswer, setSelectedAnswer] = useState(null)
  const [answerSubmitted, setAnswerSubmitted] = useState(false)
  const [questionResult, setQuestionResult] = useState(null) // { isCorrect }
  const [qTimerLeft, setQTimerLeft] = useState(0)
  const qTimerRef = useRef(null)
  const prevQuestionIndex = useRef(null)

  // Redirect if no session
  useEffect(() => {
    if (!roomCode) navigate('/play')
  }, [roomCode, navigate])

  // Count my questions
  useEffect(() => {
    const count = questionList.filter(q => q.authorId === playerId).length
    setMyQuestionCount(count)
  }, [questionList, playerId])

  // Writing timer
  useEffect(() => {
    if (phase !== 'WRITING' || !settings?.writingTimerSeconds) return

    // Estimate remaining time based on when settings were set
    setWritingSecondsLeft(settings.writingTimerSeconds)
    clearInterval(writingIntervalRef.current)

    writingIntervalRef.current = setInterval(() => {
      setWritingSecondsLeft(prev => {
        if (prev <= 1) {
          clearInterval(writingIntervalRef.current)
          return 0
        }
        return prev - 1
      })
    }, 1000)

    return () => clearInterval(writingIntervalRef.current)
  }, [phase, settings?.writingTimerSeconds])

  // Reset answer state on new question
  useEffect(() => {
    if (!quiz) return
    if (prevQuestionIndex.current !== quiz.currentQuestionIndex) {
      prevQuestionIndex.current = quiz.currentQuestionIndex
      setSelectedAnswer(null)
      setAnswerSubmitted(false)
      setQuestionResult(null)
    }
  }, [quiz?.currentQuestionIndex])

  // Question timer
  useEffect(() => {
    if (phase !== 'QUIZ' || !quiz || quiz.showingResults) {
      clearInterval(qTimerRef.current)
      return
    }

    setQTimerLeft(settings?.questionTimerSeconds || 20)
    qTimerRef.current = setInterval(() => {
      setQTimerLeft(prev => {
        if (prev <= 1) {
          clearInterval(qTimerRef.current)
          return 0
        }
        return prev - 1
      })
    }, 1000)

    return () => clearInterval(qTimerRef.current)
  }, [phase, quiz?.currentQuestionIndex, quiz?.showingResults])

  // Check results when showingResults flips to true
  useEffect(() => {
    if (!quiz?.showingResults || !currentQuestion) return

    if (selectedAnswer !== null) {
      const isCorrect = selectedAnswer === currentQuestion.correctIndex
      setQuestionResult({ isCorrect })
    } else {
      setQuestionResult({ isCorrect: false })
    }
  }, [quiz?.showingResults])

  const handleSubmitQuestion = async (questionData) => {
    await submitQuestion(roomCode, {
      ...questionData,
      authorId: playerId
    })
  }

  const handleAnswer = async (answerIndex) => {
    if (answerSubmitted) return
    setSelectedAnswer(answerIndex)
    setAnswerSubmitted(true)

    const questionId = quiz.questionOrder[quiz.currentQuestionIndex]
    await submitAnswer(roomCode, questionId, playerId, answerIndex)
  }

  // Calculate current rank and gap to player ahead
  const getRankInfo = () => {
    const sorted = [...playerList].sort((a, b) => b.score - a.score)
    const rank = sorted.findIndex(p => p.id === playerId) + 1
    const gap = rank > 1 ? sorted[rank - 2].score - (myPlayer?.score || 0) : 0
    const aheadName = rank > 1 ? sorted[rank - 2].name : null
    return { rank, gap, aheadName, total: sorted.length }
  }

  const currentQuestion = quiz?.questionOrder && questionList.length > 0
    ? questionList.find(q => q.id === quiz.questionOrder[quiz.currentQuestionIndex])
    : null

  const isAuthor = currentQuestion?.authorId === playerId
  const myPlayer = players[playerId]

  if (!roomCode) return null
  if (loading) {
    return (
      <div className="min-h-screen bg-dark-bg flex items-center justify-center">
        <div className="text-xl text-gray-400">Loading...</div>
      </div>
    )
  }

  // ─── LOBBY ───
  if (phase === 'LOBBY') {
    return (
      <div className="min-h-screen bg-dark-bg flex flex-col items-center justify-center p-6">
        <h2 className="text-2xl font-bold text-quiz-blue mb-2">QuizClash</h2>
        <p className="text-gray-400 mb-2">Room: <span className="text-quiz-yellow font-mono font-bold text-xl">{roomCode}</span></p>
        <div className="bg-dark-card rounded-2xl p-6 mb-6 text-center">
          <div className="text-4xl mb-2">⏳</div>
          <p className="text-xl text-gray-300">Waiting for host to start...</p>
        </div>
        <div className="text-sm text-gray-400 mb-2">Players joined: {playerList.length}</div>
        <PlayerList players={playerList} />
      </div>
    )
  }

  // ─── WRITING ───
  if (phase === 'WRITING') {
    return (
      <div className="min-h-screen bg-dark-bg flex flex-col items-center p-4 pb-8">
        <h2 className="text-xl font-bold text-quiz-blue mb-2">Write Questions!</h2>

        <CountdownTimer
          secondsLeft={writingSecondsLeft}
          totalSeconds={settings?.writingTimerSeconds || 600}
          size="medium"
        />

        <div className="flex gap-6 my-4 text-center">
          <div>
            <div className="text-2xl font-bold text-quiz-green">{myQuestionCount}</div>
            <div className="text-xs text-gray-400">Your questions</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-quiz-yellow">{questionList.length}</div>
            <div className="text-xs text-gray-400">Class total</div>
          </div>
        </div>

        <QuestionForm onSubmit={handleSubmitQuestion} />
      </div>
    )
  }

  // ─── REVIEW (waiting) ───
  if (phase === 'REVIEW') {
    return (
      <div className="min-h-screen bg-dark-bg flex flex-col items-center justify-center p-6">
        <div className="text-4xl mb-4">📝</div>
        <h2 className="text-2xl font-bold mb-2">Review in Progress</h2>
        <p className="text-gray-400 text-center">
          The teacher is reviewing questions.<br />The quiz will start soon!
        </p>
        <div className="mt-6 text-quiz-yellow text-lg">
          You submitted {myQuestionCount} question{myQuestionCount !== 1 ? 's' : ''}
        </div>
      </div>
    )
  }

  // ─── QUIZ ───
  if (phase === 'QUIZ' && currentQuestion) {
    const qNum = quiz.currentQuestionIndex + 1
    const totalQs = quiz.questionOrder.length

    // Author view
    if (isAuthor) {
      return (
        <div className="min-h-screen bg-dark-bg flex flex-col items-center justify-center p-6">
          <div className="text-5xl mb-4">✍️</div>
          <h2 className="text-2xl font-bold text-quiz-yellow mb-2">You wrote this question!</h2>
          <p className="text-gray-400 mb-4">Question {qNum} of {totalQs}</p>
          <div className="bg-dark-card rounded-2xl p-6 text-center max-w-sm">
            <p className="text-lg">{currentQuestion.text}</p>
          </div>
          {quiz.showingResults && myPlayer && (() => {
            const { rank, gap, aheadName, total } = getRankInfo()
            return (
              <div className="mt-6 animate-slide-up text-center">
                <div className="text-gray-400 mb-1">Your score</div>
                <div className="text-3xl font-bold text-quiz-yellow mb-3">{myPlayer.score?.toLocaleString()}</div>
                <div className="bg-dark-card rounded-xl px-5 py-3">
                  <div className="text-lg font-bold">
                    {rank === 1 ? (
                      <span className="text-quiz-green">You're in 1st place!</span>
                    ) : (
                      <>
                        <span className="text-white">You're in <span className="text-quiz-blue">{getOrdinal(rank)}</span> place</span>
                        <div className="text-sm text-gray-400 mt-1">
                          {gap.toLocaleString()} point{gap !== 1 ? 's' : ''} behind {aheadName}
                        </div>
                      </>
                    )}
                  </div>
                </div>
              </div>
            )
          })()}
        </div>
      )
    }

    // Showing results
    if (quiz.showingResults && questionResult) {
      return (
        <div className={`min-h-screen flex flex-col items-center justify-center p-6 ${
          questionResult.isCorrect ? 'bg-green-900/30' : 'bg-red-900/30'
        }`}>
          <div className="text-6xl mb-4">{questionResult.isCorrect ? '🎉' : '😔'}</div>
          <h2 className={`text-3xl font-bold mb-2 ${questionResult.isCorrect ? 'text-quiz-green' : 'text-quiz-red'}`}>
            {questionResult.isCorrect ? 'Correct!' : 'Wrong!'}
          </h2>

          {myPlayer && (() => {
            const { rank, gap, aheadName } = getRankInfo()
            return (
              <div className="text-center animate-slide-up mt-4">
                <div className="text-gray-400 mb-1">Total Score</div>
                <div className="text-4xl font-bold text-quiz-yellow mb-3">{myPlayer.score?.toLocaleString()}</div>
                {myPlayer.streak >= 2 && (
                  <div className="text-xl mb-3 animate-streak">
                    🔥 {myPlayer.streak} streak!
                  </div>
                )}
                <div className="bg-dark-card rounded-xl px-5 py-3">
                  <div className="text-lg font-bold">
                    {rank === 1 ? (
                      <span className="text-quiz-green">You're in 1st place!</span>
                    ) : (
                      <>
                        <span className="text-white">You're in <span className="text-quiz-blue">{getOrdinal(rank)}</span> place</span>
                        <div className="text-sm text-gray-400 mt-1">
                          {gap.toLocaleString()} point{gap !== 1 ? 's' : ''} behind {aheadName}
                        </div>
                      </>
                    )}
                  </div>
                </div>
              </div>
            )
          })()}
        </div>
      )
    }

    // Answering
    return (
      <div className="min-h-screen bg-dark-bg flex flex-col p-4 pb-8">
        <div className="text-center mb-4">
          <div className="text-sm text-gray-400">Question {qNum} of {totalQs}</div>

          <CountdownTimer
            secondsLeft={qTimerLeft}
            totalSeconds={settings?.questionTimerSeconds || 20}
            size="medium"
          />

          <h2 className="text-xl font-bold mt-3 mb-4">{currentQuestion.text}</h2>
        </div>

        {answerSubmitted ? (
          <div className="flex-1 flex flex-col items-center justify-center">
            <div className="text-4xl mb-4">⏳</div>
            <p className="text-xl text-gray-400">Answer locked in!</p>
          </div>
        ) : (
          <div className="flex-1 flex items-center">
            <AnswerButtons
              options={currentQuestion.options}
              type={currentQuestion.type}
              onAnswer={handleAnswer}
              disabled={answerSubmitted}
              selectedIndex={selectedAnswer}
            />
          </div>
        )}
      </div>
    )
  }

  // ─── RESULTS ───
  if (phase === 'RESULTS') {
    const sortedPlayers = [...playerList].sort((a, b) => b.score - a.score)
    const myRank = sortedPlayers.findIndex(p => p.id === playerId) + 1
    const wonProlific = settings?.prolificWinner === playerId
    const wonChallenging = settings?.challengingWinner === playerId

    return (
      <div className="min-h-screen bg-dark-bg flex flex-col items-center justify-center p-6">
        <h1 className="text-3xl font-bold mb-6 text-transparent bg-clip-text bg-gradient-to-r from-quiz-yellow to-quiz-red">
          Game Over!
        </h1>

        {(wonProlific || wonChallenging) && (
          <div className="space-y-3 mb-6 w-full max-w-sm">
            {wonProlific && (
              <div className="bg-quiz-blue/20 border-2 border-quiz-blue rounded-xl p-4 text-center animate-slide-up">
                <div className="text-3xl mb-1">📝</div>
                <div className="text-lg font-bold text-quiz-blue">Most Prolific Author!</div>
                <div className="text-quiz-green font-bold text-xl">+2,500 pts</div>
              </div>
            )}
            {wonChallenging && (
              <div className="bg-quiz-red/20 border-2 border-quiz-red rounded-xl p-4 text-center animate-slide-up" style={{ animationDelay: '0.2s' }}>
                <div className="text-3xl mb-1">🧠</div>
                <div className="text-lg font-bold text-quiz-red">Most Challenging Author!</div>
                <div className="text-quiz-green font-bold text-xl">+2,500 pts</div>
              </div>
            )}
          </div>
        )}

        <div className="bg-dark-card rounded-2xl p-8 text-center mb-6 animate-slide-up">
          <div className="text-6xl mb-2">
            {myRank === 1 ? '🥇' : myRank === 2 ? '🥈' : myRank === 3 ? '🥉' : '🏆'}
          </div>
          <div className="text-gray-400 text-lg">Your Rank</div>
          <div className="text-5xl font-bold text-white mb-4">#{myRank}</div>

          <div className="text-gray-400">Total Score</div>
          <div className="text-4xl font-bold text-quiz-yellow mb-4">
            {myPlayer?.score?.toLocaleString() || 0}
          </div>

          <div className="flex gap-8 justify-center text-sm">
            <div>
              <div className="text-gray-400">Answering</div>
              <div className="text-xl font-bold text-quiz-blue">
                {myPlayer?.answeringScore?.toLocaleString() || 0}
              </div>
            </div>
            <div>
              <div className="text-gray-400">Author Bonus</div>
              <div className="text-xl font-bold text-quiz-purple">
                {myPlayer?.authorScore?.toLocaleString() || 0}
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // Fallback
  return (
    <div className="min-h-screen bg-dark-bg flex items-center justify-center">
      <div className="text-xl text-gray-400">Waiting...</div>
    </div>
  )
}
