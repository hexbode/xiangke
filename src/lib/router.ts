import { useEffect, useState } from "react";

function parseHash(): string {
  const raw = window.location.hash.replace(/^#/, "");
  if (!raw) return "/";
  return raw.startsWith("/") ? raw : `/${raw}`;
}

export function navigate(path: string): void {
  if (window.location.hash === `#${path}`) return;
  window.location.hash = path;
}

export function goBack(fallback = "/"): void {
  if (window.history.length > 1) {
    window.history.back();
  } else {
    navigate(fallback);
  }
}

export function useRoute(): string {
  const [route, setRoute] = useState(parseHash);

  useEffect(() => {
    const onChange = () => setRoute(parseHash());
    window.addEventListener("hashchange", onChange);
    if (!window.location.hash) {
      window.history.replaceState(null, "", "#/");
    }
    return () => window.removeEventListener("hashchange", onChange);
  }, []);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "instant" as ScrollBehavior });
  }, [route]);

  return route;
}

export function matchPlanId(route: string): string | null {
  const match = /^\/plan\/([^/]+)$/.exec(route);
  return match ? decodeURIComponent(match[1]) : null;
}