import {
  Component,
  useEffect,
  useLayoutEffect,
  useRef,
  type ErrorInfo,
  type ReactNode,
} from "react";
import { BookOpen, Camera, House, PenLine, UserRound } from "lucide-react";
import { StoreProvider, useStore } from "@/lib/store";
import { ToastProvider } from "@/components/Toast";
import { BrandMark } from "@/components/brand";
import { matchPlanId, navigate, useRoute } from "@/lib/router";
import { HomePage } from "@/pages/Home";
import { PreparePage } from "@/pages/Prepare";
import { PlanDetailPage } from "@/pages/PlanDetail";
import { LibraryPage } from "@/pages/Library";
import { ScanPage } from "@/pages/Scan";
import { ProfilePage } from "@/pages/Profile";
import { ReviewPage } from "@/pages/Review";
import { StatsPage } from "@/pages/Stats";
import { AboutPage } from "@/pages/About";
import { CoursewarePage } from "@/pages/Courseware";
import { JsonCoursewarePage } from "@/pages/JsonCourseware";
import { LoginPage } from "@/pages/Login";
import { EmptyState } from "@/components/ui";

const NAV_ITEMS = [
  { path: "/", label: "首页", icon: House },
  { path: "/library", label: "资源", icon: BookOpen },
  { path: "/prepare", label: "备课", icon: PenLine, center: true },
  { path: "/scan", label: "讲评", icon: Camera },
  { path: "/me", label: "我的", icon: UserRound },
];

function BottomNav({ route }: { route: string }) {
  return (
    <nav className="bottom-nav no-print" aria-label="主导航">
      {NAV_ITEMS.map((item) => {
        const active =
          item.path === "/" ? route === "/" : route === item.path || route.startsWith(`${item.path}/`);
        const Icon = item.icon;
        if (item.center) {
          return (
            <button
              type="button"
              key={item.path}
              className="nav-center"
              onClick={() => navigate(item.path)}
              aria-label="智能备课"
            >
              <span className="nav-center-mark">
                <Icon size={20} />
              </span>
              <span>{item.label}</span>
            </button>
          );
        }
        return (
          <button
            type="button"
            key={item.path}
            className={`nav-item ${active ? "nav-item--active" : ""}`}
            onClick={() => navigate(item.path)}
            aria-current={active ? "page" : undefined}
          >
            <Icon size={19} strokeWidth={active ? 2.2 : 1.7} aria-hidden="true" />
            <span>{item.label}</span>
          </button>
        );
      })}
    </nav>
  );
}

function NotFound() {
  return (
    <div className="page">
      <EmptyState
        icon={<BookOpen size={20} />}
        title="这个页面不在小程序里"
        desc="回到首页，继续备课或逛全国资源库。"
        action={
          <button type="button" className="btn btn-sm" onClick={() => navigate("/")}>
            回到首页
          </button>
        }
      />
    </div>
  );
}

class ErrorBoundary extends Component<{ children: ReactNode }, { hasError: boolean }> {
  state = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("乡课页面异常", error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="app-stage">
          <div className="app-shell">
            <div className="page" style={{ paddingTop: 80 }}>
              <EmptyState
                icon={<BookOpen size={20} />}
                title="页面遇到了一点问题"
                desc="数据仍保存在本机，刷新后可以继续。"
                action={
                  <button
                    type="button"
                    className="btn btn-sm"
                    onClick={() => window.location.reload()}
                  >
                    重新加载
                  </button>
                }
              />
            </div>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

function Shell() {
  const route = useRoute();
  const { state } = useStore();
  const planId = matchPlanId(route);
  const shellRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    const active = document.activeElement as HTMLElement | null;
    if (active && active.closest(".bottom-nav")) active.blur();
    const shell = shellRef.current;
    if (!shell) return;
    shell.scrollTop = 0;
    const frame = window.requestAnimationFrame(() => {
      shell.scrollTop = 0;
    });
    return () => window.cancelAnimationFrame(frame);
  }, [route]);

  const hideNav =
    route === "/prepare" ||
    route === "/courseware" ||
    route === "/json-courseware" ||
    Boolean(planId) ||
    route === "/review" ||
    route === "/stats" ||
    route === "/about";

  useEffect(() => {
    const titles: Record<string, string> = {
      "/": "乡课 · 教师 AI 备课与全国教研共享",
      "/prepare": "智能备课 · 乡课",
      "/courseware": "课件生成 · 乡课",
      "/json-courseware": "JSON 课件 · 乡课",
      "/library": "全国资源库 · 乡课",
      "/scan": "拍照讲评 · 乡课",
      "/me": "我的 · 乡课",
      "/review": "教师教案 · 乡课",
      "/stats": "全国统计 · 乡课",
      "/about": "关于乡课",
    };
    document.title = planId
      ? "教案包 · 乡课"
      : titles[route] ?? "乡课 · 教师 AI 备课与全国教研共享";
  }, [route, planId, state.role]);

  let content: ReactNode;
  if (route === "/") content = <HomePage />;
  else if (route === "/prepare") content = <PreparePage />;
  else if (route === "/courseware") content = <CoursewarePage />;
  else if (route === "/json-courseware") content = <JsonCoursewarePage />;
  else if (planId) content = <PlanDetailPage planId={planId} />;
  else if (route === "/library") content = <LibraryPage />;
  else if (route === "/scan") content = <ScanPage />;
  else if (route === "/me") content = <ProfilePage />;
  else if (route === "/review") content = <ReviewPage />;
  else if (route === "/stats") content = <StatsPage />;
  else if (route === "/about") content = <AboutPage />;
  else content = <NotFound />;

  return (
    <div className="app-stage">
      <aside className="stage-aside no-print" aria-hidden="true">
        <div className="stage-brand">
          <BrandMark size={38} variant="cream" />
          <span>乡课</span>
        </div>
        <p className="stage-quote">
          把「没有投影仪」
          <br />
          写进教案。
        </p>
        <ul className="stage-points">
          <li>没有投影也能上的教案</li>
          <li>一位老师的备课，变成全国的公共资源</li>
          <li>教师端产品，学生不碰屏幕</li>
        </ul>
        <div className="stage-meta">
          2026 Qoder 高校创造力大赛
          <br />
          Hack4Good 技术向善 · 教育与乡村
        </div>
        <div className="stage-demo">数据仅保存在本机浏览器</div>
      </aside>
      <div className="app-shell" ref={shellRef}>
        <main className="app-main" key={route}>
          {content}
        </main>
        {!hideNav && <BottomNav route={route} />}
      </div>
    </div>
  );
}

function Gate() {
  const { state } = useStore();
  if (!state.profile) return <LoginPage />;
  return <Shell />;
}

export default function App() {
  return (
    <ErrorBoundary>
      <StoreProvider>
        <ToastProvider>
          <Gate />
        </ToastProvider>
      </StoreProvider>
    </ErrorBoundary>
  );
}