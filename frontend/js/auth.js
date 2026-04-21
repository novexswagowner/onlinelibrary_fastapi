(function () {
  const TOKEN_KEY = "library_token";

  function getToken() {
    try {
      return localStorage.getItem(TOKEN_KEY);
    } catch {
      return null;
    }
  }

  function setToken(token) {
    localStorage.setItem(TOKEN_KEY, token);
  }

  function clearToken() {
    localStorage.removeItem(TOKEN_KEY);
  }

  function isLoggedIn() {
    return Boolean(getToken());
  }

  window.LibraryAuth = {
    getToken,
    setToken,
    clearToken,
    isLoggedIn,
    TOKEN_KEY,
  };
})();
