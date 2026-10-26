//Token storage, "Remember me to localStorage" else sessionStorage

const KEYS = ["AccessToken", "user"];

export function saveSession(token, user, remember) {
  clearSession();
  try {
    const s = remember ? localStorage : sessionStorage;
    s.setItem("accessToken", token);
    s.setItem("fm_user", JSON.stringify(user));
  } catch (error) {
    console.error(error);
  }
}

export function getToken() {
  try {
    return (
      sessionStorage.getItem("AccessToken") ||
      localStorage.getItem("AccessToken")
    );
  } catch {
    return null;
  }
}

export function clearSession() {
  try {
    KEYS.forEach((k) => {
      sessionStorage.removeItem(k);
      localStorage.removeItem(k);
    });
  } catch (error) {
    console.error(error);
  }
}
