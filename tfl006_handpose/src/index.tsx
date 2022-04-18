import * as React from "react";
import ReactDOM from "react-dom";
import App from "./App";
import { AppStateProvider } from "./provider/AppStateProvider";

ReactDOM.render(
    <React.StrictMode>
        <AppStateProvider>
            <App />
        </AppStateProvider>
    </React.StrictMode>,
    document.getElementById("app")
);
