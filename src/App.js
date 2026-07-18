
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import './App.css';
import Adminportal from './pages/admin2002';
import Navbar from "./pages/navbar";
import Slot from "./pages/slot";
function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Adminportal />} />
        <Route path="/navbar" element={<Navbar />} />
        <Route path="/slot" element={<Slot />} />
        {/* <Route path="/resumeform" element={<Resumeform />} /> */}
      </Routes>
    </Router>

  );
}

export default App;
