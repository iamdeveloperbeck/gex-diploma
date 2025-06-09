"use client"

import { useState, useEffect } from "react"
import { collection, getDocs, addDoc, doc, getDoc } from "firebase/firestore"
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
  const [groupSubjects, setGroupSubjects] = useState([])
  const [questionsLimit, setQuestionsLimit] = useState(100)
  const [debugInfo, setDebugInfo] = useState({})

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
    const fetchGroupSubjectsAndTests = async () => {
      try {
        // 1. Guruh ma'lumotlarini olish
        const groupDoc = await getDoc(doc(db, "groups", group_id))
        if (!groupDoc.exists()) {
          console.error("Guruh topilmadi!")
          setIsLoading(false)
          return
        }

        const groupData = groupDoc.data()
        const assignedSubjectIds = groupData.subjects || []
        const limit = Number.parseInt(groupData.questionsLimit) || 100

        console.log("Guruh nomi:", groupData.name)
        console.log("Belgilangan fanlar ID lari:", assignedSubjectIds)
        console.log("Savollar limiti:", limit)

        setGroupSubjects(assignedSubjectIds)
        setQuestionsLimit(limit)

        // 2. Sections kolleksiyasidan fan ma'lumotlarini olish
        const sectionsCollection = collection(db, "sections")
        const sectionsSnapshot = await getDocs(sectionsCollection)
        const sectionsData = {}

        sectionsSnapshot.docs.forEach((doc) => {
          sectionsData[doc.id] = doc.data()
        })

        console.log("Sections ma'lumotlari:", sectionsData)

        // 3. Belgilangan fan ID lariga mos section nomlarini topish
        const assignedSectionNames = assignedSubjectIds
          .map((subjectId) => sectionsData[subjectId]?.name)
          .filter(Boolean)

        console.log("Belgilangan section nomlari:", assignedSectionNames)

        // 4. Barcha testlarni olish
        const testCollection = collection(db, "questions")
        const testSnapshot = await getDocs(testCollection)
        const allTests = testSnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }))

        console.log("Bazadan olingan testlar soni:", allTests.length)

        // 5. Belgilangan section nomlariga mos testlarni tanlash
        const selectedTests = selectTestsBySectionNames(allTests, assignedSectionNames, limit)

        console.log("Tanlangan testlar soni:", selectedTests.length)

        // Agar testlar topilmasa, xatolik ko'rsatish
        if (selectedTests.length === 0) {
          console.error("Belgilangan fanlar bo'yicha testlar topilmadi!")
          setDebugInfo({
            allTestsCount: allTests.length,
            assignedSubjectIds,
            assignedSectionNames,
            availableSections: [...new Set(allTests.map((test) => test.section).filter(Boolean))],
          })
        }

        // 6. Testlarni aralashtirish
        const shuffledTests = shuffleArray(selectedTests)

        setTests(shuffledTests)
        setIsLoading(false)
      } catch (error) {
        console.error("Ma'lumotlarni yuklashda xatolik:", error)
        setIsLoading(false)
      }
    }
    fetchGroupSubjectsAndTests()
  }, [group_id])

  // Section nomlari bo'yicha testlarni tanlash funksiyasi
  const selectTestsBySectionNames = (allTests, assignedSectionNames, limit) => {
    // Belgilangan section nomlariga mos testlarni filtrlash
    const filteredTests = allTests.filter((test) => {
      return test.section && assignedSectionNames.includes(test.section)
    })

    console.log("Belgilangan section nomlarga tegishli testlar soni:", filteredTests.length)

    // Testlarni section bo'yicha guruhlash
    const testsBySection = {}
    filteredTests.forEach((test) => {
      const section = test.section
      if (!testsBySection[section]) {
        testsBySection[section] = []
      }
      testsBySection[section].push(test)
    })

    console.log("Section lar bo'yicha testlar taqsimoti:")
    Object.entries(testsBySection).forEach(([section, tests]) => {
      console.log(`Section "${section}": ${tests.length} ta test`)
    })

    const selectedTests = []

    // Har bir section dan 5 tadan test olish uchun kerakli section lar soni
    const requiredSections = Math.floor(limit / 5)
    console.log(`${limit} ta test uchun ${requiredSections} ta section kerak (har biridan 5 tadan)`)

    // Mavjud section lar ro'yxati
    const availableSections = Object.keys(testsBySection).filter((section) => testsBySection[section].length > 0)

    console.log(`Mavjud section lar soni: ${availableSections.length}`)
    console.log(`Mavjud section lar:`, availableSections)

    // Agar hech qanday section topilmasa, bo'sh massiv qaytaramiz
    if (availableSections.length === 0) {
      return []
    }

    let sectionsToUse = []

    if (availableSections.length >= requiredSections) {
      // Agar yetarli section bor bo'lsa, tasodifiy tanlash
      const shuffledSections = shuffleArray([...availableSections])
      sectionsToUse = shuffledSections.slice(0, requiredSections)
      console.log(`${requiredSections} ta section tanlandi:`, sectionsToUse)
    } else {
      // Agar section lar yetarli bo'lmasa, barchasini ishlatish
      sectionsToUse = availableSections
      console.log(`Barcha mavjud section lar ishlatiladi: ${sectionsToUse.length} ta`)
    }

    // Har bir tanlangan section dan 5 tadan test olish
    sectionsToUse.forEach((section) => {
      const sectionTests = testsBySection[section] || []
      if (sectionTests.length > 0) {
        const shuffled = shuffleArray([...sectionTests])
        const selected = shuffled.slice(0, Math.min(5, shuffled.length))
        selectedTests.push(...selected)
        console.log(`Section "${section}" dan ${selected.length} ta test tanlandi`)
      }
    })

    // Agar hali ham yetarli test yo'q bo'lsa, qolgan testlardan to'ldirish
    if (selectedTests.length < limit) {
      const usedIds = new Set(selectedTests.map((test) => test.id))
      const remainingTests = filteredTests.filter((test) => !usedIds.has(test.id))

      if (remainingTests.length > 0) {
        const shuffledRemaining = shuffleArray(remainingTests)
        const needed = Math.min(limit - selectedTests.length, shuffledRemaining.length)
        selectedTests.push(...shuffledRemaining.slice(0, needed))
        console.log(`Qo'shimcha ${needed} ta test qo'shildi. Jami: ${selectedTests.length}`)
      }
    }

    // Agar hali ham yetarli bo'lmasa, mavjud testlardan takrorlash
    if (selectedTests.length < limit && selectedTests.length > 0) {
      const currentCount = selectedTests.length
      const needed = limit - currentCount

      for (let i = 0; i < needed; i++) {
        const randomTest = selectedTests[i % currentCount]
        // ID ni o'zgartirish takrorlanishni oldini olish uchun
        const duplicatedTest = { ...randomTest, id: `${randomTest.id}_dup_${i}` }
        selectedTests.push(duplicatedTest)
      }
      console.log(`${needed} ta test takrorlandi. Jami: ${selectedTests.length}`)
    }

    return selectedTests.slice(0, limit)
  }

  // Massivni aralashtirish funksiyasi
  const shuffleArray = (array) => {
    const shuffled = [...array]
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1))
      ;[shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
    }
    return shuffled
  }

  useEffect(() => {
    if (timer > 0 && !isQuizFinished) {
      const interval = setInterval(() => {
        setTimer((prev) => prev - 1)
      }, 1000)
      return () => clearInterval(interval)
    }
    if (timer === 0) {
      handleNext() // vaqt tugasa avtomatik keyingiga o'tadi
    }
  }, [timer, isQuizFinished])

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

  const handleOptionClick = (clickedOption, clickedIndex) => {
    if (selectedOption !== null) return // Bir marta javob berilgandan keyin boshqa javob berib bo'lmaydi

    console.log("Javob tanlandi:", clickedOption, "Index:", clickedIndex)

    setSelectedOption(clickedIndex)

    const currentQuestion = tests[currentTestIndex]
    const isCorrect = clickedOption === currentQuestion.correctAnswer

    console.log("To'g'ri javob:", currentQuestion.correctAnswer)
    console.log("Tanlangan javob:", clickedOption)
    console.log("Javob to'g'rimi:", isCorrect)

    if (isCorrect) {
      setScore((prev) => prev + 1)
    }

    // Yangi javobni yaratish
    const newAnswer = {
      question: currentQuestion.question,
      selectedAnswer: indexToLetter(clickedIndex),
      correctAnswer: currentQuestion.correctAnswer,
      isCorrect,
      section: currentQuestion.section || "Umumiy",
    }

    // Javobni qo'shish
    const updatedAnswers = [...answers, newAnswer]
    setAnswers(updatedAnswers)

    console.log("Jami javoblar soni:", updatedAnswers.length)
    console.log("Joriy test indeksi:", currentTestIndex)
    console.log("Jami testlar soni:", tests.length)

    // 1.5 soniya kutib keyingi savolga o'tish
    console.log("1.5 soniya kutilmoqda...")
    setTimeout(() => {
      console.log("Keyingi savolga o'tilmoqda...")
      handleNext(updatedAnswers, isCorrect ? score + 1 : score)
    }, 1500)
  }

  const handleNext = (currentAnswers = answers, currentScore = score) => {
    if (currentTestIndex < tests.length - 1) {
      setCurrentTestIndex((prev) => prev + 1)
      setTimer(40)
      setSelectedOption(null)
    } else {
      // Oxirgi savol - testni yakunlash
      console.log("Test yakunlanmoqda...")
      console.log("Oxirgi javoblar soni:", currentAnswers.length)
      console.log("Oxirgi ball:", currentScore)

      setIsQuizFinished(true)
      const grade = calculateGrade(currentScore, tests.length)
      saveResultsToFirebase(currentScore, tests.length, grade, currentAnswers)
    }
  }

  const calculateGrade = (finalScore, totalQuestions) => {
    const percentage = (finalScore / totalQuestions) * 100
    if (percentage >= 85) return 5
    if (percentage >= 71) return 4
    if (percentage >= 56) return 3
    return 2
  }

  const saveResultsToFirebase = async (finalScore, totalQuestions, grade, finalAnswers = answers) => {
    try {
      const correctCount = finalAnswers.filter((ans) => ans.isCorrect).length
      const incorrectCount = finalAnswers.length - correctCount

      console.log("Bazaga saqlanayotgan ma'lumotlar:")
      console.log("- Jami javoblar:", finalAnswers.length)
      console.log("- To'g'ri javoblar:", correctCount)
      console.log("- Noto'g'ri javoblar:", incorrectCount)
      console.log("- Ball:", finalScore)

      const resultsCollection = collection(db, "results")
      await addDoc(resultsCollection, {
        name,
        surname,
        group,
        group_id,
        score: finalScore,
        totalQuestions,
        grade,
        correctCount,
        incorrectCount,
        answers: finalAnswers,
        groupSubjects,
        questionsLimit,
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
          <p className="mt-2 text-sm text-gray-500">Guruh uchun {questionsLimit} ta test tanlanmoqda...</p>
        </div>
      </div>
    )
  }

  // Agar testlar topilmasa, xatolik ko'rsatish
  if (tests.length === 0) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 flex items-center justify-center p-4">
        <div className="max-w-2xl w-full bg-white rounded-2xl shadow-lg p-8 text-center">
          <div className="text-red-500 text-5xl mb-6">⚠️</div>
          <h1 className="text-2xl font-bold text-gray-800 mb-4">Testlar topilmadi</h1>
          <p className="text-gray-600 mb-6">
            Belgilangan fanlar bo'yicha testlar mavjud emas yoki testlar bazasi bilan muammo yuzaga keldi.
          </p>

          <div className="bg-gray-50 p-4 rounded-lg mb-6 text-left">
            <h2 className="font-semibold mb-2">Texnik ma'lumot:</h2>
            <ul className="text-sm text-gray-600 space-y-1">
              <li>Bazadagi testlar soni: {debugInfo.allTestsCount || 0}</li>
              <li>Belgilangan fanlar soni: {groupSubjects.length}</li>
              <li>Belgilangan section nomlar: {debugInfo.assignedSectionNames?.join(", ") || "Yo'q"}</li>
              <li>Mavjud section lar: {debugInfo.availableSections?.join(", ") || "Yo'q"}</li>
            </ul>
          </div>

          <div className="bg-yellow-50 p-4 rounded-lg mb-6 text-left border border-yellow-200">
            <h2 className="font-semibold mb-2 text-yellow-800">Muammoni hal qilish:</h2>
            <p className="text-sm text-yellow-700">
              Sections kolleksiyasida fan ID lariga mos ma'lumotlar mavjud emasligini yoki testlardagi section nomlari
              sections kolleksiyasidagi name maydonlari bilan mos kelmasligini tekshiring.
            </p>
          </div>

          <Link
            to="/"
            className="inline-flex items-center px-6 py-3 bg-blue-600 text-white font-medium rounded-xl hover:bg-blue-700 transition-colors"
          >
            <Home className="w-5 h-5 mr-2" />
            Bosh sahifaga qaytish
          </Link>
        </div>
      </div>
    )
  }

  if (isQuizFinished) {
    const grade = calculateGrade(score, tests.length)
    const percentage = (score / tests.length) * 100

    // Fanlar bo'yicha statistika
    const subjectStats = {}
    answers.forEach((answer) => {
      const section = answer.section
      if (!subjectStats[section]) {
        subjectStats[section] = { correct: 0, total: 0 }
      }
      subjectStats[section].total++
      if (answer.isCorrect) {
        subjectStats[section].correct++
      }
    })

    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 via-blue-50 to-purple-50 flex items-center justify-center p-4">
        <div className="max-w-4xl w-full bg-white rounded-3xl shadow-2xl overflow-hidden">
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
                <p className="text-sm text-gray-500 mt-1">
                  {questionsLimit} ta savoldan {score} ta to'g'ri
                </p>
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

            {/* Fanlar bo'yicha statistika */}
            <div className="mb-8">
              <h3 className="text-lg font-semibold text-gray-800 mb-4 text-center">Fanlar bo'yicha natijalar</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {Object.entries(subjectStats).map(([section, stats]) => (
                  <div key={section} className="bg-gray-50 rounded-lg p-3 text-center">
                    <p className="font-medium text-gray-800 text-sm">{section}</p>
                    <p className="text-xs text-gray-600">
                      {stats.correct}/{stats.total}
                    </p>
                    <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
                      <div
                        className="bg-blue-500 h-2 rounded-full"
                        style={{ width: `${(stats.correct / stats.total) * 100}%` }}
                      ></div>
                    </div>
                  </div>
                ))}
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
                <p className="text-xs text-gray-400">Jami: {questionsLimit} ta savol</p>
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
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl md:text-2xl font-semibold text-gray-800 leading-relaxed flex-1">
                {currentQuestion?.question}
              </h2>
              {currentQuestion?.section && (
                <span className="ml-4 px-3 py-1 bg-blue-100 text-blue-800 text-xs font-medium rounded-full">
                  {currentQuestion.section}
                </span>
              )}
            </div>
          </div>

          <div className="p-8">
            <div className="grid gap-4">
              {currentQuestion?.options?.map((option, index) => {
                let buttonClass =
                  "group relative w-full p-6 text-left rounded-2xl border-2 transition-all duration-300 transform hover:scale-[1.02] hover:shadow-lg"

                if (selectedOption === null) {
                  buttonClass += " border-gray-200 bg-gray-50 hover:border-blue-300 hover:bg-blue-50"
                } else {
                  if (index === selectedOption) {
                    buttonClass += " border-blue-400 bg-blue-50 text-blue-800"
                  } else {
                    buttonClass += " border-gray-200 bg-gray-100 text-gray-500"
                  }
                }

                return (
                  <button
                    key={index}
                    onClick={() => handleOptionClick(option, index)}
                    disabled={selectedOption !== null}
                    className={buttonClass}
                  >
                    <div className="flex items-center space-x-4">
                      <div
                        className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-lg ${
                          selectedOption === index
                            ? "bg-blue-500 text-white"
                            : "bg-blue-100 text-blue-600 group-hover:bg-blue-200"
                        }`}
                      >
                        {indexToLetter(index)}
                      </div>
                      <span className="flex-1 text-lg font-medium">{option}</span>
                      {selectedOption === null && (
                        <ArrowRight className="w-5 h-5 text-gray-400 group-hover:text-blue-500 transition-colors" />
                      )}
                    </div>
                  </button>
                )
              })}
            </div>

            {selectedOption !== null && (
              <div className="mt-6 p-4 rounded-xl bg-blue-50 border border-blue-200">
                <p className="text-blue-800 text-center font-medium">
                  Javobingiz qabul qilindi. Keyingi savolga o'tmoqdamiz...
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
