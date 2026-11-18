import {
  BrowserRouter,
  Routes,
  Route,
  Navigate,
  Outlet,
} from "react-router-dom";
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
import { useContext } from "react";
import { AuthContext } from "./AuthContext";

function RequireAuth() {
  const { authStatus } = useContext(AuthContext);

  if (authStatus === "loading") {
    return <div>Restoring your session...</div>;
  }

  if (authStatus === "offline") {
    return (
      <div>
        <h2>Unable to verify your session</h2>
        <p>
          You appear to be offline. Connect to the internet to restore your
          authentication session.
        </p>
      </div>
    );
  }

  if (authStatus !== "authenticated") {
    return <Navigate to="/login" replace />;
  }

  return (
    <>
      <AutoSaleSync />
      <Outlet />
    </>
  );
}

function App() {
  const { accessToken, getToken, authStatus } = useContext(AuthContext);

  useEffect(() => {
    // Do not start catalogue synchronization when logged out.
    if (authStatus !== "authenticated" || !accessToken) return;

    const stopCatalogueSync = startAutomaticCatalogueSync(getToken);

    return () => {
      stopCatalogueSync();
    };
  }, [authStatus, accessToken, getToken]);

  return (
    <BrowserRouter>
      {/*<AutoSaleSync />*/}
      <Routes>
        <Route path="/" element={<h1>Home Page</h1>} />
        <Route path="/login" element={<Login />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password" element={<ResetPassword />} />
        <Route path="/testProduct" element={<TestProducts />} />
        <Route path="/testofflinesale" element={<TestOfflineSale />} />
        <Route path="/testonlinesalesync" element={<TestOnlineSaleSync />} />

        <Route element={<RequireAuth />}>
          {/* App tabs – all share <Sidebar/> + <Topbar/> through AppLayout */}
          <Route element={<AppLayout />}>
            <Route path="/sales" element={<Sales />} />
            <Route path="/products" element={<Products />} />
            <Route path="/categories" element={<Categories />} />
          </Route>
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
