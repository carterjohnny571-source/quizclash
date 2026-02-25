import { useState, useEffect } from 'react'
import { listenToSettings, listenToPlayers, listenToQuestions, listenToQuiz } from '../firebase/database'

export function useGameState(roomCode) {
  const [settings, setSettings] = useState(null)
  const [players, setPlayers] = useState({})
  const [questions, setQuestions] = useState({})
  const [quiz, setQuiz] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!roomCode) return

    let loaded = { settings: false, players: false, questions: false, quiz: false }
    const checkLoaded = () => {
      if (Object.values(loaded).every(Boolean)) setLoading(false)
    }

    const unsubs = []

    unsubs.push(listenToSettings(roomCode, (data) => {
      setSettings(data)
      loaded.settings = true
      checkLoaded()
    }))

    unsubs.push(listenToPlayers(roomCode, (data) => {
      setPlayers(data)
      loaded.players = true
      checkLoaded()
    }))

    unsubs.push(listenToQuestions(roomCode, (data) => {
      setQuestions(data)
      loaded.questions = true
      checkLoaded()
    }))

    unsubs.push(listenToQuiz(roomCode, (data) => {
      setQuiz(data)
      loaded.quiz = true
      checkLoaded()
    }))

    return () => unsubs.forEach(unsub => unsub())
  }, [roomCode])

  const phase = settings?.phase || 'LOBBY'
  const playerList = Object.entries(players).map(([id, data]) => ({ id, ...data }))
  const questionList = Object.entries(questions).map(([id, data]) => ({ id, ...data }))
  const questionCount = questionList.length

  return {
    settings,
    players,
    playerList,
    questions,
    questionList,
    questionCount,
    quiz,
    phase,
    loading
  }
}
