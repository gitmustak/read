const $ = (id) => document.getElementById(id);
const statusEl = $("status");

function setStatus(msg, isErr = false) {
  statusEl.textContent = msg;
  statusEl.className = isErr ? "err" : "";
}

async function translate(text, from) {
  const url =
    "https://translate.googleapis.com/translate_a/single?client=gtx&dt=t" +
    `&sl=${from}&tl=en`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ q: text }),
  });
  if (!res.ok) throw new Error(`Translation failed (${res.status})`);
  const data = await res.json();
  return data[0].map((part) => part[0]).join("");
}

async function activeTab() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  return tab;
}

async function send(tabId, msg) {
  await chrome.scripting.executeScript({ target: { tabId }, files: ["content.js"] });
  return chrome.tabs.sendMessage(tabId, msg);
}

async function run() {
  try {
    const tab = await activeTab();
    const sel = await send(tab.id, { type: "getSelection" });
    if (!sel || !sel.text) return setStatus("No text selected on the page.", true);
    setStatus("Translating…");
    const out = await translate(sel.text, $("lang").value);
    await send(tab.id, { type: "replace", text: out });
    window.close();
  } catch (e) {
    setStatus(e.message || String(e), true);
  }
}

$("lang").value = localStorage.getItem("lang") || "bn";
$("lang").addEventListener("change", () => localStorage.setItem("lang", $("lang").value));
$("go").addEventListener("click", run);
$("undo").addEventListener("click", async () => {
  try {
    const tab = await activeTab();
    await send(tab.id, { type: "restore" });
    setStatus("Restored.");
  } catch (e) {
    setStatus(e.message || String(e), true);
  }
});

// Translate right away when the popup opens, if something is selected.
run();
