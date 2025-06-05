module.exports = [
  "openai/gpt-4o-mini", // ➜ самый «человечный» выход, пробуем первым
  "anthropic/claude-3-haiku-20240307", // fallback #1
  "mistralai/mistral-7b-instruct", // fallback #2 (быстро и дёшево)
];
