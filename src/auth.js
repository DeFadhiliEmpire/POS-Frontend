//Token storage, "Remember me to localStorage" else sessionStorage

const KEYS = ["fm_token", "fm_user"];

export function saveSession(token, user, remember) {
  clearSession();
  try {
    const s = remember ? localStorage : sessionStorage;
    s.setItem("fm_token", token);
    s.setItem("fm_user", JSON.stringify(user));
  } catch (error) {
    console.error(error);
  }
}

export function getToken() {
  try {
    return (
      sessionStorage.getItem("fm_token") || localStorage.getItem("fm_token")
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
