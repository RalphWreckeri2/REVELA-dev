import { BrowserRouter, Routes, Route } from 'react-router-dom';
import LoginPage from './pages/LoginPage';
import HomePage from './pages/HomePage';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Default route (localhost:5173/) -> mapupunta sa Login */}
        <Route path="/" element={<LoginPage />} />
        
        {/* Home route (localhost:5173/home) -> mapupunta sa Home */}
        <Route path="/home" element={<HomePage />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;