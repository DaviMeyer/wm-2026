import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { MotionConfig } from "framer-motion";
import App from "./App";
import { ThemeProvider } from "./lib/theme";
import "./index.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <BrowserRouter>
      {/* reducedMotion="user" lässt framer-motion die System­einstellung
          „Bewegung reduzieren" respektieren – CSS allein deckt JS-Animationen nicht ab. */}
      <MotionConfig reducedMotion="user">
        <ThemeProvider>
          <App />
        </ThemeProvider>
      </MotionConfig>
    </BrowserRouter>
  </StrictMode>
);
