import * as React from "react";
import App from "./App";
import { AppStateProvider } from "./provider/AppStateProvider";
import { createRoot } from "react-dom/client";

const container = document.getElementById("app")!;
const root = createRoot(container);
root.render(
    <React.StrictMode>
        <AppStateProvider>
            <App />
        </AppStateProvider>
    </React.StrictMode>
);
