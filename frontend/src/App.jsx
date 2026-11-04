import { Routes, Route } from "react-router-dom";

import Candidate from "./pages/Candidate";


function App() {
    return (
        <Routes>
            <Route path="/" element={<Candidate />} />          
        </Routes>
    );
}

export default App;
