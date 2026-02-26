import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { useGameState } from '../hooks/useGameState'
import { useTimer } from '../hooks/useTimer'
import {
  generateRoomCode, createGame, getOrCreateHostId, setSessionRoomCode,
  updateSettings, setPhase, deleteQuestion, startQuiz, advanceQuestion,
  showQuestionResults, getAnswersForQuestion, updatePlayer, kickPlayer,
  getAllAnswers, updateSettings as updateGameSettings
} from '../firebase/database'
import { processQuestionResults, shuffleArray } from '../utils/scoring'
import CountdownTimer from '../components/CountdownTimer'
import PlayerList from '../components/PlayerList'
import Leaderboard from '../components/Leaderboard'
import QuestionDisplay from '../components/QuestionDisplay'
import AnswerDistribution from '../components/AnswerDistribution'
import Podium from '../components/Podium'
import { getAvatarUrl } from '../components/AvatarPicker'

export default function TeacherHost() {
  const [roomCode, setRoomCode] = useState(null)
  const [creating, setCreating] = useState(false)
  const hostId = useRef(getOrCreateHostId())
  const { settings, players, playerList, questions, questionList, questionCount, quiz, phase, loading } = useGameState(roomCode)

  // Writing phase timer
  const [writingTimerActive, setWritingTimerActive] = useState(false)
  const [writingSecondsLeft, setWritingSecondsLeft] = useState(0)
  const writingIntervalRef = useRef(null)

  // Quiz state
  const [questionResults, setQuestionResults] = useState(null)
  const [autoAdvanceTimer, setAutoAdvanceTimer] = useState(null)
  const autoAdvanceRef = useRef(null)

  // Settings state
  const [writingMinutes, setWritingMinutes] = useState(10)
  const [questionSeconds, setQuestionSeconds] = useState(20)
  const [maxQuestions, setMaxQuestions] = useState('')

  // Question timer for quiz phase
  const [qTimerLeft, setQTimerLeft] = useState(0)
  const qTimerRef = useRef(null)

  // Results reveal state
  const [revealStage, setRevealStage] = useState(0) // 0=leaderboard, 1=prolific, 2=challenging, 3=final
  const [awards, setAwards] = useState(null)
  const awardsCalculated = useRef(false)

  // ─── Create Game ───
  const handleCreateGame = async () => {
    setCreating(true)
    const code = await generateRoomCode()
    await createGame(code, hostId.current)
    setRoomCode(code)
    setSessionRoomCode(code)
    setCreating(false)
  }

  // ─── Start Writing Phase ───
  const handleStartWriting = async () => {
    const timerSecs = writingMinutes * 60
    await updateSettings(roomCode, {
      phase: 'WRITING',
      writingTimerSeconds: timerSecs,
      questionTimerSeconds: questionSeconds,
      maxQuestions: maxQuestions ? parseInt(maxQuestions) : null
    })
    setWritingSecondsLeft(timerSecs)
    setWritingTimerActive(true)
  }

  // Writing timer countdown
  useEffect(() => {
    if (!writingTimerActive) return
    writingIntervalRef.current = setInterval(() => {
      setWritingSecondsLeft(prev => {
        if (prev <= 1) {
          clearInterval(writingIntervalRef.current)
          setWritingTimerActive(false)
          setPhase(roomCode, 'REVIEW')
          return 0
        }
        return prev - 1
      })
    }, 1000)
    return () => clearInterval(writingIntervalRef.current)
  }, [writingTimerActive, roomCode])

  // Sync timer if we load into WRITING phase
  useEffect(() => {
    if (phase === 'WRITING' && settings?.writingTimerSeconds && !writingTimerActive) {
      setWritingSecondsLeft(settings.writingTimerSeconds)
      setWritingTimerActive(true)
    }
  }, [phase])

  const handleEndWritingEarly = async () => {
    clearInterval(writingIntervalRef.current)
    setWritingTimerActive(false)
    await setPhase(roomCode, 'REVIEW')
  }

  // ─── Review Phase ───
  const handleDeleteQuestion = async (questionId) => {
    await deleteQuestion(roomCode, questionId)
  }

  const handleStartQuiz = async () => {
    let ids = questionList.map(q => q.id)
    const max = maxQuestions ? parseInt(maxQuestions) : null
    if (max && ids.length > max) {
      ids = shuffleArray(ids).slice(0, max)
    } else {
      ids = shuffleArray(ids)
    }
    await startQuiz(roomCode, ids)
  }

  // ─── Quiz Phase ───
  const currentQuestion = quiz?.questionOrder && questionList.length > 0
    ? questionList.find(q => q.id === quiz.questionOrder[quiz.currentQuestionIndex])
    : null

  // Question countdown timer
  useEffect(() => {
    if (phase !== 'QUIZ' || !quiz || quiz.showingResults) {
      clearInterval(qTimerRef.current)
      return
    }

    setQTimerLeft(settings?.questionTimerSeconds || 20)
    setQuestionResults(null)

    qTimerRef.current = setInterval(() => {
      setQTimerLeft(prev => {
        if (prev <= 1) {
          clearInterval(qTimerRef.current)
          handleTimeUp()
          return 0
        }
        return prev - 1
      })
    }, 1000)

    return () => clearInterval(qTimerRef.current)
  }, [phase, quiz?.currentQuestionIndex, quiz?.showingResults])

  const handleTimeUp = useCallback(async () => {
    if (!quiz || !currentQuestion) return
    const questionId = quiz.questionOrder[quiz.currentQuestionIndex]
    const answers = await getAnswersForQuestion(roomCode, questionId)
    const results = processQuestionResults(
      answers,
      currentQuestion.correctIndex,
      currentQuestion.authorId,
      players,
      quiz.currentQuestionStartTime,
      settings?.questionTimerSeconds || 20
    )

    // Update player scores in Firebase
    for (const [playerId, result] of Object.entries(results.playerResults)) {
      const player = players[playerId]
      if (!player) continue
      await updatePlayer(roomCode, playerId, {
        score: (player.score || 0) + result.points,
        answeringScore: (player.answeringScore || 0) + result.points,
        streak: result.newStreak
      })
    }

    // Update author score
    if (currentQuestion.authorId && players[currentQuestion.authorId]) {
      const author = players[currentQuestion.authorId]
      await updatePlayer(roomCode, currentQuestion.authorId, {
        score: (author.score || 0) + results.authorPoints,
        authorScore: (author.authorScore || 0) + results.authorPoints
      })
    }

    setQuestionResults(results)
    await showQuestionResults(roomCode)

    // Auto-advance after 5 seconds
    autoAdvanceRef.current = setTimeout(() => {
      handleNextQuestion()
    }, 5000)
    setAutoAdvanceTimer(5)
  }, [quiz, currentQuestion, players, roomCode, settings])

  // Auto-advance countdown display
  useEffect(() => {
    if (autoAdvanceTimer === null) return
    if (autoAdvanceTimer <= 0) return
    const t = setTimeout(() => setAutoAdvanceTimer(prev => prev - 1), 1000)
    return () => clearTimeout(t)
  }, [autoAdvanceTimer])

  const handleNextQuestion = async () => {
    clearTimeout(autoAdvanceRef.current)
    setAutoAdvanceTimer(null)
    setQuestionResults(null)

    const nextIndex = (quiz?.currentQuestionIndex || 0) + 1
    if (nextIndex >= (quiz?.questionOrder?.length || 0)) {
      await setPhase(roomCode, 'RESULTS')
    } else {
      await advanceQuestion(roomCode, nextIndex)
    }
  }

  // ─── Calculate Awards ───
  useEffect(() => {
    if (phase !== 'RESULTS' || awardsCalculated.current || !roomCode) return
    awardsCalculated.current = true

    const calcAwards = async () => {
      const allAnswers = await getAllAnswers(roomCode)

      // Most Prolific: player who wrote the most questions
      const authorCounts = {}
      for (const q of questionList) {
        if (q.authorId) {
          authorCounts[q.authorId] = (authorCounts[q.authorId] || 0) + 1
        }
      }
      let prolificId = null
      let prolificMax = 0
      for (const [id, count] of Object.entries(authorCounts)) {
        if (count > prolificMax) {
          prolificMax = count
          prolificId = id
        }
      }

      // Most Challenging: author whose questions had the lowest average correct %
      // Only consider questions that were actually used in the quiz
      const usedQuestionIds = quiz?.questionOrder || []
      const authorDifficulty = {} // { authorId: { totalCorrectPct, questionCount } }

      for (const qId of usedQuestionIds) {
        const question = questionList.find(q => q.id === qId)
        if (!question) continue
        const qAnswers = allAnswers?.[qId] || {}
        const answerers = Object.entries(qAnswers).filter(([pid]) => pid !== question.authorId)
        if (answerers.length === 0) continue

        const correctCount = answerers.filter(([, a]) => a.answerIndex === question.correctIndex).length
        const correctPct = correctCount / answerers.length

        if (!authorDifficulty[question.authorId]) {
          authorDifficulty[question.authorId] = { totalCorrectPct: 0, questionCount: 0 }
        }
        authorDifficulty[question.authorId].totalCorrectPct += correctPct
        authorDifficulty[question.authorId].questionCount += 1
      }

      let challengingId = null
      let lowestAvgCorrect = Infinity
      for (const [id, data] of Object.entries(authorDifficulty)) {
        if (data.questionCount === 0) continue
        const avg = data.totalCorrectPct / data.questionCount
        // Must have > 0% correct — questions must be answerable, not impossible
        if (avg <= 0) continue
        if (avg < lowestAvgCorrect) {
          lowestAvgCorrect = avg
          challengingId = id
        }
      }

      setAwards({
        prolific: prolificId ? {
          playerId: prolificId,
          name: playerList.find(p => p.id === prolificId)?.name || 'Unknown',
          avatar: playerList.find(p => p.id === prolificId)?.avatar,
          questionCount: prolificMax,
          bonus: 2500
        } : null,
        challenging: challengingId ? {
          playerId: challengingId,
          name: playerList.find(p => p.id === challengingId)?.name || 'Unknown',
          avatar: playerList.find(p => p.id === challengingId)?.avatar,
          avgCorrectPct: Math.round((lowestAvgCorrect) * 100),
          bonus: 2500
        } : null
      })
    }

    calcAwards()
  }, [phase, roomCode])

  // Apply bonus when reveal stage advances
  useEffect(() => {
    if (!awards || !roomCode) return

    const applyBonus = async (playerId, bonus) => {
      const player = players[playerId]
      if (!player) return
      await updatePlayer(roomCode, playerId, {
        score: (player.score || 0) + bonus,
        authorScore: (player.authorScore || 0) + bonus
      })
    }

    if (revealStage === 1 && awards.prolific) {
      applyBonus(awards.prolific.playerId, awards.prolific.bonus)
      updateSettings(roomCode, { prolificWinner: awards.prolific.playerId })
    }
    if (revealStage === 2 && awards.challenging) {
      applyBonus(awards.challenging.playerId, awards.challenging.bonus)
      updateSettings(roomCode, { challengingWinner: awards.challenging.playerId })
    }
  }, [revealStage])

  // ─── Render: No Game Yet ───
  if (!roomCode) {
    return (
      <div className="min-h-screen bg-dark-bg flex flex-col items-center justify-center p-8">
        <h1 className="text-5xl md:text-7xl font-bold mb-4 text-transparent bg-clip-text bg-gradient-to-r from-quiz-blue to-quiz-purple">
          QuizClash
        </h1>
        <p className="text-xl text-gray-400 mb-12">Host a Game</p>
        <button
          onClick={handleCreateGame}
          disabled={creating}
          className="bg-quiz-green hover:bg-green-600 text-white text-3xl font-bold py-6 px-16 rounded-2xl btn-press transition-all cursor-pointer"
        >
          {creating ? 'Creating...' : 'Create Game'}
        </button>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-dark-bg flex items-center justify-center">
        <div className="text-2xl text-gray-400">Loading game...</div>
      </div>
    )
  }

  // ─── LOBBY ───
  if (phase === 'LOBBY') {
    return (
      <div className="min-h-screen bg-dark-bg flex flex-col items-center p-8">
        <h1 className="text-3xl font-bold mb-2 text-quiz-blue">QuizClash</h1>
        <p className="text-gray-400 mb-6">Share this code with your students:</p>

        <div className="bg-dark-card border-4 border-quiz-yellow rounded-3xl px-16 py-8 mb-8">
          <div className="text-8xl md:text-[10rem] font-mono font-bold tracking-widest text-quiz-yellow">
            {roomCode}
          </div>
        </div>

        <div className="text-xl mb-2">
          Players: <span className="text-quiz-green font-bold">{playerList.length}</span>
        </div>

        {/* Player list with kick buttons */}
        <div className="flex flex-wrap gap-2 justify-center max-w-2xl mx-auto">
          {playerList.map(player => (
            <div
              key={player.id}
              className={`
                flex items-center gap-2 pl-3 pr-1 py-1.5 rounded-full text-sm font-medium
                ${player.connected !== false ? 'bg-dark-surface text-white' : 'bg-gray-800 text-gray-500'}
                transition-all duration-300
              `}
            >
              {player.avatar && (
                <img
                  src={getAvatarUrl(player.avatar)}
                  alt=""
                  className={`w-7 h-7 rounded-full object-cover ${player.connected === false ? 'grayscale' : ''}`}
                />
              )}
              <span>{player.name}</span>
              {player.connected === false && <span className="text-gray-500 text-xs">(dc)</span>}
              <button
                onClick={() => kickPlayer(roomCode, player.id)}
                className="w-6 h-6 rounded-full bg-quiz-red/20 hover:bg-quiz-red text-quiz-red hover:text-white flex items-center justify-center text-xs font-bold transition-all cursor-pointer ml-1"
                title={`Kick ${player.name}`}
              >
                ✕
              </button>
            </div>
          ))}
        </div>

        {/* Settings */}
        <div className="mt-8 bg-dark-card rounded-2xl p-6 w-full max-w-md space-y-4">
          <h3 className="text-lg font-bold text-gray-300">Settings</h3>

          <div className="flex items-center justify-between">
            <label className="text-gray-400">Writing time (minutes)</label>
            <select
              value={writingMinutes}
              onChange={e => setWritingMinutes(Number(e.target.value))}
              className="bg-dark-surface text-white rounded-lg px-3 py-2"
            >
              {[5, 6, 7, 8, 9, 10, 12, 15].map(m => (
                <option key={m} value={m}>{m} min</option>
              ))}
            </select>
          </div>

          <div className="flex items-center justify-between">
            <label className="text-gray-400">Seconds per question</label>
            <select
              value={questionSeconds}
              onChange={e => setQuestionSeconds(Number(e.target.value))}
              className="bg-dark-surface text-white rounded-lg px-3 py-2"
            >
              {[10, 15, 20, 25, 30].map(s => (
                <option key={s} value={s}>{s}s</option>
              ))}
            </select>
          </div>

          <div className="flex items-center justify-between">
            <label className="text-gray-400">Max questions (blank = all)</label>
            <input
              type="number"
              value={maxQuestions}
              onChange={e => setMaxQuestions(e.target.value)}
              placeholder="All"
              min="1"
              className="bg-dark-surface text-white rounded-lg px-3 py-2 w-24 text-center"
            />
          </div>
        </div>

        <button
          onClick={handleStartWriting}
          disabled={playerList.length === 0}
          className={`mt-8 text-2xl font-bold py-4 px-12 rounded-xl btn-press transition-all cursor-pointer ${
            playerList.length > 0
              ? 'bg-quiz-green hover:bg-green-600 text-white'
              : 'bg-gray-700 text-gray-500 cursor-not-allowed'
          }`}
        >
          Start Writing Phase
        </button>
      </div>
    )
  }

  // ─── WRITING ───
  if (phase === 'WRITING') {
    return (
      <div className="min-h-screen bg-dark-bg flex flex-col items-center justify-center p-8">
        <h2 className="text-2xl font-bold text-gray-400 mb-4">Writing Phase</h2>

        <CountdownTimer
          secondsLeft={writingSecondsLeft}
          totalSeconds={settings?.writingTimerSeconds || 600}
        />

        <div className="mt-8 text-center">
          <div className="text-6xl font-bold text-quiz-yellow mb-2">{questionCount}</div>
          <div className="text-xl text-gray-400">questions submitted</div>
        </div>

        <button
          onClick={handleEndWritingEarly}
          className="mt-12 bg-quiz-red hover:bg-red-600 text-white text-xl font-bold py-3 px-8 rounded-xl btn-press transition-all cursor-pointer"
        >
          End Early
        </button>
      </div>
    )
  }

  // ─── REVIEW ───
  if (phase === 'REVIEW') {
    return (
      <div className="min-h-screen bg-dark-bg flex flex-col items-center p-8">
        <h2 className="text-3xl font-bold mb-2">Review Questions</h2>
        <p className="text-gray-400 mb-6">{questionCount} questions submitted</p>

        <div className="w-full max-w-3xl space-y-3 mb-8 max-h-[60vh] overflow-y-auto pr-2">
          {questionList.map((q, i) => (
            <div key={q.id} className="bg-dark-card rounded-xl p-4 flex items-start gap-4">
              <div className="flex-1">
                <div className="font-bold text-lg mb-1">{i + 1}. {q.text}</div>
                <div className="flex gap-2 flex-wrap">
                  {q.options.map((opt, oi) => (
                    <span
                      key={oi}
                      className={`px-2 py-1 rounded text-sm ${
                        oi === q.correctIndex ? 'bg-quiz-green text-white' : 'bg-dark-surface text-gray-400'
                      }`}
                    >
                      {opt}
                    </span>
                  ))}
                </div>
                <span className="text-xs text-gray-500 mt-1 inline-block">
                  {q.type === 'tf' ? 'True/False' : 'Multiple Choice'}
                  {' · by '}
                  {playerList.find(p => p.id === q.authorId)?.name || 'Unknown'}
                </span>
              </div>
              <button
                onClick={() => handleDeleteQuestion(q.id)}
                className="text-quiz-red hover:text-red-400 text-xl px-2 cursor-pointer"
                title="Delete question"
              >
                ✕
              </button>
            </div>
          ))}
        </div>

        <div className="flex items-center gap-4 mb-6">
          <label className="text-gray-400">Max questions to use:</label>
          <input
            type="number"
            value={maxQuestions}
            onChange={e => setMaxQuestions(e.target.value)}
            placeholder="All"
            min="1"
            max={questionCount}
            className="bg-dark-surface text-white rounded-lg px-3 py-2 w-24 text-center"
          />
          <span className="text-gray-500">of {questionCount}</span>
        </div>

        <button
          onClick={handleStartQuiz}
          disabled={questionCount === 0}
          className={`text-2xl font-bold py-4 px-12 rounded-xl btn-press transition-all cursor-pointer ${
            questionCount > 0
              ? 'bg-quiz-green hover:bg-green-600 text-white'
              : 'bg-gray-700 text-gray-500 cursor-not-allowed'
          }`}
        >
          Start Quiz!
        </button>
      </div>
    )
  }

  // ─── QUIZ ───
  if (phase === 'QUIZ' && currentQuestion) {
    const totalQs = quiz.questionOrder.length
    const qNum = quiz.currentQuestionIndex + 1
    const authorName = playerList.find(p => p.id === currentQuestion.authorId)?.name

    if (quiz.showingResults && questionResults) {
      return (
        <div className="min-h-screen bg-dark-bg flex flex-col items-center p-6 gap-6">
          <div className="text-gray-400">Question {qNum} of {totalQs}</div>

          <QuestionDisplay question={currentQuestion} showCorrect={true} />

          <div className="text-sm text-gray-400">
            Written by: <span className="text-quiz-blue font-bold">{authorName || 'Unknown'}</span>
          </div>

          <AnswerDistribution
            distribution={questionResults.answerDistribution}
            options={currentQuestion.options}
            correctIndex={currentQuestion.correctIndex}
            type={currentQuestion.type}
          />

          <Leaderboard players={playerList} limit={5} />

          <div className="flex items-center gap-4">
            {autoAdvanceTimer !== null && (
              <span className="text-gray-500">Next in {autoAdvanceTimer}s</span>
            )}
            <button
              onClick={handleNextQuestion}
              className="bg-quiz-blue hover:bg-blue-600 text-white text-xl font-bold py-3 px-8 rounded-xl btn-press transition-all cursor-pointer"
            >
              {qNum >= totalQs ? 'Show Results' : 'Next Question'}
            </button>
          </div>
        </div>
      )
    }

    return (
      <div className="min-h-screen bg-dark-bg flex flex-col items-center justify-center p-6 gap-6">
        <CountdownTimer
          secondsLeft={qTimerLeft}
          totalSeconds={settings?.questionTimerSeconds || 20}
          size="medium"
        />

        <QuestionDisplay
          question={currentQuestion}
          questionNumber={qNum}
          totalQuestions={totalQs}
        />
      </div>
    )
  }

  // ─── RESULTS ───
  if (phase === 'RESULTS') {
    return (
      <div className="min-h-screen bg-dark-bg flex flex-col items-center p-8">
        {revealStage === 0 && (
          <>
            <h1 className="text-4xl md:text-6xl font-bold mb-8 text-transparent bg-clip-text bg-gradient-to-r from-quiz-yellow to-quiz-red">
              Results So Far...
            </h1>
            <Leaderboard players={playerList} limit={playerList.length} showBreakdown={true} />
            <button
              onClick={() => setRevealStage(1)}
              disabled={!awards}
              className="mt-8 bg-quiz-purple hover:bg-purple-600 text-white text-2xl font-bold py-4 px-12 rounded-xl btn-press transition-all cursor-pointer disabled:bg-gray-700 disabled:text-gray-500 disabled:cursor-not-allowed"
            >
              {awards ? 'Reveal Author Awards!' : 'Calculating...'}
            </button>
          </>
        )}

        {revealStage === 1 && (
          <>
            <h1 className="text-3xl md:text-5xl font-bold mb-6 text-transparent bg-clip-text bg-gradient-to-r from-quiz-blue to-quiz-purple animate-slide-up">
              Most Prolific Author
            </h1>
            <p className="text-xl text-gray-400 mb-6 animate-slide-up" style={{ animationDelay: '0.2s' }}>
              Wrote the most questions for the class
            </p>
            {awards?.prolific ? (
              <div className="animate-slide-up flex flex-col items-center" style={{ animationDelay: '0.4s' }}>
                {awards.prolific.avatar && (
                  <img
                    src={getAvatarUrl(awards.prolific.avatar)}
                    alt=""
                    className="w-28 h-28 md:w-36 md:h-36 rounded-full object-cover border-4 border-quiz-blue mb-4 shadow-[0_0_30px_rgba(52,152,219,0.5)]"
                  />
                )}
                <div className="text-4xl md:text-6xl font-bold text-white mb-2">{awards.prolific.name}</div>
                <div className="text-2xl text-gray-400 mb-4">
                  {awards.prolific.questionCount} question{awards.prolific.questionCount !== 1 ? 's' : ''} written
                </div>
                <div className="text-5xl md:text-7xl font-bold text-quiz-green animate-pulse-glow">
                  +{awards.prolific.bonus.toLocaleString()}
                </div>
                <div className="text-xl text-gray-400 mt-1">bonus points!</div>
              </div>
            ) : (
              <div className="text-2xl text-gray-500">No questions were written</div>
            )}
            <button
              onClick={() => setRevealStage(2)}
              className="mt-10 bg-quiz-purple hover:bg-purple-600 text-white text-2xl font-bold py-4 px-12 rounded-xl btn-press transition-all cursor-pointer"
            >
              Next Award
            </button>
          </>
        )}

        {revealStage === 2 && (
          <>
            <h1 className="text-3xl md:text-5xl font-bold mb-6 text-transparent bg-clip-text bg-gradient-to-r from-quiz-red to-quiz-yellow animate-slide-up">
              Most Challenging Author
            </h1>
            <p className="text-xl text-gray-400 mb-6 animate-slide-up" style={{ animationDelay: '0.2s' }}>
              Wrote the hardest questions on average
            </p>
            {awards?.challenging ? (
              <div className="animate-slide-up flex flex-col items-center" style={{ animationDelay: '0.4s' }}>
                {awards.challenging.avatar && (
                  <img
                    src={getAvatarUrl(awards.challenging.avatar)}
                    alt=""
                    className="w-28 h-28 md:w-36 md:h-36 rounded-full object-cover border-4 border-quiz-red mb-4 shadow-[0_0_30px_rgba(231,76,60,0.5)]"
                  />
                )}
                <div className="text-4xl md:text-6xl font-bold text-white mb-2">{awards.challenging.name}</div>
                <div className="text-2xl text-gray-400 mb-4">
                  Only {awards.challenging.avgCorrectPct}% of players got their questions right
                </div>
                <div className="text-5xl md:text-7xl font-bold text-quiz-green animate-pulse-glow">
                  +{awards.challenging.bonus.toLocaleString()}
                </div>
                <div className="text-xl text-gray-400 mt-1">bonus points!</div>
              </div>
            ) : (
              <div className="text-2xl text-gray-500">Not enough data</div>
            )}
            <button
              onClick={() => setRevealStage(3)}
              className="mt-10 bg-quiz-green hover:bg-green-600 text-white text-2xl font-bold py-4 px-12 rounded-xl btn-press transition-all cursor-pointer"
            >
              Show Final Leaderboard!
            </button>
          </>
        )}

        {revealStage === 3 && (
          <>
            <h1 className="text-4xl md:text-6xl font-bold mb-8 text-transparent bg-clip-text bg-gradient-to-r from-quiz-yellow to-quiz-red animate-slide-up">
              Final Results!
            </h1>
            <Podium players={playerList} />
            <Leaderboard players={playerList} limit={playerList.length} showBreakdown={true} />
          </>
        )}
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-dark-bg flex items-center justify-center">
      <div className="text-xl text-gray-400">Loading...</div>
    </div>
  )
}
