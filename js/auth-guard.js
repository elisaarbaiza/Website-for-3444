(() => {
  const requiresAuth = document.currentScript?.dataset?.protectPage !== undefined;
  if (!requiresAuth) return;

  const userId = localStorage.getItem("user_id");
  if (userId) return;

  const currentPath = window.location.pathname;
  const currentPage = currentPath.split("/").pop() || "main.html";
  const safeNext = encodeURIComponent(currentPage);
  window.location.replace(`login.html?next=${safeNext}`);
})();
