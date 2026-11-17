import { useState } from "react";
import type { FormEvent } from "react";
import { BrandMark } from "@/components/brand";
import { FieldLabel } from "@/components/ui";
import { PROVINCE_COUNTIES } from "@/lib/regions";
import { navigate } from "@/lib/router";
import { useStore } from "@/lib/store";
import { PROVINCES } from "@/lib/types";
import type { Role } from "@/lib/types";

const OTHER = "__other__";
const REMEMBER_KEY = "xiangke.login.remember.v1";

interface Remembered {
  name: string;
  province: string;
  county: string;
  role: Role;
}

function loadRemembered(): Remembered | null {
  try {
    const raw = localStorage.getItem(REMEMBER_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<Remembered>;
    if (!parsed?.name || !parsed?.province || !parsed?.county) return null;
    return {
      name: String(parsed.name),
      province: String(parsed.province),
      county: String(parsed.county),
      role: parsed.role === "reviewer" ? "reviewer" : "teacher",
    };
  } catch {
    return null;
  }
}

export function LoginPage() {
  const { login } = useStore();
  const [saved] = useState(loadRemembered);
  const savedCountyInList =
    !!saved && (PROVINCE_COUNTIES[saved.province] ?? []).includes(saved.county);
  const [role, setRole] = useState<Role>(saved?.role ?? "teacher");
  const [name, setName] = useState(saved?.name ?? "");
  const [province, setProvince] = useState(saved?.province ?? "");
  const [county, setCounty] = useState(
    saved ? (savedCountyInList ? saved.county : OTHER) : "",
  );
  const [customCounty, setCustomCounty] = useState(
    saved && !savedCountyInList ? saved.county : "",
  );
  const [remember, setRemember] = useState(!!saved);
  const [error, setError] = useState("");

  const counties = province ? PROVINCE_COUNTIES[province] ?? [] : [];
  const effectiveCounty = county === OTHER ? customCounty.trim() : county;
  const ready = name.trim().length > 0 && province.length > 0 && effectiveCounty.length > 0;

  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (!ready) {
      setError("请填写姓名，并选择省份、县域");
      return;
    }
    login({ name, province, county: effectiveCounty, role });
    try {
      if (remember) {
        localStorage.setItem(
          REMEMBER_KEY,
          JSON.stringify({ name, province, county: effectiveCounty, role }),
        );
      } else {
        localStorage.removeItem(REMEMBER_KEY);
      }
    } catch {
      // 存储不可用时仍可正常登录
    }
    navigate("/");
  };

  return (
    <div className="login-stage">
      <div className="login-card">
        <div className="login-brand">
          <BrandMark size={40} />
          <div>
            <div className="login-brand-name">乡课</div>
            <div className="login-brand-sub">让村小也能备一堂好课</div>
          </div>
        </div>

        <h1 className="login-title">先登录，再备课</h1>
        <p className="login-sub">
          只要姓名和地区，不需要密码。登录信息只保存在本机浏览器，用于个人页与教案署名。
        </p>

        <div className="tabs" role="tablist" aria-label="选择身份">
          <button
            type="button"
            role="tab"
            aria-selected={role === "teacher"}
            className={`tab ${role === "teacher" ? "tab--active" : ""}`}
            onClick={() => setRole("teacher")}
          >
            我是教师
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={role === "reviewer"}
            className={`tab ${role === "reviewer" ? "tab--active" : ""}`}
            onClick={() => setRole("reviewer")}
          >
            我是教研员
          </button>
        </div>
        <div className="tiny muted" style={{ margin: "7px 0 14px", lineHeight: 1.55 }}>
          {role === "teacher"
            ? "教师：备课、课件与资源复用。"
            : "教研员：查看全平台教师教案与全国统计。"}
          切换身份请退出登录后重新选择。
        </div>

        <form onSubmit={submit} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <label className="field">
            <FieldLabel label="姓名" hint="必填" />
            <input
              className="input"
              value={name}
              maxLength={12}
              placeholder="例如：李秀梅"
              onChange={(event) => {
                setName(event.target.value);
                setError("");
              }}
              aria-label="姓名"
            />
          </label>

          <label className="field">
            <FieldLabel label="省份" hint="必填" />
            <select
              className="input"
              value={province}
              onChange={(event) => {
                setProvince(event.target.value);
                setCounty("");
                setCustomCounty("");
                setError("");
              }}
              aria-label="省份"
            >
              <option value="">请选择省份</option>
              {PROVINCES.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
          </label>

          <label className="field">
            <FieldLabel label="县域" hint="必填" />
            <select
              className="input"
              value={county}
              disabled={!province}
              onChange={(event) => {
                setCounty(event.target.value);
                setError("");
              }}
              aria-label="县域"
            >
              <option value="">{province ? "请选择县域" : "请先选择省份"}</option>
              {counties.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
              {province && <option value={OTHER}>其他（手动填写）</option>}
            </select>
          </label>

          {county === OTHER && (
            <label className="field">
              <FieldLabel label="填写县域" hint="必填" />
              <input
                className="input"
                value={customCounty}
                maxLength={20}
                placeholder="例如：云岭县"
                onChange={(event) => {
                  setCustomCounty(event.target.value);
                  setError("");
                }}
                aria-label="手动填写县域"
              />
            </label>
          )}

          {error && <div className="login-error">{error}</div>}

          <label className="login-remember">
            <input
              type="checkbox"
              checked={remember}
              onChange={(event) => setRemember(event.target.checked)}
            />
            <span>记住登录信息（下次自动填入）</span>
          </label>

          <button type="submit" className="btn btn-block" disabled={!ready}>
            进入乡课
          </button>
        </form>

        <div className="login-foot">登录后只显示姓名与地区</div>
      </div>
    </div>
  );
}
