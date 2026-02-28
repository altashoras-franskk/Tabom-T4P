  import { createRoot } from "react-dom/client";
  import App from "./app/App.tsx";
  import { I18nProvider } from "./i18n/context";
  import "./styles/index.css";

  createRoot(document.getElementById("root")!).render(
    <I18nProvider>
      <App />
    </I18nProvider>
  );
  