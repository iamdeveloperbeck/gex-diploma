import { useState, useEffect } from "react"
import { collection, getDocs, addDoc } from "firebase/firestore"
import { db } from "../data/firebase"
import { useLocation, useNavigate, Link } from "react-router-dom"
import { Clock, BookOpen, Trophy, CheckCircle, XCircle, ArrowRight, Home, User, Users } from "lucide-react"

export default function QuizComponent() {
  const [tests, setTests] = useState([])
  const [currentTestIndex, setCurrentTestIndex] = useState(0)
  const [score, setScore] = useState(0)
  const [timer, setTimer] = useState(40)
  const [isLoading, setIsLoading] = useState(true)
  const [isQuizFinished, setIsQuizFinished] = useState(false)
  const [answers, setAnswers] = useState([])
  const [selectedOption, setSelectedOption] = useState(null)
  const [showFeedback, setShowFeedback] = useState(false)

  const location = useLocation()
  const navigate = useNavigate()
  const { name, group, group_id, surname } = location.state || {}

  useEffect(() => {
    if (!name || !group || !group_id) {
      console.error("Foydalanuvchi ma'lumotlari mavjud emas yoki to'liq emas!")
      window.location.href = "/"
      return
    }
  }, [location.state])

  useEffect(() => {
    const fetchTests = async () => {
      try {
        const testCollection = collection(db, "questions")
        const testSnapshot = await getDocs(testCollection)
        const testList = testSnapshot.docs.map((doc) => doc.data())
        setTests(testList)
        setIsLoading(false)
      } catch (error) {
        console.error("Testlarni yuklashda xatolik:", error)
      }
    }
    fetchTests()
  }, [])

  useEffect(() => {
    if (timer > 0 && !isQuizFinished && !showFeedback) {
      const interval = setInterval(() => {
        setTimer((prev) => prev - 1)
      }, 1000)
      return () => clearInterval(interval)
    }
    if (timer === 0 && !showFeedback) {
      handleNext() // vaqt tugasa avtomatik keyingiga o'tadi
    }
  }, [timer, isQuizFinished, showFeedback])

  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.key === "F5" || (event.ctrlKey && event.key === "r")) {
        event.preventDefault()
        alert("Sahifa yangilanishi bloklandi!")
      }
    }
    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [])

  const indexToLetter = (index) => String.fromCharCode(65 + index) // 0 -> A, 1 -> B, ...

  const handleOptionClick = (selectedOption, index) => {
    if (showFeedback) return

    setSelectedOption(index)
    setShowFeedback(true)

    const currentQuestion = tests[currentTestIndex]
    const selectedIndex = currentQuestion.options.indexOf(selectedOption)
    const correctIndex = currentQuestion.options.indexOf(currentQuestion.correctAnswer)

    const isCorrect = selectedOption === currentQuestion.correctAnswer
    if (isCorrect) {
      setScore((prev) => prev + 1)
    }

    setAnswers((prev) => [
      ...prev,
      {
        question: currentQuestion.question,
        selectedAnswer: indexToLetter(selectedIndex),
        correctAnswer: indexToLetter(correctIndex),
        isCorrect,
      },
    ])

    setTimeout(() => {
      handleNext()
    }, 1500)
  }

  const handleNext = () => {
    if (currentTestIndex < tests.length - 1) {
      setCurrentTestIndex((prev) => prev + 1)
      setTimer(40)
      setSelectedOption(null)
      setShowFeedback(false)
    } else {
      setIsQuizFinished(true)
      const grade = calculateGrade(score, tests.length)
      saveResultsToFirebase(score, tests.length, grade)
    }
  }

  const calculateGrade = (finalScore, totalQuestions) => {
    const percentage = (finalScore / totalQuestions) * 100
    if (percentage >= 85) return 5
    if (percentage >= 71) return 4
    if (percentage >= 56) return 3
    return 2
  }

  const saveResultsToFirebase = async (score, totalQuestions, grade) => {
    try {
      const correctCount = answers.filter((ans) => ans.isCorrect).length
      const incorrectCount = answers.length - correctCount

      const resultsCollection = collection(db, "results")
      await addDoc(resultsCollection, {
        name,
        surname,
        group,
        group_id,
        score,
        totalQuestions,
        grade,
        correctCount,
        incorrectCount,
        answers,
        date: new Date().toISOString(),
      })
      console.log("Natijalar muvaffaqiyatli saqlandi!")
    } catch (error) {
      console.error("Natijalarni saqlashda xatolik:", error)
    }
  }

  const getTimerColor = () => {
    if (timer <= 10) return "text-red-500"
    if (timer <= 20) return "text-yellow-500"
    return "text-green-500"
  }

  const getProgressPercentage = () => {
    return ((currentTestIndex + 1) / tests.length) * 100
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 flex items-center justify-center">
        <div className="text-center">
          <div className="relative">
            <div className="w-20 h-20 border-4 border-blue-200 rounded-full animate-spin border-t-blue-600 mx-auto"></div>
            <BookOpen className="w-8 h-8 text-blue-600 absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2" />
          </div>
          <p className="mt-4 text-lg font-medium text-gray-700">Testlar yuklanmoqda...</p>
        </div>
      </div>
    )
  }

  if (isQuizFinished) {
    const grade = calculateGrade(score, tests.length)
    const percentage = (score / tests.length) * 100

    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 via-blue-50 to-purple-50 flex items-center justify-center p-4">
        <div className="max-w-2xl w-full bg-white rounded-3xl shadow-2xl overflow-hidden">
          <div className="bg-gradient-to-r from-green-500 to-blue-600 p-8 text-white text-center">
            <Trophy className="w-16 h-16 mx-auto mb-4 animate-bounce" />
            <h1 className="text-3xl font-bold mb-2">Test yakunlandi!</h1>
            <p className="text-green-100">Tabriklaymiz, siz testni muvaffaqiyatli yakunladingiz</p>
          </div>

          <div className="p-8">
            <div className="grid md:grid-cols-2 gap-6 mb-8">
              <div className="bg-gray-50 rounded-2xl p-6 text-center">
                <User className="w-8 h-8 text-blue-600 mx-auto mb-3" />
                <h3 className="font-semibold text-gray-800 mb-2">Talaba ma'lumotlari</h3>
                <p className="text-gray-600">
                  {name} {surname}
                </p>
                <p className="text-sm text-gray-500 flex items-center justify-center mt-1">
                  <Users className="w-4 h-4 mr-1" />
                  {group}
                </p>
              </div>

              <div className="bg-gradient-to-br from-blue-50 to-purple-50 rounded-2xl p-6 text-center">
                <div className="text-3xl font-bold text-blue-600 mb-2">{percentage.toFixed(1)}%</div>
                <p className="text-gray-600">Umumiy natija</p>
              </div>
            </div>

            <div className="grid md:grid-cols-3 gap-4 mb-8">
              <div className="bg-green-50 rounded-xl p-4 text-center border border-green-200">
                <CheckCircle className="w-8 h-8 text-green-600 mx-auto mb-2" />
                <div className="text-2xl font-bold text-green-700">{score}</div>
                <p className="text-sm text-green-600">To'g'ri javoblar</p>
              </div>

              <div className="bg-red-50 rounded-xl p-4 text-center border border-red-200">
                <XCircle className="w-8 h-8 text-red-600 mx-auto mb-2" />
                <div className="text-2xl font-bold text-red-700">{tests.length - score}</div>
                <p className="text-sm text-red-600">Noto'g'ri javoblar</p>
              </div>

              <div className="bg-purple-50 rounded-xl p-4 text-center border border-purple-200">
                <Trophy className="w-8 h-8 text-purple-600 mx-auto mb-2" />
                <div className="text-2xl font-bold text-purple-700">{grade}</div>
                <p className="text-sm text-purple-600">Yakuniy baho</p>
              </div>
            </div>

            <div className="text-center">
              <Link
                to="/"
                className="inline-flex items-center px-8 py-4 bg-gradient-to-r from-blue-600 to-purple-600 text-white font-semibold rounded-2xl hover:from-blue-700 hover:to-purple-700 transition-all duration-300 transform hover:scale-105 shadow-lg"
              >
                <Home className="w-5 h-5 mr-2" />
                Bosh sahifa
              </Link>
            </div>
          </div>
        </div>
      </div>
    )
  }

  const currentQuestion = tests[currentTestIndex]
  const correctIndex = currentQuestion?.options.indexOf(currentQuestion.correctAnswer)

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 p-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-2xl shadow-lg p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-3">
              <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-purple-600 rounded-xl flex items-center justify-center">
                <BookOpen className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-800">Bilim Testi</h1>
                <p className="text-sm text-gray-500">
                  {name} {surname} • {group}
                </p>
              </div>
            </div>

            <div className="text-right">
              <div className="text-sm text-gray-500 mb-1">Savol</div>
              <div className="text-lg font-bold text-gray-800">
                {currentTestIndex + 1} / {tests.length}
              </div>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="w-full bg-gray-200 rounded-full h-3 mb-4">
            <div
              className="bg-gradient-to-r from-blue-500 to-purple-600 h-3 rounded-full transition-all duration-500 ease-out"
              style={{ width: `${getProgressPercentage()}%` }}
            ></div>
          </div>

          {/* Timer */}
          <div className="flex items-center justify-center">
            <div className={`flex items-center space-x-2 px-4 py-2 rounded-full bg-gray-50 ${getTimerColor()}`}>
              <Clock className="w-5 h-5" />
              <span className="font-bold text-lg">{timer}</span>
              <span className="text-sm">soniya</span>
            </div>
          </div>
        </div>

        {/* Question Card */}
        <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
          <div className="bg-gradient-to-r from-gray-50 to-blue-50 p-8">
            <h2 className="text-xl md:text-2xl font-semibold text-gray-800 leading-relaxed">
              {currentQuestion?.question}
            </h2>
          </div>

          <div className="p-8">
            <div className="grid gap-4">
              {currentQuestion?.options.map((option, index) => {
                let buttonClass =
                  "group relative w-full p-6 text-left rounded-2xl border-2 transition-all duration-300 transform hover:scale-[1.02] hover:shadow-lg"

                if (!showFeedback) {
                  buttonClass += " border-gray-200 bg-gray-50 hover:border-blue-300 hover:bg-blue-50"
                } else {
                  if (index === selectedOption) {
                    if (index === correctIndex) {
                      buttonClass += " border-green-400 bg-green-50 text-green-800"
                    } else {
                      buttonClass += " border-red-400 bg-red-50 text-red-800"
                    }
                  } else if (index === correctIndex) {
                    buttonClass += " border-green-400 bg-green-50 text-green-800"
                  } else {
                    buttonClass += " border-gray-200 bg-gray-100 text-gray-500"
                  }
                }

                return (
                  <button
                    key={index}
                    onClick={() => handleOptionClick(option, index)}
                    disabled={showFeedback}
                    className={buttonClass}
                  >
                    <div className="flex items-center space-x-4">
                      <div
                        className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-lg ${
                          showFeedback && index === correctIndex
                            ? "bg-green-500 text-white"
                            : showFeedback && index === selectedOption && index !== correctIndex
                              ? "bg-red-500 text-white"
                              : "bg-blue-100 text-blue-600 group-hover:bg-blue-200"
                        }`}
                      >
                        {indexToLetter(index)}
                      </div>
                      <span className="flex-1 text-lg font-medium">{option}</span>
                      {showFeedback && index === correctIndex && <CheckCircle className="w-6 h-6 text-green-500" />}
                      {showFeedback && index === selectedOption && index !== correctIndex && (
                        <XCircle className="w-6 h-6 text-red-500" />
                      )}
                      {!showFeedback && (
                        <ArrowRight className="w-5 h-5 text-gray-400 group-hover:text-blue-500 transition-colors" />
                      )}
                    </div>
                  </button>
                )
              })}
            </div>

            {showFeedback && (
              <div className="mt-6 p-4 rounded-xl bg-blue-50 border border-blue-200">
                <p className="text-blue-800 text-center font-medium">
                  {selectedOption === correctIndex
                    ? "🎉 To'g'ri javob! Keyingi savolga o'tmoqdamiz..."
                    : "❌ Noto'g'ri javob. To'g'ri javob ko'rsatildi."}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}