/**
 * QuizClash Scoring System
 */

/**
 * Calculate answering points for a correct answer.
 * Faster answers get more points (1000 max, 500 min for correct).
 * @param {number} timeToAnswer - seconds taken to answer
 * @param {number} totalQuestionTime - total seconds allowed
 * @returns {number} points (0 if wrong, 500-1000 if correct)
 */
export function calculateBaseScore(timeToAnswer, totalQuestionTime) {
  const timeFraction = Math.min(timeToAnswer / totalQuestionTime, 1)
  return Math.round(1000 - (500 * timeFraction))
}

/**
 * Get the streak multiplier based on consecutive correct answers.
 * @param {number} streak - number of consecutive correct answers
 * @returns {number} multiplier
 */
export function getStreakMultiplier(streak) {
  if (streak >= 5) return 1.5
  if (streak === 4) return 1.3
  if (streak === 3) return 1.2
  if (streak === 2) return 1.1
  return 1.0
}

/**
 * Calculate total answering points for a single question.
 * @param {boolean} isCorrect
 * @param {number} timeToAnswer - seconds taken
 * @param {number} totalQuestionTime - seconds allowed
 * @param {number} currentStreak - streak BEFORE this question
 * @returns {{ points: number, newStreak: number }}
 */
export function calculateAnsweringPoints(isCorrect, timeToAnswer, totalQuestionTime, currentStreak) {
  if (!isCorrect) {
    return { points: 0, newStreak: 0 }
  }
  const newStreak = currentStreak + 1
  const baseScore = calculateBaseScore(timeToAnswer, totalQuestionTime)
  const multiplier = getStreakMultiplier(newStreak)
  const points = Math.round(baseScore * multiplier)
  return { points, newStreak }
}

/**
 * Calculate author points based on how many players got it right.
 * - 0% correct (everyone wrong) = 0 points (too hard / trick question)
 * - Only 1 person correct = 1000 points (perfect difficulty)
 * - Exponential decay as more players get it right
 * - 75% correct ≈ ~80 points
 * - 100% correct = 0 points (too easy)
 * @param {number} totalAnswers - number of players who answered (excluding author)
 * @param {number} wrongCount - number who got it wrong
 * @returns {number} author points (always a whole number)
 */
export function calculateAuthorPoints(totalAnswers, wrongCount) {
  if (totalAnswers < 2) return 0
  const correctCount = totalAnswers - wrongCount
  // Nobody got it right = 0 (too hard)
  if (correctCount === 0) return 0
  // Everyone got it right = -500 penalty (too easy)
  if (correctCount === totalAnswers) return -500
  // Exponential decay: 1000 * e^(-k * correctFraction)
  // where correctFraction excludes the first correct answer
  // At 1 correct: fraction=0 → 1000 points
  // We use (correctCount - 1) / (totalAnswers - 1) so that
  // exactly 1 correct maps to 0 and all correct maps to 1
  const fraction = (correctCount - 1) / (totalAnswers - 1)
  // k=3.2 gives ~95 pts at 75% correct in a 20-player class
  const points = Math.round(1000 * Math.exp(-3.2 * fraction))
  return points
}

/**
 * Process all answers for a question and return scoring results.
 * @param {Object} answers - { playerId: { answerIndex, timestamp } }
 * @param {number} correctIndex - the correct answer index
 * @param {string} authorId - the question author's player ID
 * @param {Object} players - { playerId: { streak, score, ... } }
 * @param {number} questionStartTime - timestamp when question started
 * @param {number} questionTimerSeconds - total seconds for the question
 * @returns {{ playerResults: Object, authorPoints: number, answerDistribution: number[] }}
 */
export function processQuestionResults(answers, correctIndex, authorId, players, questionStartTime, questionTimerSeconds) {
  const playerResults = {}
  let wrongCount = 0
  let totalNonAuthorAnswers = 0
  const answerDistribution = {}

  for (const [playerId, answer] of Object.entries(answers)) {
    // Count distribution
    answerDistribution[answer.answerIndex] = (answerDistribution[answer.answerIndex] || 0) + 1

    // Skip author
    if (playerId === authorId) continue

    totalNonAuthorAnswers++
    const isCorrect = answer.answerIndex === correctIndex
    if (!isCorrect) wrongCount++

    const timeToAnswer = Math.max(0, (answer.timestamp - questionStartTime) / 1000)
    const currentStreak = players[playerId]?.streak || 0
    const { points, newStreak } = calculateAnsweringPoints(isCorrect, timeToAnswer, questionTimerSeconds, currentStreak)

    playerResults[playerId] = {
      isCorrect,
      points,
      newStreak,
      timeToAnswer: Math.round(timeToAnswer * 10) / 10
    }
  }

  // Players who didn't answer get 0 and streak reset
  for (const playerId of Object.keys(players)) {
    if (playerId === authorId) continue
    if (!answers[playerId]) {
      playerResults[playerId] = {
        isCorrect: false,
        points: 0,
        newStreak: 0,
        timeToAnswer: questionTimerSeconds
      }
      totalNonAuthorAnswers++
      wrongCount++
    }
  }

  const authorPoints = calculateAuthorPoints(totalNonAuthorAnswers, wrongCount)

  return { playerResults, authorPoints, answerDistribution }
}

/**
 * Shuffle an array using Fisher-Yates algorithm.
 * @param {Array} array
 * @returns {Array} new shuffled array
 */
export function shuffleArray(array) {
  const shuffled = [...array]
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
  }
  return shuffled
}
