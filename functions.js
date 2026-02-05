        // 🔹 Eigene Funktion für Bild-Zoom (muss global sein)
        window.toggleImageExpand = (el) => el.classList.toggle('expanded');

        // 🔹 Mermaid-Import (modernes ES-Modul)
        import mermaid from "https://cdn.jsdelivr.net/npm/mermaid@11/dist/mermaid.esm.min.mjs";
        mermaid.initialize({ startOnLoad: true, theme: "dark", securityLevel: 'loose' });

        document.addEventListener("DOMContentLoaded", () => {
            const sidebar = document.getElementById("sidebar");
            const sidebarToggle = document.getElementById("sidebarToggle");
            const body = document.body;
            const tocList = document.getElementById("toc-list");
            const toggleBtn = document.getElementById("toggleAll");

            // ==========================================
            // 1. SIDEBAR
            // ==========================================
            if (sidebarToggle) {
                sidebarToggle.addEventListener("click", () => {
                    sidebar.classList.toggle("sidebar-visible");
                    body.classList.toggle("sidebar-open");
                    sidebarToggle.textContent = sidebar.classList.contains("sidebar-visible") ? "✕" : "☰";
                });
            }

            // ==========================================
            // 2. EBENEN-FILTER (Checkboxen & Radio-Buttons)
            // ==========================================
            const lvlCheckboxes = document.querySelectorAll("#levelFilters input");
            const depthRadios = document.querySelectorAll("#depthFilters input");

            // Funktion zur Aktualisierung der Sichtbarkeit
            const updateVisibility = () => {
                lvlCheckboxes.forEach(cb => {
                    const targetLvl = cb.getAttribute("data-lvl");
                    document.querySelectorAll(`details.${targetLvl}`).forEach(el => {
                        el.style.display = cb.checked ? "block" : "none";
                    });
                });
            };

            // Logik für die Checkboxen (Einzelsteuerung)
            lvlCheckboxes.forEach(cb => {
                cb.addEventListener("change", updateVisibility);
            });

            // Logik für die Radio-Buttons (Hierarchische Steuerung)
            depthRadios.forEach(radio => {
                radio.addEventListener("change", () => {
                    const maxLvl = parseInt(radio.getAttribute("data-max"));

                    lvlCheckboxes.forEach(cb => {
                        const cbLvl = parseInt(cb.getAttribute("data-lvl").split("-")[1]);
                        // Alle Checkboxen bis maxLvl einschalten, den Rest aus
                        cb.checked = (cbLvl <= maxLvl);
                    });

                    updateVisibility();
                });
            });

            // ==========================================
            // 3. ALLE KAPITEL AUF-/ZUKLAPPEN
            // ==========================================
            if (toggleBtn) {
                toggleBtn.addEventListener("click", () => {
                    // Wir suchen alle Details, außer dem Inhaltsverzeichnis-Container
                    const allDetails = document.querySelectorAll("details:not(#Inhaltsverzeichnis)");
                    // Prüfen, ob aktuell mindestens eines offen ist
                    const anyOpen = Array.from(allDetails).some(d => d.open);

                    allDetails.forEach(d => {
                        d.open = !anyOpen; // Wenn eines offen ist -> alle zu. Wenn alle zu -> alle auf.
                    });
                });
            }

            // ==========================================
            // 4. INHALTSVERZEICHNIS GENERIEREN (Mit Badges)
            // ==========================================
            if (tocList) {
                tocList.innerHTML = ""; // Sicherstellen, dass die Liste leer ist
                // Wir nehmen H2 und H3 für das ToC
                const headings = document.querySelectorAll("h2, h3");

                headings.forEach(heading => {
                    // Ignoriere Überschriften, die IM Inhaltsverzeichnis oder in der Sidebar liegen
                    if (heading.closest("#toc") || heading.closest("#sidebar")) return;

                    // ID generieren falls nicht vorhanden
                    if (!heading.id) {
                        heading.id = heading.textContent.toLowerCase().replace(/[^\w]+/g, "-");
                    }

                    const parentDetails = heading.closest('details');
                    const lvlClass = parentDetails ? Array.from(parentDetails.classList).find(c => c.startsWith('lvl-')) : null;

                    const li = document.createElement("li");
                    li.className = heading.tagName.toLowerCase();

                    const a = document.createElement("a");
                    a.href = `#${heading.id}`;

                    // Badge hinzufügen (nur wenn eine lvl-Klasse gefunden wurde)
                    if (lvlClass) {
                        const badge = document.createElement("span");
                        badge.className = `lvl-badge ${lvlClass}`;
                        badge.textContent = "L" + lvlClass.split("-")[1];
                        a.appendChild(badge);
                    }

                    const textNode = document.createTextNode(heading.textContent);
                    a.appendChild(textNode);

                    li.appendChild(a);
                    tocList.appendChild(li);
                });
            }

            // ==========================================
            // 5. NAVIGATION & AUTO-OPEN (Anchor Links)
            // ==========================================
            const openTargetDetails = (hash) => {
                if (!hash) return;
                const target = document.querySelector(hash);
                if (target) {
                    let parent = target.closest('details');
                    while (parent) {
                        parent.open = true;
                        parent = parent.parentElement.closest('details');
                    }
                    setTimeout(() => {
                        target.scrollIntoView({ behavior: "smooth", block: "start" });
                    }, 100);
                }
            };

            document.addEventListener("click", (e) => {
                const link = e.target.closest("a");
                if (link && link.getAttribute("href")?.startsWith("#")) {
                    openTargetDetails(link.hash);
                }
            });

            if (window.location.hash) openTargetDetails(window.location.hash);

            // ==========================================
            // 6. CODE-REFERENZEN (Highlights)
            // ==========================================
            const refs = document.querySelectorAll(".code-ref");
            const layers = new Map();

            // Hilfsfunktion: Bereitet den Highlight-Layer für ein PRE-Element vor
            function getContext(pre) {
                if (layers.has(pre)) return layers.get(pre);

                const rows = pre.querySelector(".line-numbers-rows");
                if (!rows) return null;

                let layer = pre.querySelector(".code-highlight-layer");
                if (!layer) {
                    layer = document.createElement("div");
                    layer.className = "code-highlight-layer";
                    pre.appendChild(layer);
                }

                const ctx = { pre, rows, layer };
                layers.set(pre, ctx);

                updateOffsets(ctx);

                return ctx;
            }

            refs.forEach(ref => {
                const pre = document.getElementById(ref.dataset.target);
                if (!pre) return;

                ref.addEventListener("mouseenter", () => {
                    if (ref.dataset.attr) highlightAttribute(pre, ref.dataset.attr);
                    // Hier könnte man noch Zeilen-Highlights ergänzen falls nötig
                    if (ref.dataset.line) {
                        const ctx = getContext(pre);
                        if (ctx) highlightLines(ctx, ref.dataset.line);
                    }
                });

                ref.addEventListener("mouseleave", () => {
                    // Inline-Highlights entfernen
                    pre.querySelectorAll(".code-inline-highlight").forEach(el => el.remove());

                    // Zeilen-Highlights entfernen
                    const ctx = getContext(pre);
                    if (ctx) {
                        ctx.layer.innerHTML = "";
                    }
                });
            });
        });

        // Hilfsfunktion: Highlightet ein Attribut im Code
        function highlightAttribute(pre, attrName) {
            const code = pre.querySelector("code");
            const tokens = code.querySelectorAll(".token.attr-name");
            pre.querySelectorAll(".code-inline-highlight").forEach(el => el.remove());

            tokens.forEach(token => {
                if (token.textContent !== attrName) return;
                const rect = token.getBoundingClientRect();
                const preRect = pre.getBoundingClientRect();

                const div = document.createElement("div");
                div.className = "code-inline-highlight";
                div.style.left = `${rect.left - preRect.left - 10}px`;
                div.style.top = `${rect.top - preRect.top}px`;
                div.style.width = `${rect.width}px`;
                div.style.height = `${rect.height}px`;
                pre.appendChild(div);
            });
        }

        // Hilfsfunktion: Highlightet Zeilen (z.B. "1" oder "1-3")
        function highlightLines(ctx, range) {
            ctx.layer.innerHTML = "";
            if (!range) return;

            const rowsRect = ctx.rows.getBoundingClientRect();
            const preRect = ctx.pre.getBoundingClientRect();

            const baseOffset = rowsRect.top - preRect.top - 20;   // 🔥 wichtig

            const lines = range.split(",").flatMap(r => {
                if (r.includes("-")) {
                    const [start, end] = r.split("-").map(Number);
                    return Array.from({ length: end - start + 1 }, (_, i) => start + i);
                }
                return [Number(r)];
            });

            lines.forEach(line => {
                const lineEl = ctx.rows.children[line - 1];
                if (!lineEl) return;

                const div = document.createElement("div");
                div.className = "code-highlight";

                div.style.top = `${baseOffset + lineEl.offsetTop}px`;   // 🔥 FIX
                div.style.height = `${lineEl.offsetHeight}px`;

                ctx.layer.appendChild(div);
            });
        }

        function updateOffsets(ctx) {
            const firstLine = ctx.rows.querySelector("span");
            if (!firstLine) return;

            const preRect = ctx.pre.getBoundingClientRect();
            const lineRect = firstLine.getBoundingClientRect();

            const top = lineRect.top - preRect.top;
            const left = lineRect.left - preRect.left;

            ctx.layer.style.top = `${top}px`;
            ctx.layer.style.left = `${left}px`;
            ctx.layer.style.right = "0";
        }

        Prism.hooks.add('complete', function (env) {
            if (env.element.parentElement.classList.contains('language-treeview')) {
                // Wir arbeiten direkt am HTML-String, um die Textknoten zu modifizieren
                let html = env.element.innerHTML;

                // REGEX Erklärung:
                // ' : sucht ein öffnendes Anführungszeichen
                // ([^']+) : fängt alles ein, was KEIN Anführungszeichen ist (der Name)
                // ' : sucht das schließende Anführungszeichen
                const regex = /'([^']+)'/g;

                // Ersetzung: 'bezeichner' wird zu <a href="#bezeichner">bezeichner</a>
                // Die Anführungszeichen werden hier im Link beibehalten (können im Template gelöscht werden)
                const newHtml = html.replace(regex, function (match, name) {
                    return `<a href="#${name}">${name}</a>`;
                });

                env.element.innerHTML = newHtml;
            }
        });