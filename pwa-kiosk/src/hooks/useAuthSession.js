import { useState } from "react";

import { TOKEN_KEY, USER_KEY } from "../config/storage";
import { loginUser } from "../services/apiClient";

const readStoredUser = () => {
  try {
    return JSON.parse(localStorage.getItem(USER_KEY) || "null");
  } catch {
    return null;
  }
};

export const useAuthSession = () => {
  const [token, setToken] = useState(() => localStorage.getItem(TOKEN_KEY) || "");
  const [user, setUser] = useState(readStoredUser);

  const login = async (credentials) => {
    const session = await loginUser(credentials);
    localStorage.setItem(TOKEN_KEY, session.token);
    localStorage.setItem(USER_KEY, JSON.stringify(session.user));
    setToken(session.token);
    setUser(session.user);
    return session;
  };

  const logout = () => {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    setToken("");
    setUser(null);
  };

  return { token, user, login, logout };
};
