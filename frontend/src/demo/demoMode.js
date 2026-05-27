function getParams() {
  if (typeof window === "undefined") return new URLSearchParams();
  return new URLSearchParams(window.location.search);
}

export function isMockupView() {
  return getParams().get("view") === "mockup";
}

export function isDemoMode() {
  const params = getParams();
  return params.get("demo") === "1" || params.get("view") === "mockup";
}
