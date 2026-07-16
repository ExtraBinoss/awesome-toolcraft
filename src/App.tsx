import { useMemo, useState } from "react";

import { tools } from "./tools";

export function App() {
  const [query, setQuery] = useState("");
  const results = useMemo(() => {
    const normalized = query.trim().toLocaleLowerCase("fr");
    if (!normalized) return tools;
    return tools.filter((tool) =>
      [tool.name, tool.category].some((value) =>
        value.toLocaleLowerCase("fr").includes(normalized),
      ),
    );
  }, [query]);

  return (
    <div className="app-shell">
      <header className="topbar">
        <a className="brand" href="/" aria-label="Toolcraft Hub home">
          <span className="brand-mark" aria-hidden="true">◆</span>
          <span>Toolcraft <strong>Hub</strong></span>
        </a>
          <span className="tool-count">{tools.length} tool{tools.length !== 1 ? "s" : ""}</span>
      </header>

      <main>
        <section className="catalog" aria-labelledby="catalog-title">
          <div className="catalog-heading">
            <div>
              <span className="section-kicker">Toolcraft Hub</span>
              <h1 id="catalog-title">Your tools</h1>
            </div>
            <label className="search">
              <span aria-hidden="true">⌕</span>
              <span className="sr-only">Search tools</span>
              <input
                type="search"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search tools…"
              />
            </label>
          </div>

          <div className="tool-grid">
            {results.map((tool) => (
              <article className="tool-card" key={tool.slug}>
                <a className="card-link" href={tool.href} aria-label={`Open ${tool.name}`}>
                  <div className="card-media">
                    <img
                      src={tool.image}
                      alt=""
                      loading="lazy"
                      onError={(event) => { event.currentTarget.style.display = "none"; }}
                    />
                    <span className="status">{tool.status}</span>
                    <span className="open-icon" aria-hidden="true">↗</span>
                  </div>
                  <div className="card-content">
                    <span className="category">{tool.category}</span>
                    <h3>{tool.name}</h3>
                  </div>
                </a>
              </article>
            ))}

            <article className="tool-card add-card">
              <div className="add-inner">
                <span className="add-icon" aria-hidden="true">＋</span>
                <h3>Next tool</h3>
                <p>Add its folder under <code>tools/</code>, then register it in <code>src/tools.ts</code>.</p>
              </div>
            </article>
          </div>

          {results.length === 0 && <p className="empty">No tools match your search.</p>}
        </section>
      </main>
    </div>
  );
}
