//Token storage, "Remember me to localStorage" else sessionStorage

const KEYS = ["accessToken", "fm_user"];

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
      sessionStorage.getItem("accessToken") ||
      localStorage.getItem("accessToken")
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
