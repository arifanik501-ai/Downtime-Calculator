const targetInput = document.querySelector("#target");
const achievementInput = document.querySelector("#achievement");
const calculateButton = document.querySelector("#calculate");
const buttonText = calculateButton.querySelector(".button-text");
const runtimeButtons = Array.from(document.querySelectorAll(".runtime-pill"));
const resultCard = document.querySelector("#result-card");
const resultNumber = document.querySelector("#result-number");
const formulaText = document.querySelector("#formula");
const smoothToggle = document.querySelector("#smooth-toggle");
const installBanner = document.querySelector("#install-banner");
const installBannerCta = document.querySelector("#install-banner-cta");
const installBannerDismiss = document.querySelector("#install-banner-dismiss");
const installBannerDesc = document.querySelector("#install-banner-desc");
const iosInstallHint = document.querySelector("#ios-install-hint");
const iosInstallHintClose = document.querySelector("#ios-install-hint-close");

const FIXED_DOWNTIME = 30;
const SMOOTH_MODE_KEY = "dc-smooth-mode";
const INSTALL_DISMISSED_KEY = "dc-install-dismissed";
let selectedRuntime = 480;
let loadingTimer;
let deferredInstallPrompt = null;

const setSmoothMode = (enabled, { persist = true } = {}) => {
  document.body.classList.toggle("smooth-mode", enabled);
  if (smoothToggle) {
    smoothToggle.setAttribute("aria-checked", enabled.toString());
  }
  if (persist) {
    try {
      localStorage.setItem(SMOOTH_MODE_KEY, enabled ? "1" : "0");
    } catch (_error) {
      // localStorage may be unavailable (private mode); fail silently.
    }
  }
};

const initSmoothMode = () => {
  let stored = null;
  try {
    stored = localStorage.getItem(SMOOTH_MODE_KEY);
  } catch (_error) {
    stored = null;
  }
  setSmoothMode(stored === "1", { persist: false });
};

initSmoothMode();

if (smoothToggle) {
  smoothToggle.addEventListener("click", () => {
    const next = !document.body.classList.contains("smooth-mode");
    vibrate();
    setSmoothMode(next);
  });
}

const vibrate = (duration = 12) => {
  if ("vibrate" in navigator) {
    navigator.vibrate(duration);
  }
};

// ===== PWA install support =====
const isStandalone = () =>
  window.matchMedia?.("(display-mode: standalone)").matches ||
  window.navigator.standalone === true;

const isIosSafari = () => {
  const ua = window.navigator.userAgent || "";
  const isIos = /iPad|iPhone|iPod/.test(ua) && !window.MSStream;
  const isSafari = /^((?!chrome|crios|fxios|edgios|opios).)*safari/i.test(ua);
  return isIos && isSafari;
};

const showInstallBanner = (description) => {
  if (!installBanner) return;
  if (isStandalone()) return;
  let dismissed = null;
  try {
    dismissed = localStorage.getItem(INSTALL_DISMISSED_KEY);
  } catch (_error) {
    dismissed = null;
  }
  if (dismissed === "1") return;
  if (description && installBannerDesc) {
    installBannerDesc.textContent = description;
  }
  installBanner.dataset.state = "visible";
};

const hideInstallBanner = ({ persist = false } = {}) => {
  if (!installBanner) return;
  installBanner.dataset.state = "hidden";
  if (persist) {
    try {
      localStorage.setItem(INSTALL_DISMISSED_KEY, "1");
    } catch (_error) {
      // localStorage may be unavailable; fail silently.
    }
  }
};

const showIosInstallHint = () => {
  if (!iosInstallHint) return;
  iosInstallHint.dataset.state = "visible";
};

const hideIosInstallHint = () => {
  if (!iosInstallHint) return;
  iosInstallHint.dataset.state = "hidden";
};

window.addEventListener("beforeinstallprompt", (event) => {
  event.preventDefault();
  deferredInstallPrompt = event;
  showInstallBanner("Add it to your phone for one-tap access.");
});

window.addEventListener("appinstalled", () => {
  deferredInstallPrompt = null;
  if (installBanner && installBannerDesc) {
    installBannerDesc.textContent = "Installed — launch it from your home screen anytime.";
    installBanner.classList.add("is-success");
    if (installBannerCta) {
      installBannerCta.textContent = "Done";
    }
  }
  setTimeout(() => hideInstallBanner({ persist: true }), 2400);
});

if (installBannerCta) {
  installBannerCta.addEventListener("click", async () => {
    vibrate(18);
    if (deferredInstallPrompt) {
      const promptEvent = deferredInstallPrompt;
      deferredInstallPrompt = null;
      try {
        promptEvent.prompt();
        const { outcome } = await promptEvent.userChoice;
        if (outcome === "accepted") {
          hideInstallBanner({ persist: true });
        }
      } catch (_error) {
        // If the prompt fails for any reason, fall back to the iOS-style hint.
        showIosInstallHint();
      }
      return;
    }
    showIosInstallHint();
  });
}

if (installBannerDismiss) {
  installBannerDismiss.addEventListener("click", () => {
    hideInstallBanner({ persist: true });
  });
}

if (iosInstallHintClose) {
  iosInstallHintClose.addEventListener("click", hideIosInstallHint);
}

if (iosInstallHint) {
  document.addEventListener("click", (event) => {
    if (iosInstallHint.dataset.state !== "visible") return;
    if (
      event.target === iosInstallHint ||
      iosInstallHint.contains(event.target) ||
      event.target === installBannerCta
    ) {
      return;
    }
    hideIosInstallHint();
  });
}

if (isIosSafari() && !isStandalone()) {
  showInstallBanner("On iPhone? Tap Install for the Add to Home Screen steps.");
}

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker
      .register("service-worker.js")
      .catch((error) => {
        // Service worker registration is optional; surface in console only.
        console.warn("Service worker registration failed:", error);
      });
  });
}

const setError = (input, message) => {
  const group = input.closest(".field-group");
  const error = group.querySelector(".error-message");

  group.classList.toggle("has-error", Boolean(message));
  input.setAttribute("aria-invalid", Boolean(message).toString());
  error.textContent = message;
};

const getPositiveNumber = (input, label) => {
  const value = Number(input.value);

  if (!input.value.trim()) {
    return { value: 0, error: `${label} is required.` };
  }

  if (!Number.isFinite(value) || value <= 0) {
    return { value: 0, error: `${label} must be greater than 0.` };
  }

  return { value, error: "" };
};

const validateInputs = () => {
  const target = getPositiveNumber(targetInput, "Production target");
  const achievement = getPositiveNumber(achievementInput, "Production achievement");

  setError(targetInput, target.error);
  setError(achievementInput, achievement.error);

  return {
    valid: !target.error && !achievement.error,
    target: target.value,
    achievement: achievement.value,
  };
};

const calculateDowntime = (target, achievement, runtime) => {
  const productiveRuntime = (achievement / target) * runtime;
  return Math.max(FIXED_DOWNTIME, runtime - productiveRuntime + FIXED_DOWNTIME);
};

const setLoading = (isLoading) => {
  calculateButton.classList.toggle("is-loading", isLoading);
  calculateButton.setAttribute("aria-busy", isLoading.toString());
  buttonText.textContent = isLoading ? "Calculating..." : "Calculate Downtime";
};

runtimeButtons.forEach((button) => {
  button.addEventListener("click", () => {
    selectedRuntime = Number(button.dataset.runtime);
    vibrate();

    runtimeButtons.forEach((runtimeButton) => {
      const isSelected = runtimeButton === button;
      runtimeButton.classList.toggle("is-active", isSelected);
      runtimeButton.setAttribute("aria-checked", isSelected.toString());
    });
  });
});

[targetInput, achievementInput].forEach((input) => {
  input.addEventListener("input", () => {
    if (input.closest(".field-group").classList.contains("has-error")) {
      validateInputs();
    }
  });
});

calculateButton.addEventListener("click", () => {
  clearTimeout(loadingTimer);
  const inputs = validateInputs();
  vibrate(18);

  if (!inputs.valid) {
    resultCard.classList.add("is-empty");
    return;
  }

  setLoading(true);

  loadingTimer = setTimeout(() => {
    const downtime = calculateDowntime(inputs.target, inputs.achievement, selectedRuntime);
    const roundedDowntime = Math.round(downtime);

    resultNumber.textContent = roundedDowntime.toLocaleString();
    formulaText.textContent = `${selectedRuntime} - (${inputs.achievement.toLocaleString()}/${inputs.target.toLocaleString()} × ${selectedRuntime}) + ${FIXED_DOWNTIME}`;
    resultCard.classList.remove("is-empty");
    resultCard.classList.remove("has-result");
    resultCard.style.animation = "none";
    resultCard.offsetHeight;
    resultCard.style.animation = "";
    requestAnimationFrame(() => resultCard.classList.add("has-result"));
    setLoading(false);
  }, 420);
});
