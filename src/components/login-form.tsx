"use client";

import { useActionState, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Field, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { loginAction, type LoginState } from "@/actions/auth";
import { guessDeviceClient, persistDeviceLocal } from "@/lib/device-client";

function captchaSrc() {
  return `/api/login-captcha?t=${Date.now()}`;
}

export function LoginForm({ next, expired }: { next?: string; expired?: boolean }) {
  const [state, action, pending] = useActionState(loginAction, null as LoginState);
  const [img, setImg] = useState("/api/login-captcha");

  useEffect(() => {
    if (state?.error) setImg(captchaSrc());
  }, [state]);

  return (
    <form
      className="flex flex-col gap-4"
      action={action}
      onSubmit={() => {
        persistDeviceLocal(guessDeviceClient());
      }}
    >
      <input type="hidden" name="next" value={next ?? ""} />
      {expired && !state?.error ? (
        <Alert>
          <AlertTitle>登录已过期</AlertTitle>
          <AlertDescription>重新登录后再继续。</AlertDescription>
        </Alert>
      ) : null}
      {state?.error ? (
        <Alert variant="destructive">
          <AlertTitle>进不去</AlertTitle>
          <AlertDescription>
            {state.error === "请输入账号和密码" || state.error === "请填写验证码" || state.error === "验证码不对"
              ? state.error
              : "登录名或密码不对。再试一次，或找店主看账号是不是加过。"}
          </AlertDescription>
        </Alert>
      ) : null}
      <Field>
        <FieldLabel htmlFor="username">登录名</FieldLabel>
        <Input
          id="username"
          name="username"
          autoComplete="username"
          autoCapitalize="none"
          autoCorrect="off"
          spellCheck={false}
          aria-invalid={!!state?.error}
          className="h-12 text-base md:h-10 md:text-sm"
          placeholder="例如 owner"
        />
      </Field>
      <Field>
        <FieldLabel htmlFor="password">密码</FieldLabel>
        <Input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          aria-invalid={!!state?.error}
          className="h-12 text-base md:h-10 md:text-sm"
        />
      </Field>
      <Field>
        <FieldLabel htmlFor="captcha">验证码</FieldLabel>
        <div className="flex items-center gap-2">
          <Input
            id="captcha"
            name="captcha"
            autoComplete="off"
            autoCapitalize="characters"
            autoCorrect="off"
            spellCheck={false}
            aria-invalid={state?.error === "验证码不对" || state?.error === "请填写验证码"}
            className="h-12 flex-1 text-base tracking-widest md:h-10 md:text-sm"
            placeholder="不分大小写"
            maxLength={8}
          />
          <button
            type="button"
            className="h-12 shrink-0 overflow-hidden rounded-lg border bg-muted md:h-10"
            title="看不清，换一张"
            onClick={() => setImg(captchaSrc())}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={img} alt="验证码" width={132} height={44} className="h-12 w-[132px] object-cover md:h-10" />
          </button>
        </div>
      </Field>
      <Button type="submit" className="h-12 w-full text-base md:h-10 md:text-sm" disabled={pending}>
        {pending ? "正在进入…" : "进入系统"}
      </Button>
    </form>
  );
}
