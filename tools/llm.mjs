// Провайдер-агностичный LLM-вызов: DeepSeek (если есть ключ) или Anthropic.
// chat(system, user, maxTokens?) -> string
export async function chat(system, user, maxTokens = 2500) {
  const DEEPSEEK = process.env.DEEPSEEK_API_KEY;
  const ANTHROPIC = process.env.ANTHROPIC_API_KEY;

  if (DEEPSEEK) {
    const model = process.env.DEEPSEEK_MODEL || "deepseek-chat";
    const r = await fetch("https://api.deepseek.com/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${DEEPSEEK}`, "content-type": "application/json" },
      body: JSON.stringify({
        model,
        max_tokens: maxTokens,
        temperature: 1.0,
        messages: [{ role: "system", content: system }, { role: "user", content: user }],
      }),
    });
    const j = await r.json();
    if (j?.error) throw new Error("DeepSeek: " + JSON.stringify(j.error).slice(0, 200));
    return j?.choices?.[0]?.message?.content || "";
  }

  if (ANTHROPIC) {
    const model = process.env.LLM_MODEL_SMART || "claude-sonnet-4-6";
    const r = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "x-api-key": ANTHROPIC, "anthropic-version": "2023-06-01", "content-type": "application/json" },
      body: JSON.stringify({ model, max_tokens: maxTokens, system, messages: [{ role: "user", content: user }] }),
    });
    const j = await r.json();
    if (j?.error) throw new Error("Anthropic: " + JSON.stringify(j.error).slice(0, 200));
    return j?.content?.[0]?.text || "";
  }

  throw new Error("нет DEEPSEEK_API_KEY или ANTHROPIC_API_KEY");
}
