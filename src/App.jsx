import { BrowserRouter, Routes, Route } from "react-router-dom";
import TestProducts from "./TestProducts";
import TestOfflineSale from "./TestOfflineSale";
import TestOnlineSaleSync from "./TestOnlineSaleSync";
import AutoSaleSync from "./AutoSaleSync";

function App() {
  const getToken = () => {
    const token =
      "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiI2YWJhYmUxOWE3N2UzNjMwZjg4MTRhYTgiLCJlbWFpbCI6Im1vc2VzQGV4YW1wbGUuY29tIiwibmFtZSI6Ik1vc2VzIEZhZGhpbGkgTWFzaGEiLCJyb2xlIjoib3duZXIiLCJidXNpbmVzc0lkIjoiNmFiYWJlMTdhNzdlMzYzMGY4ODE0YWE3IiwiaXNBY3RpdmUiOnRydWUsImlhdCI6MTc5MjUzMDExMCwiZXhwIjoxNzkyNTMzNzEwfQ.NALBnxDUS4zG54wv7Rw5LTnW5HQ_o_13Ec3Wy2DaiX0";
    return token;
  };

  return (
    <BrowserRouter>
      <AutoSaleSync getToken={getToken} />
      <Routes>
        <Route path="/" element={<h1>Home Page</h1>} />
        <Route path="/testProduct" element={<TestProducts />} />
        <Route path="/testofflinesale" element={<TestOfflineSale />} />
        <Route path="/testonlinesalesync" element={<TestOnlineSaleSync />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
