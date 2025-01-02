import { Route, Routes } from 'react-router-dom';
import './App.css';
import Login from './components/Login';
import QuizComponent from './components/QuizComponent';

function App() {
  return (
    <>  
      <Routes>
        <Route path="/" element={<Login />} />
        <Route path="/quiz" element={<QuizComponent />} />
      </Routes>
    </>
  );
}

export default App;