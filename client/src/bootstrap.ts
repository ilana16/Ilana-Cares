// Keep a visible, usable loading screen if a browser cannot load the app bundle.
void import("./main").catch(() => {
  const message = document.getElementById("startup-message");
  if (message) message.textContent = "The website could not finish loading. Please reload the page or open ilana.care in Safari or Chrome.";
});
