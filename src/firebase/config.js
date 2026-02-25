import { initializeApp } from 'firebase/app'
import { getDatabase } from 'firebase/database'

const firebaseConfig = {
  apiKey: "AIzaSyD0WS3VJusYNgfF1yIiLKlNSqH54kvgHo4",
  authDomain: "quizclash-266a0.firebaseapp.com",
  databaseURL: "https://quizclash-266a0-default-rtdb.firebaseio.com",
  projectId: "quizclash-266a0",
  storageBucket: "quizclash-266a0.firebasestorage.app",
  messagingSenderId: "298402259604",
  appId: "1:298402259604:web:126ec59d41105d29b88a81"
}

const app = initializeApp(firebaseConfig)
export const db = getDatabase(app)
