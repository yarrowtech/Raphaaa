let currentSession = null;

export function setSession(session) {
  currentSession = session;
}

export function clearSession() {
  currentSession = null;
}

export function getSession() {
  return currentSession;
}

export function isLoggedIn() {
  return Boolean(currentSession?.user);
}
