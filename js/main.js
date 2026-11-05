(function () {
  var LO = 180, HI = 310;

  function clamp(v) { v = parseInt(v, 10); if (isNaN(v)) return 0; return Math.max(0, Math.min(100, v)); }
  function pct(v) { return Math.max(0, Math.min(100, (v - LO) / (HI - LO) * 100)); }
  function el(tag, cls, text) { var e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; }

  /* Карточки направлений */
  var list = document.getElementById("dirlist");
  DIRS.forEach(function (d) {
    var card = el("article", "dir"); 
    card.dataset.tags = d.tags.join(" ");
    var top = el("div", "dir-top");
    top.appendChild(el("span", "dir-code", d.code));
    top.appendChild(el("span", d.paidOnly ? "pill paid" : "pill", d.paidOnly ? "только платно" : d.places + " бюджетных мест"));
    card.appendChild(top);
    card.appendChild(el("h3", null, d.name));
    var ul = el("ul");
    d.profiles.forEach(function (p) { ul.appendChild(el("li", null, p)); });
    card.appendChild(ul);
    var st = el("div", "dir-stats");
    function stat(big, small) { var s = el("div", "stat"); s.appendChild(el("b", null, big)); s.appendChild(el("span", null, small)); st.appendChild(s); }
    if (d.paidOnly) {
      stat("39", "мин. по математике");
      stat("41/42", "физика или информатика");
      stat("50", "мин. по русскому");
    } else {
      stat(d.p2026 != null ? String(d.p2026) : "—", "проходной на бюджет 2026");
      stat(d.p2025 != null ? String(d.p2025) : "—", d.p2025 != null ? "проходной на бюджет 2025" : "в 2025 бюджета не было");
      stat(d.competition ? d.competition : d.avg, d.competition ? "заявления на место в 2026" : "средний балл ЕГЭ в 2025");
    }
    card.appendChild(st);
    list.appendChild(card);
  });

  /* Фильтр интересов */
  var buttons = document.querySelectorAll(".filters button");
  buttons.forEach(function (b) {
    b.addEventListener("click", function () {
      var f = b.dataset.f;
      buttons.forEach(function (x) { x.setAttribute("aria-pressed", x === b ? "true" : "false"); });
      document.querySelectorAll(".dir").forEach(function (c) {
        var on = f === "all" || c.dataset.tags.split(" ").indexOf(f) !== -1;
        c.hidden = !on;
      });
    });
  });

  /* Калькулятор */
  var ids = ["math", "inf", "rus"];
  var res = document.getElementById("results");
  var rows = {};
  DIRS.forEach(function (d) {
    var row = el("div", "res-row");
    var nm = el("div", "res-name");
    nm.appendChild(el("code", null, d.code));
    nm.appendChild(el("span", null, d.short));
    row.appendChild(nm);
    var sc = el("div", "scale");
    sc.appendChild(el("div", "track"));
    var fill = el("div", "fill");
    sc.appendChild(fill);
    var pass = null;
    var ref = d.p2026 != null ? d.p2026 : d.p2025;
    if (ref != null) {
      pass = el("div", "pass");
      pass.style.left = pct(ref) + "%";
      var lab = el("span", null, ref + (d.p2026 != null ? " · 2026" : " · 2025"));
      pass.appendChild(lab);
      sc.appendChild(pass);
    }
    sc.setAttribute("aria-hidden", "true");
    row.appendChild(sc);
    var chip = el("span", "chip");
    row.appendChild(chip);
    res.appendChild(row);
    rows[d.code] = { fill: fill, chip: chip, ref: ref, d: d };
  });

  function save(state) { try { localStorage.setItem("fktipm-calc", JSON.stringify(state)); } catch (e) {} }
  function load() { try { return JSON.parse(localStorage.getItem("fktipm-calc") || "null"); } catch (e) { return null; } }

  function update(flash) {
    var s = {};
    var ege = 0;
    ids.forEach(function (id) {
      var v = clamp(document.getElementById(id).value);
      s[id] = v; ege += v;
      document.getElementById(id).classList.toggle("below", v < MINS[id]);
    });
    var ach = 0, checks = [];
    document.querySelectorAll(".ach input").forEach(function (c) { if (c.checked) ach += +c.dataset.pts; checks.push(c.checked); });
    var achUsed = Math.min(10, ach);
    var total = ege + achUsed;
    document.getElementById("total").textContent = total;
    document.getElementById("breakdown").textContent = "ЕГЭ " + ege + " + достижения " + achUsed + (ach > 10 ? " (засчитано 10 из " + ach + ")" : "");

    var failed = ids.filter(function (id) { return s[id] < MINS[id]; });
    var failedNames = { math: "математике", inf: "информатике", rus: "русскому" };

    Object.keys(rows).forEach(function (code) {
      var r = rows[code], d = r.d, text, cls;
      r.fill.style.width = pct(total) + "%";
      if (d.paidOnly) {
        var paidFail = s.math < 39 || s.rus < 50 || s.inf < 42;
        text = paidFail ? "ниже минимума" : "платно: минимум есть";
        cls = paidFail ? "bad" : "info";
      } else if (failed.length) {
        text = "ниже минимума по " + failed.map(function (f) { return failedNames[f]; }).join(", ");
        cls = "bad";
      } else {
        var diff = total - r.ref;
        if (diff >= 10) { text = "с запасом +" + diff; cls = "good"; }
        else if (diff >= 0) { text = "впритык +" + diff; cls = "warn"; }
        else { text = "не хватает " + (-diff); cls = "bad"; }
      }
      if (r.chip.textContent !== text) {
        r.chip.textContent = text;
        r.chip.className = "chip " + cls;
        if (flash) { r.chip.classList.remove("flash"); void r.chip.offsetWidth; r.chip.classList.add("flash"); }
      }
    });
    save({ s: s, c: checks });
  }

  var saved = load();
  if (saved && saved.s) {
    ids.forEach(function (id) { if (saved.s[id] != null) { document.getElementById(id).value = saved.s[id]; document.getElementById(id + "-r").value = saved.s[id]; } });
    if (saved.c) document.querySelectorAll(".ach input").forEach(function (c, i) { if (typeof saved.c[i] === "boolean") c.checked = saved.c[i]; });
  }

  ids.forEach(function (id) {
    var num = document.getElementById(id), rng = document.getElementById(id + "-r");
    num.addEventListener("input", function () { rng.value = clamp(num.value); update(true); });
    num.addEventListener("blur", function () { num.value = clamp(num.value); update(false); });
    rng.addEventListener("input", function () { num.value = rng.value; update(true); });
  });
  document.querySelectorAll(".ach input").forEach(function (c) { c.addEventListener("change", function () { update(true); }); });
  document.getElementById("calc").addEventListener("submit", function (e) { e.preventDefault(); });
  update(false);

  /* Копирование запроса */
  var copyBtn = document.getElementById("copy"), msg = document.getElementById("copy-msg");
  copyBtn.addEventListener("click", function () {
    var text = document.getElementById("prompt-text").textContent;
    var done = function () { msg.textContent = "Скопировано — вставьте в GigaChat или Алису."; };
    var fail = function () { msg.textContent = "Не получилось скопировать: выделите текст вручную."; };
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(text).then(done, fail);
      else fail();
    } catch (e) { fail(); }
  });
})();
