(() => {
  const params = new URLSearchParams(window.location.hash.slice(1));
  if (params.get("type") === "recovery") {
    window.location.replace(`${window.location.origin}/reset-password.html${window.location.search}${window.location.hash}`);
  }
})();
