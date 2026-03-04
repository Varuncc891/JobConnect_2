import React, { createContext, useState } from "react";
import ReactDOM from "react-dom/client";
import App from "./App.js";
import { User, ContextType } from "./types/index.js";

export const Context = createContext<ContextType>({
  isAuthorized: false,
  setIsAuthorized: () => {},
  user: null,
  setUser: () => {},
  isLoading: true,
  setIsLoading: () => {},
});

const AppWrapper = () => {
  const [isAuthorized, setIsAuthorized] = useState<boolean>(false);
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  return (
    <Context.Provider value={{ isAuthorized, setIsAuthorized, user, setUser, isLoading, setIsLoading }}>
      <App />
    </Context.Provider>
  );
};

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <AppWrapper />
  </React.StrictMode>
);