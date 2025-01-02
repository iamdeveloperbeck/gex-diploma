import { useState, useEffect } from "react";
import { collection, getDocs, addDoc } from "firebase/firestore";
import { db } from "../data/firebase";
import { useLocation, useNavigate } from "react-router-dom";

export default function QuizComponent() {
  const [tests, setTests] = useState([]);
  const [currentTestIndex, setCurrentTestIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [timer, setTimer] = useState(40);
  const [isLoading, setIsLoading] = useState(true);
  const [isQuizFinished, setIsQuizFinished] = useState(false);

  const location = useLocation();
  const navigate = useNavigate();

  // Foydalanuvchi ma'lumotlarini olish va tekshirish
  const { name, group, group_id } = location.state || {};

  useEffect(() => {
    if (!name || !group || !group_id) {
      console.error("Foydalanuvchi ma'lumotlari mavjud emas yoki to'liq emas!");
      window.location.href = "/"
      return null;
    }
  }, [location.state]);

  // Testlarni Firebase'dan yuklash
  useEffect(() => {
    const fetchTests = async () => {
      try {
        const testCollection = collection(db, "questions");
        const testSnapshot = await getDocs(testCollection);
        const testList = testSnapshot.docs.map((doc) => doc.data());
        setTests(testList);
        setIsLoading(false);
      } catch (error) {
        console.error("Testlarni yuklashda xatolik:", error);
      }
    };
    fetchTests();
  }, []);

  // Timer boshqaruvi
  useEffect(() => {
    if (timer > 0 && !isQuizFinished) {
      const interval = setInterval(() => {
        setTimer((prev) => prev - 1);
      }, 1000);
      clearInterval(interval);
    } else if (timer === 0) {
      handleNext();
    }
  }, [timer, isQuizFinished]);

  useEffect(() => {
    const handleBeforeUnload = (event) => {
      return navigate("/");
    };

    const handleKeyDown = (event) => {
      if (event.key === "F5" || (event.ctrlKey && event.key === "r")) {
        event.preventDefault(); // Refresh yoki yangilanishni to'xtatadi
        alert("Sahifa yangilanishi bloklandi!");
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    window.addEventListener("beforeunload", handleBeforeUnload);

    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  const handleOptionClick = (selectedOption) => {
    if (selectedOption === tests[currentTestIndex]?.correctAnswer) {
      setScore((prev) => prev + 1);
    }
    handleNext();
  };

  const handleNext = () => {
    if (currentTestIndex < tests.length - 1) {
      setCurrentTestIndex((prev) => prev + 1);
      setTimer(40);
    } else {
      setIsQuizFinished(true);
      const grade = calculateGrade(score, tests.length);
      saveResultsToFirebase(score, tests.length, grade);
    }
  };

  const calculateGrade = (finalScore, totalQuestions) => {
    const percentage = (finalScore / totalQuestions) * 100;
    if (percentage >= 85) return 5;
    if (percentage >= 71) return 4;
    if (percentage >= 56) return 3;
    return 2;
  };

  const saveResultsToFirebase = async (score, totalQuestions, grade) => {
    try {
      const resultsCollection = collection(db, "results");
      await addDoc(resultsCollection, {
        name,
        group,
        group_id,
        score,
        totalQuestions,
        grade,
        date: new Date().toISOString(),
      });
      console.log("Natijalar muvaffaqiyatli saqlandi!");
    } catch (error) {
      console.error("Natijalarni saqlashda xatolik:", error);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (isQuizFinished) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="max-w-md p-8 bg-white rounded-lg shadow-lg">
          <h1 className="text-2xl font-bold mb-6">Test yakunlandi!</h1>
          <p className="text-lg">
            To'g'ri javoblar: {score} / {tests.length}
          </p>
          <p className="text-lg">
            Yakuniy baho: {calculateGrade(score, tests.length)}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-blue-50">
      <div className="max-w-2xl bg-white p-6 rounded-lg shadow-lg">
        <h1 className="text-xl font-bold mb-4">
          Test {currentTestIndex + 1} / {tests.length}
        </h1>
        <p className="mb-6">{tests[currentTestIndex]?.question}</p>
        <div className="grid gap-4">
          {tests[currentTestIndex]?.options.map((option, index) => (
            <button
              key={index}
              onClick={() => handleOptionClick(option)}
              className="px-4 py-2 bg-gray-200 rounded-lg hover:bg-blue-500 hover:text-white transition"
            >
              {option}
            </button>
          ))}
        </div>
        <div className="mt-4">
          <p>Vaqt: {timer} soniya</p>
        </div>
      </div>
    </div>
  );
}
