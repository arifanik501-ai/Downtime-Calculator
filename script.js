const targetInput = document.querySelector("#target");
const achievementInput = document.querySelector("#achievement");
const calculateButton = document.querySelector("#calculate");
const buttonText = calculateButton.querySelector(".button-text");
const runtimeButtons = Array.from(document.querySelectorAll(".runtime-pill"));
const resultCard = document.querySelector("#result-card");
const resultNumber = document.querySelector("#result-number");
const formulaText = document.querySelector("#formula");

const FIXED_DOWNTIME = 30;
let selectedRuntime = 480;
let loadingTimer;

const vibrate = (duration = 12) => {
  if ("vibrate" in navigator) {
    navigator.vibrate(duration);
  }
};

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
    resultCard.style.animation = "none";
    resultCard.offsetHeight;
    resultCard.style.animation = "";
    setLoading(false);
  }, 420);
});
