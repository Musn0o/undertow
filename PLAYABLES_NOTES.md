# YouTube Playables — pitfalls & fixes (learned building Undertow)

A record of every issue we hit shipping a Phaser 3 + TypeScript game to
YouTube Playables, with the cause and the fix. Reuse this as a pre-flight list
for the next game.

## 1. Renderer / embedding

### 1.1 `Uncaught Error: Framebuffer status: Incomplete Attachment`
- **Symptom:** game hangs on an infinite spinner inside the Playables Test
  Suite; console shows a Phaser WebGL crash during boot
  (`COLOR_ATTACHMENT0: Attachment has no width or height`).
- **Cause:** Phaser's **WebGL** renderer fails to create framebuffers inside a
  sandboxed/cross-origin iframe (seen on Firefox; exacerbated when the canvas
  is 0×0 at boot).
- **Fix:** use the **Canvas** renderer: `type: Phaser.CANVAS`. Canvas is a
  supported Playables rendering API and is stable in iframes.
- **Consequence:** `Graphics.fillGradientStyle()` is **WebGL-only** — on Canvas
  it renders flat. Implement gradients as a stack of filled bands instead.

### 1.2 Game boots at 0×0 and never grows
- **Symptom:** the game loads but the canvas stays 0-height after the Test
  Suite reveals its iframe.
- **Cause:** embeds keep the game hidden at 0×0 until it reports
  `firstFrameReady`, and they don't always fire a usable `resize` event when
  they reveal it. Waiting for a non-zero container *before* booting
  **deadlocks** (never reports ready → never revealed).
- **Fix:** never block boot on container size. Boot immediately, and add a
  size-sync that adopts the real size when it appears:
  ```ts
  const parent = document.getElementById('gameParent');
  const syncSize = () => {
    const w = parent?.clientWidth ?? 0, h = parent?.clientHeight ?? 0;
    if (w > 0 && h > 0 && (game.scale.width !== w || game.scale.height !== h)) {
      game.scale.resize(w, h); // Phaser.Scale.RESIZE
    }
  };
  new ResizeObserver(syncSize).observe(parent);
  setInterval(syncSize, 300); // belt-and-suspenders
  ```

## 2. SDK loading & readiness

### 2.1 Test Suite: “SDK loaded before any game code” fails
- **Cause:** the SDK `<script>` was marked `async`, so the browser was allowed
  to run game code before the SDK loaded. Waiting at runtime is not enough —
  the Test Suite checks ordering.
- **Fix:** load the SDK as a **plain blocking script before the game module**.
  Do **not** add `async`/`defer`.
  ```html
  <script src="https://www.youtube.com/game_api/v1"></script>
  <script type="module" src="./assets/index-*.js"></script>
  ```

### 2.2 Readiness signals
- Call `firstFrameReady()` once a loading/splash frame is visible.
- Call `gameReady()` only when the game is actually interactive (menu/gameplay),
  and within ~5s. Never call `gameReady()` over a loader.
- Order must be `firstFrameReady` → `gameReady`.

## 3. Integration rules (certification)

- `loadData()` **must resolve before** any `saveData()` call.
- Save data is a **string ≤ 3 MiB**, valid UTF-16 (strip lone surrogates).
- Handle `onPause` / `onResume` (pause **everything**: loop, audio, rendering).
  Do **not** use the Page Visibility API.
- Handle `onAudioEnabledChange` / `isAudioEnabled` and obey mute instantly.
- **No external network calls.** The YouTube CSP is effectively
  `connect-src 'self' blob: data:`, `img-src 'self' blob: data:`,
  `script-src 'self' 'unsafe-eval' 'unsafe-inline' blob: https://www.youtube.com/game_api/v1`,
  `font-src ... googleapis`. So: no external analytics, multiplayer servers,
  CDNs, or Google Fonts unless allowed.
- No off-platform ads or in-app purchases. Use only SDK ad functions
  (`requestInterstitialAd`, `requestRewardedAd`), grant a reward only when the
  promise resolves `true`, and check region support.
- **Inside Playables, use ONLY the SDK cloud save.** `localStorage` is
  acceptable only when running outside Playables (local dev / web demo).
- Use `sendScore({ value })` with a single integer progress dimension.

## 4. Hosting & build

- For sub-path hosting (GitHub Pages project sites), set Vite `base: './'` so
  assets resolve relative to the page.
- **GitHub Pages on the free plan requires a public repo.** Don't make the repo
  private until after review/certification or the demo URL goes down.
- `*.netlify.app` was unreachable from some networks/tooling; GitHub Pages
  (`*.github.io`) worked reliably. Pick a host you can actually verify.
- Bundle limits: **initial bundle < 30 MB**, **each file < 30 MB**,
  **total < 250 MB**, **< 8,000 files**, **JS heap < 512 MB**.

## 5. Testing (reproduce the platform locally)

- Serve the build under the **exact YouTube CSP** and load it inside a
  `<iframe sandbox="allow-scripts allow-same-origin allow-pointer-lock">` to
  catch iframe-only failures (this is how we caught the WebGL bug).
- **Mock `window.ytgame`** (inject before page scripts) and record the call
  order to assert `loadData` before `saveData`, `firstFrameReady` before
  `gameReady`, and that pause/resume/audio handlers are registered.
- Chrome headless throttles `requestAnimationFrame`, so `time.delayedCall`
  scene transitions may never fire and screenshots look “stuck”. Validate with
  a real CDP driver (puppeteer-core + `--enable-unsafe-swiftshader`) instead of
  `--virtual-time-budget`.
- Add **deep-link dev routes** (e.g. `#play`, `#shop`) handled in `Boot` so you
  can open a scene directly without playing through timers.

## 6. Pre-flight checklist for the next game

- [ ] Canvas renderer (`Phaser.CANVAS`); no WebGL-only features.
- [ ] SDK = blocking `<script>` before game code.
- [ ] `firstFrameReady` → `gameReady` (interactive, < 5s).
- [ ] `loadData` awaited before `saveData`; save < 3 MiB, valid string.
- [ ] pause/resume + audio mute handled; no Page Visibility API.
- [ ] No external requests; under YouTube CSP with zero violations.
- [ ] Cloud save in Playables only; localStorage only outside.
- [ ] Vite `base: './'`; host verified reachable; repo public for free Pages.
- [ ] Bundle within limits (< 30 MB initial/file, < 250 MB total).
- [ ] Verified in a sandboxed iframe with the Test Suite, then the hosted Test
      Suite, then real Android/iOS/desktop.
