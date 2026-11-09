import { BrowserRouter, Routes, Route } from "react-router-dom";
import { useEffect } from "react";
import AppLayout from "./components/layout/AppLayout.jsx";
import Login from "./pages/Login.jsx";
import ForgotPassword from "./pages/ForgotPassword.jsx";
import ResetPassword from "./pages/ResetPassword";
import Sales from "./pages/Sales.jsx";
import Products from "./pages/Products.jsx";
import Categories from "./pages/Categories.jsx";
import { startAutomaticCatalogueSync } from "./services/catalogueSyncManager.js";
import TestProducts from "./TestProducts";
import TestOfflineSale from "./TestOfflineSale";
import TestOnlineSaleSync from "./TestOnlineSaleSync";
import AutoSaleSync from "./AutoSaleSync";

function App() {
  {
    /*useEffect(() => {
    const stopCatalogueSync = startAutomaticCatalogueSync(getToken);

    return () => {
      stopCatalogueSync();
    };
  }, []);*/
  }

  return (
    <BrowserRouter>
      <AutoSaleSync />
      <Routes>
        <Route path="/" element={<h1>Home Page</h1>} />
        <Route path="/login" element={<Login />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password" element={<ResetPassword />} />
        <Route path="/testProduct" element={<TestProducts />} />
        <Route path="/testofflinesale" element={<TestOfflineSale />} />
        <Route path="/testonlinesalesync" element={<TestOnlineSaleSync />} />

        {/* App tabs – all share <Sidebar/> + <Topbar/> through AppLayout */}
        <Route element={<AppLayout />}>
          <Route path="/sales" element={<Sales />} />
          <Route path="/products" element={<Products />} />
          <Route path="/categories" element={<Categories />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
