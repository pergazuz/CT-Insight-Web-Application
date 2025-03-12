import {
  BrowserRouter as Router,
  Routes,
  Route,
} from "react-router-dom";

import WelcomePage from "./features/welcome/page";
import SynthesisPage from "./features/synthesis/page";
import ResultPage from "./features/result/page";

function App() {

  return (
    <Router>
      <Routes>
        <Route path="/" element={<WelcomePage />} />
        <Route path="/synthesis" element={<SynthesisPage />} />
        <Route path="/result" element={<ResultPage />} />
      </Routes>
    </Router>
  );
}

export default App;
