import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { CartProvider } from "./context/CartContext";

import Navigation from "./components/Navigation";
import Hero from "./components/Hero";
import Services from "./components/Services";
import About from "./components/About";
import Contact from "./components/Contact";
import Footer from "./components/Footer";
import Store from "./components/Store";
import Cart from "./components/Cart";

function PageWrapper({ children }: { children: React.ReactNode }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.35, ease: "easeOut" }}
    >
      {children}
    </motion.div>
  );
}

function AnimatedRoutes() {
  const location = useLocation();

  return (
    <AnimatePresence mode="wait">
      <Routes location={location} key={location.pathname}>
        <Route
          path="/"
          element={
            <PageWrapper>
              <Hero />
              <Services />
              <About />
              <Contact />
              <Footer />
            </PageWrapper>
          }
        />

        <Route
          path="/store"
          element={
            <PageWrapper>
              <Store />
              <Footer />
            </PageWrapper>
          }
        />

        <Route
          path="/cart"
          element={
            <PageWrapper>
              <Cart />
              <Footer />
            </PageWrapper>
          }
        />
      </Routes>
    </AnimatePresence>
  );
}

export default function App() {
  return (
    <CartProvider>
      <BrowserRouter>
        <div className="min-h-screen">
          <Navigation />
          <AnimatedRoutes />
        </div>
      </BrowserRouter>
    </CartProvider>
  );
}
