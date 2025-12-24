import { BrowserRouter, Routes, Route } from 'react-router-dom';
import HomePage from './pages/HomePage';
import AgencyPage from './pages/AgencyPage';
import './index.css';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/agency" element={<AgencyPage />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
