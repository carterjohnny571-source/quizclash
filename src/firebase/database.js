import {
  ref, set, get, push, update, remove, onValue, off,
  onDisconnect, serverTimestamp, query, orderByChild
} from 'firebase/database'
import { db } from './config'

// ─── Session Management ───
export function getOrCreatePlayerId() {
  let id = sessionStorage.getItem('quizclash_playerId')
  if (!id) {
    id = 'p_' + Math.random().toString(36).substring(2, 10) + Date.now().toString(36)
    sessionStorage.setItem('quizclash_playerId', id)
  }
  return id
}

export function getOrCreateHostId() {
  let id = sessionStorage.getItem('quizclash_hostId')
  if (!id) {
    id = 'h_' + Math.random().toString(36).substring(2, 10) + Date.now().toString(36)
    sessionStorage.setItem('quizclash_hostId', id)
  }
  return id
}

export function getSessionRoomCode() {
  return sessionStorage.getItem('quizclash_roomCode')
}

export function setSessionRoomCode(code) {
  sessionStorage.setItem('quizclash_roomCode', code)
}

export function clearSession() {
  sessionStorage.removeItem('quizclash_playerId')
  sessionStorage.removeItem('quizclash_roomCode')
}

// ─── Room Code Generation ───
export async function generateRoomCode() {
  let code
  let exists = true
  while (exists) {
    code = String(Math.floor(1000 + Math.random() * 9000))
    const snapshot = await get(ref(db, `games/${code}`))
    exists = snapshot.exists()
  }
  return code
}

// ─── Game Creation ───
export async function createGame(roomCode, hostId) {
  await set(ref(db, `games/${roomCode}`), {
    settings: {
      phase: 'LOBBY',
      writingTimerSeconds: 600,
      questionTimerSeconds: 20,
      maxQuestions: null,
      createdAt: Date.now()
    },
    host: { id: hostId }
  })
}

// ─── Settings ───
export async function updateSettings(roomCode, settings) {
  await update(ref(db, `games/${roomCode}/settings`), settings)
}

export async function setPhase(roomCode, phase) {
  await update(ref(db, `games/${roomCode}/settings`), { phase })
}

// ─── Players ───
export async function joinGame(roomCode, playerId, name, avatar = null) {
  const playerRef = ref(db, `games/${roomCode}/players/${playerId}`)
  await set(playerRef, {
    name,
    avatar,
    score: 0,
    answeringScore: 0,
    authorScore: 0,
    streak: 0,
    connected: true
  })
  onDisconnect(playerRef).update({ connected: false })
}

export async function updatePlayer(roomCode, playerId, data) {
  await update(ref(db, `games/${roomCode}/players/${playerId}`), data)
}

export async function kickPlayer(roomCode, playerId) {
  await remove(ref(db, `games/${roomCode}/players/${playerId}`))
}

// ─── Questions ───
export async function submitQuestion(roomCode, question) {
  const questionsRef = ref(db, `games/${roomCode}/questions`)
  const newRef = push(questionsRef)
  await set(newRef, question)
  return newRef.key
}

export async function deleteQuestion(roomCode, questionId) {
  await remove(ref(db, `games/${roomCode}/questions/${questionId}`))
}

export async function getQuestions(roomCode) {
  const snapshot = await get(ref(db, `games/${roomCode}/questions`))
  if (!snapshot.exists()) return {}
  return snapshot.val()
}

// ─── Quiz Control ───
export async function startQuiz(roomCode, questionOrder) {
  await set(ref(db, `games/${roomCode}/quiz`), {
    currentQuestionIndex: 0,
    questionOrder,
    currentQuestionStartTime: Date.now(),
    showingResults: false
  })
  await setPhase(roomCode, 'QUIZ')
}

export async function advanceQuestion(roomCode, nextIndex) {
  await update(ref(db, `games/${roomCode}/quiz`), {
    currentQuestionIndex: nextIndex,
    currentQuestionStartTime: Date.now(),
    showingResults: false
  })
}

export async function showQuestionResults(roomCode) {
  await update(ref(db, `games/${roomCode}/quiz`), {
    showingResults: true
  })
}

// ─── Answers ───
export async function submitAnswer(roomCode, questionId, playerId, answerIndex) {
  await set(ref(db, `games/${roomCode}/answers/${questionId}/${playerId}`), {
    answerIndex,
    timestamp: Date.now()
  })
}

export async function getAnswersForQuestion(roomCode, questionId) {
  const snapshot = await get(ref(db, `games/${roomCode}/answers/${questionId}`))
  if (!snapshot.exists()) return {}
  return snapshot.val()
}

// ─── Real-time Listeners ───
export function listenToGame(roomCode, callback) {
  const gameRef = ref(db, `games/${roomCode}`)
  onValue(gameRef, (snapshot) => {
    callback(snapshot.val())
  })
  return () => off(gameRef)
}

export function listenToSettings(roomCode, callback) {
  const settingsRef = ref(db, `games/${roomCode}/settings`)
  onValue(settingsRef, (snapshot) => {
    callback(snapshot.val())
  })
  return () => off(settingsRef)
}

export function listenToPlayers(roomCode, callback) {
  const playersRef = ref(db, `games/${roomCode}/players`)
  onValue(playersRef, (snapshot) => {
    callback(snapshot.val() || {})
  })
  return () => off(playersRef)
}

export function listenToQuestions(roomCode, callback) {
  const questionsRef = ref(db, `games/${roomCode}/questions`)
  onValue(questionsRef, (snapshot) => {
    callback(snapshot.val() || {})
  })
  return () => off(questionsRef)
}

export function listenToQuiz(roomCode, callback) {
  const quizRef = ref(db, `games/${roomCode}/quiz`)
  onValue(quizRef, (snapshot) => {
    callback(snapshot.val())
  })
  return () => off(quizRef)
}

export function listenToAnswers(roomCode, questionId, callback) {
  const answersRef = ref(db, `games/${roomCode}/answers/${questionId}`)
  onValue(answersRef, (snapshot) => {
    callback(snapshot.val() || {})
  })
  return () => off(answersRef)
}

export async function getAllAnswers(roomCode) {
  const snapshot = await get(ref(db, `games/${roomCode}/answers`))
  if (!snapshot.exists()) return {}
  return snapshot.val()
}

// ─── Game Existence Check ───
export async function gameExists(roomCode) {
  const snapshot = await get(ref(db, `games/${roomCode}/settings`))
  return snapshot.exists()
}

// ─── Cleanup ───
export async function deleteGame(roomCode) {
  await remove(ref(db, `games/${roomCode}`))
}
