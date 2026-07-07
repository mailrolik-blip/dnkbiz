'use client';

import { useState } from 'react';

type VisualResult = {
  job_id: string;
  brand_key: string;
  recipe_key: string;
  output_url: string;
  output_path: string;
  ai_usage: { attempted: number; successful: number; failed: number };
  estimated_provider_cost: number;
  warnings: string[];
};

const brands = [
  { key: 'monopoly', label: 'Monopoly' },
  { key: 'monopoly_pay', label: 'Monopoly Pay' },
  { key: 'casper', label: 'Casper' },
  { key: 'gorilla_hockey', label: 'Gorilla Hockey' },
];

export default function VisualAdminClient() {
  const [brand, setBrand] = useState('monopoly');
  const [prompt, setPrompt] = useState('история знакомства');
  const [pending, setPending] = useState(false);
  const [result, setResult] = useState<VisualResult | null>(null);
  const [error, setError] = useState('');

  async function generate(action?: string) {
    setPending(true);
    setError('');
    try {
      const response = await fetch('/api/admin/visual/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          brand_key: brand,
          command_text: prompt,
          explicit_paid_action: action === 'new_ai_variant',
          paid_action: action === 'new_ai_variant' ? { requires_ai_call: true, estimated_calls: 1, explicit_paid_action: true, action_key: 'admin_new_ai_variant' } : undefined,
        }),
      });
      const body = await response.json();
      if (!response.ok || !body.ok) throw new Error(body.error?.message || 'Visual generation failed');
      setResult(body.result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Visual generation failed');
    } finally {
      setPending(false);
    }
  }

  async function track(action: string) {
    if (!result) return;
    await fetch('/api/admin/visual/action', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ job_id: result.job_id, action }),
    });
  }

  return (
    <section className="admin-section">
      <div className="admin-section__header">
        <div>
          <p className="admin-section__eyebrow">DNK Visual Recipe Engine</p>
          <h1>Visual production</h1>
        </div>
        <a className="admin-link" href="/admin">Админка</a>
      </div>

      <div className="admin-grid">
        <div className="admin-panel">
          <label className="admin-label" htmlFor="visual-brand">Brand</label>
          <select id="visual-brand" value={brand} onChange={(event) => setBrand(event.target.value)} className="admin-input">
            {brands.map((item) => <option key={item.key} value={item.key}>{item.label}</option>)}
          </select>

          <label className="admin-label" htmlFor="visual-prompt">Prompt</label>
          <textarea id="visual-prompt" value={prompt} onChange={(event) => setPrompt(event.target.value)} className="admin-textarea" rows={6} />

          <div className="admin-actions">
            <button className="admin-button" type="button" disabled={pending} onClick={() => generate()}>{pending ? 'Generating...' : 'Generate'}</button>
            <button className="admin-button secondary" type="button" disabled={pending || !result} onClick={() => generate('new_ai_variant')}>New AI variant</button>
          </div>
          <div className="admin-actions">
            <button className="admin-button secondary" type="button" disabled={!result} onClick={() => track('accepted')}>Accepted</button>
            <button className="admin-button secondary" type="button" disabled={!result} onClick={() => track('needs_local_revision')}>Needs local revision</button>
          </div>
          {error ? <p className="admin-error">{error}</p> : null}
        </div>

        <div className="admin-panel">
          {result ? (
            <>
              <img src={result.output_url} alt="" className="admin-visual-preview" />
              <dl className="admin-kv">
                <div><dt>Job</dt><dd>{result.job_id}</dd></div>
                <div><dt>Recipe</dt><dd>{result.recipe_key}</dd></div>
                <div><dt>AI calls</dt><dd>{result.ai_usage.attempted}</dd></div>
                <div><dt>Cost</dt><dd>{result.estimated_provider_cost.toFixed(4)}</dd></div>
              </dl>
              <div className="admin-actions">
                <a className="admin-button secondary" href={result.output_url} target="_blank">PNG original</a>
              </div>
            </>
          ) : (
            <p className="admin-muted">No active visual job.</p>
          )}
        </div>
      </div>
    </section>
  );
}
