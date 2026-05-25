import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "@/App";
import { userPreferencesService } from "@/persistence/services/userPreferencesService";
import { useEditorStore } from "@/state/store";
import "@/styles.css";

const rootElement = document.getElementById("root");
if (!rootElement) {
  throw new Error("Root element #root not found");
}

void userPreferencesService
  .load()
  .then((preferences) => {
    useEditorStore.getState().applyUserPreferences(preferences);
  })
  .catch((error) => {
    console.error("Failed to load user preferences", error);
  })
  .finally(() => {
    createRoot(rootElement).render(
      <StrictMode>
        <BrowserRouter>
          <App />
        </BrowserRouter>
      </StrictMode>,
    );
  });
