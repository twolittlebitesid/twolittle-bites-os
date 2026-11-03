import { useState, type FormEvent } from 'react';
import {
  formatIDR,
  formatNumber,
  scaleRecipe,
  type ScaledRecipeResult,
  type ScalingMode
} from '../domain/calculators';
import { hasPermission } from '../domain/navigation';
import type {
  AppPreviewState,
  MaterialRecord,
  ProductRecord,
  ProductionPlanRecord
} from '../state/previewData';
import { StatusPill } from '../components/Charts';

export function ProductsPage({
  state,
  initialTab,
  onAddProduct,
  onAddMaterial,
  onToast
}: {
  state: AppPreviewState;
  initialTab?: 'overview' | 'products' | 'materials' | 'recipes' | 'calculator';
  onAddProduct: (product: ProductRecord) => void;
  onAddMaterial: (material: MaterialRecord) => void;
  onToast: (title: string, message: string, type?: 'info' | 'success' | 'error') => void;
}) {
  const [tab, setTab] = useState<'overview' | 'products' | 'materials' | 'recipes' | 'calculator'>(
    initialTab ?? 'overview'
  );
  const [selectedRecipeId, setSelectedRecipeId] = useState(
    state.recipes[0]?.recipeId ?? 'RCP-000001'
  );
  const [targetQty, setTargetQty] = useState('25');
  const [modeOverride, setModeOverride] = useState<'' | ScalingMode>('');
  const [calcResult, setCalcResult] = useState<ScaledRecipeResult | null>(null);

  const [showProductModal, setShowProductModal] = useState(false);
  const [prodName, setProdName] = useState('');
  const [prodSku, setProdSku] = useState('');
  const [prodCategory, setProdCategory] = useState('Tiramisu Series');
  const [prodPrice, setProdPrice] = useState('125000');
  const [prodCogs, setProdCogs] = useState('48000');

  const [showMaterialModal, setShowMaterialModal] = useState(false);
  const [matType, setMatType] = useState<'INGREDIENT' | 'PACKAGING'>('INGREDIENT');
  const [matName, setMatName] = useState('');
  const [matPurchaseUnit, setMatPurchaseUnit] = useState('Pack 1kg');
  const [matBaseUnit, setMatBaseUnit] = useState<'g' | 'ml' | 'pcs'>('g');
  const [matConv, setMatConv] = useState('1000');
  const [matPrice, setMatPrice] = useState('150000');

  const canWriteProduct = hasPermission(state.role, 'PRODUCT_WRITE');
  const canSeeMargin = state.role !== 'PRODUCTION' && state.role !== 'MARKETING';

  const ingredients = state.materials.filter(m => m.itemType === 'INGREDIENT');
  const packaging = state.materials.filter(m => m.itemType === 'PACKAGING');

  function handleCalculate(e: FormEvent) {
    e.preventDefault();
    const recipe = state.recipes.find(r => r.recipeId === selectedRecipeId);
    if (!recipe) return;
    const qty = Number(targetQty);
    if (!Number.isFinite(qty) || qty <= 0) {
      onToast('Input tidak valid', 'Target produksi harus lebih besar dari 0.', 'error');
      return;
    }
    const mode: ScalingMode = modeOverride || recipe.defaultScalingMode;
    try {
      const res = scaleRecipe(recipe.baseYield, qty, mode, recipe.items);
      setCalcResult(res);
      onToast(
        'Kalkulasi Resep Selesai',
        `${recipe.productName} dihitung dengan mode ${mode} (${res.multiplier.toFixed(2)}×).`,
        'success'
      );
    } catch (err) {
      onToast('Gagal menghitung', (err as Error).message, 'error');
    }
  }

  function handleCreateProduct(e: FormEvent) {
    e.preventDefault();
    if (!prodName.trim() || !prodSku.trim()) return;
    onAddProduct({
      productId: `PRD-00000${state.products.length + 1}`,
      name: prodName.trim(),
      sku: prodSku.trim().toUpperCase(),
      category: prodCategory.trim(),
      sellingPrice: Number(prodPrice) || 100000,
      unitCogs: Number(prodCogs) || 40000,
      status: 'ACTIVE',
      activeRecipeId: 'RCP-000001',
      variants: []
    });
    setProdName('');
    setProdSku('');
    setShowProductModal(false);
    onToast('Produk ditambahkan', `${prodName} masuk ke katalog aktif.`, 'success');
  }

  function handleCreateMaterial(e: FormEvent) {
    e.preventDefault();
    if (!matName.trim()) return;
    const conv = Number(matConv) || 1;
    const price = Number(matPrice) || 0;
    onAddMaterial({
      itemId: `${matType === 'INGREDIENT' ? 'ING' : 'PKG'}-00000${state.materials.length + 1}`,
      itemType: matType,
      name: matName.trim(),
      purchaseUnit: matPurchaseUnit.trim(),
      baseUnit: matBaseUnit,
      conversionFactor: conv,
      purchasePrice: price,
      avgCostBase: Math.round(price / conv),
      currentStockBase: conv,
      minStockBase: Math.round(conv * 0.25),
      defaultSupplierId: 'SUP-000001'
    });
    setMatName('');
    setShowMaterialModal(false);
    onToast('Material ditambahkan', `${matName} berhasil dibuat di Material Master.`, 'success');
  }

  const activeRecipeForCalc = state.recipes.find(r => r.recipeId === selectedRecipeId);

  return (
    <section className="page product-page route-motion-enter">
      <div className="module-banner">
        <div className="module-icon">
          <span className="material-symbols-outlined">bakery_dining</span>
        </div>
        <div className="module-copy">
          <h2>Products &amp; Recipes</h2>
          <p>
            Manage sellable products, material cost, recipe/BOM versions, base yield, automatic
            scaling, and unit COGS from one operational workspace.
          </p>
        </div>
      </div>

      <div className="product-toolbar">
        <div className="product-tabs" role="tablist" aria-label="Products module tabs">
          {(
            [
              ['overview', 'Overview'],
              ['products', 'Products'],
              ['materials', 'Materials'],
              ['recipes', 'Recipes / BOM'],
              ['calculator', 'Recipe Calculator']
            ] as const
          ).map(([key, label]) => (
            <button
              key={key}
              type="button"
              className={`product-tab ${tab === key ? 'active' : ''}`}
              onClick={() => setTab(key)}
            >
              {label}
            </button>
          ))}
        </div>
        <button
          type="button"
          className="secondary-btn"
          onClick={() =>
            onToast('Products & Recipes disegarkan', 'Katalog dan BOM versi terbaru dimuat.', 'info')
          }
        >
          <span className="material-symbols-outlined">refresh</span> Refresh
        </button>
      </div>

      {tab === 'overview' && (
        <section className="product-panel">
          <div className="grid grid-4">
            <article className="card">
              <div className="card-label">Products</div>
              <div className="card-value">{state.products.length}</div>
              <div className="card-help">Sellable product master</div>
            </article>
            <article className="card">
              <div className="card-label">Ingredients</div>
              <div className="card-value">{ingredients.length}</div>
              <div className="card-help">Recipe raw materials</div>
            </article>
            <article className="card">
              <div className="card-label">Packaging</div>
              <div className="card-value">{packaging.length}</div>
              <div className="card-help">Packaging BOM items</div>
            </article>
            <article className="card pink">
              <div className="card-label">Active Recipes</div>
              <div className="card-value">
                {state.recipes.filter(r => r.status === 'ACTIVE').length}
              </div>
              <div className="card-help">Activated BOM versions</div>
            </article>
          </div>

          <div className="grid grid-2">
            <article className="card cream">
              <div className="page-eyebrow">Start here</div>
              <h3 className="section-title" style={{ marginTop: 6 }}>
                Build the costing chain
              </h3>
              <ol className="phase-steps">
                <li>
                  <strong>1.</strong> Create Ingredients &amp; Packaging with purchase conversion and
                  price.
                </li>
                <li>
                  <strong>2.</strong> Create Product / optional Variant.
                </li>
                <li>
                  <strong>3.</strong> Build Recipe/BOM with a Base Yield.
                </li>
                <li>
                  <strong>4.</strong> Activate the recipe to update Product COGS &amp; Margin.
                </li>
                <li>
                  <strong>5.</strong> Use Recipe Calculator for any production target.
                </li>
              </ol>
            </article>

            <article className="card">
              <div className="page-eyebrow">Recipe scaling</div>
              <h3 className="section-title" style={{ marginTop: 6 }}>
                Exact or Full Batch
              </h3>
              <p className="page-subtitle">
                <strong>EXACT</strong> allows fractional scaling (10 → 25 = 2.5×).{' '}
                <strong>FULL_BATCH</strong> rounds upward to whole batches and shows expected
                surplus.
              </p>
              <button
                type="button"
                className="primary-btn"
                style={{ marginTop: 18 }}
                onClick={() => setTab('calculator')}
              >
                <span className="material-symbols-outlined">calculate</span> Open Calculator
              </button>
            </article>
          </div>
        </section>
      )}

      {tab === 'products' && (
        <section className="product-panel">
          <div className="section-head">
            <div>
              <div className="page-eyebrow">Product Master</div>
              <h3 className="section-title">Products &amp; Variants</h3>
              <p className="section-copy">
                Selling price is snapshotted when Orders are created. Current COGS comes from the
                activated base recipe.
              </p>
            </div>
            {canWriteProduct && (
              <div className="inline-actions">
                <button
                  type="button"
                  className="primary-btn"
                  onClick={() => setShowProductModal(true)}
                >
                  <span className="material-symbols-outlined">add</span> Product
                </button>
              </div>
            )}
          </div>
          <div className="table-shell">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Product</th>
                  <th>SKU</th>
                  <th>Category</th>
                  <th className="num">Selling Price</th>
                  {canSeeMargin && <th className="num">COGS</th>}
                  {canSeeMargin && <th className="num">Margin</th>}
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {state.products.map(p => {
                  const marginPct =
                    p.sellingPrice > 0
                      ? Math.round(((p.sellingPrice - p.unitCogs) / p.sellingPrice) * 100)
                      : 0;
                  return (
                    <tr key={p.productId}>
                      <td>
                        <strong>{p.name}</strong>
                        {p.variants.length > 0 && (
                          <div>
                            <small>{p.variants.map(v => v.name).join(' · ')}</small>
                          </div>
                        )}
                      </td>
                      <td>{p.sku}</td>
                      <td>{p.category}</td>
                      <td className="num">{formatIDR(p.sellingPrice)}</td>
                      {canSeeMargin && <td className="num">{formatIDR(p.unitCogs)}</td>}
                      {canSeeMargin && <td className="num">{marginPct}%</td>}
                      <td>
                        <StatusPill status={p.status} />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {tab === 'materials' && (
        <section className="product-panel">
          <div className="section-head">
            <div>
              <div className="page-eyebrow">Material Master</div>
              <h3 className="section-title">Ingredients &amp; Packaging</h3>
              <p className="section-copy">
                Purchase units are normalized into base units so recipe aggregation stays
                consistent.
              </p>
            </div>
            {canWriteProduct && (
              <button
                type="button"
                className="primary-btn"
                onClick={() => setShowMaterialModal(true)}
              >
                <span className="material-symbols-outlined">add</span> Material
              </button>
            )}
          </div>

          <div className="grid grid-2">
            <article className="card">
              <div className="section-head">
                <div>
                  <div className="page-eyebrow">Ingredients</div>
                  <h4 className="mini-title">Raw materials</h4>
                </div>
                <span className="status-pill neutral">{ingredients.length}</span>
              </div>
              <div className="system-diagnostic-list">
                {ingredients.map(m => (
                  <div key={m.itemId} className="experience-list-row">
                    <div>
                      <strong>
                        {m.name} ({m.itemId})
                      </strong>
                      <span>
                        {m.purchaseUnit} = {formatNumber(m.conversionFactor)} {m.baseUnit} · Stok:{' '}
                        {formatNumber(m.currentStockBase)} {m.baseUnit}
                      </span>
                    </div>
                    {canSeeMargin && (
                      <strong>
                        {formatIDR(m.avgCostBase)}/{m.baseUnit}
                      </strong>
                    )}
                  </div>
                ))}
              </div>
            </article>

            <article className="card">
              <div className="section-head">
                <div>
                  <div className="page-eyebrow">Packaging</div>
                  <h4 className="mini-title">Packaging BOM</h4>
                </div>
                <span className="status-pill neutral">{packaging.length}</span>
              </div>
              <div className="system-diagnostic-list">
                {packaging.map(m => (
                  <div key={m.itemId} className="experience-list-row">
                    <div>
                      <strong>
                        {m.name} ({m.itemId})
                      </strong>
                      <span>
                        {m.purchaseUnit} = {formatNumber(m.conversionFactor)} {m.baseUnit} · Stok:{' '}
                        {formatNumber(m.currentStockBase)} {m.baseUnit}
                      </span>
                    </div>
                    {canSeeMargin && (
                      <strong>
                        {formatIDR(m.avgCostBase)}/{m.baseUnit}
                      </strong>
                    )}
                  </div>
                ))}
              </div>
            </article>
          </div>
        </section>
      )}

      {tab === 'recipes' && (
        <section className="product-panel">
          <div className="section-head">
            <div>
              <div className="page-eyebrow">Recipe Versioning</div>
              <h3 className="section-title">Recipes / BOM</h3>
              <p className="section-copy">
                New recipes start as Draft. Activating a version makes it the operational recipe for
                its Product / Variant.
              </p>
            </div>
          </div>
          <div className="grid grid-2">
            {state.recipes.map(r => (
              <article key={r.recipeId} className="card">
                <div className="section-head">
                  <div>
                    <div className="page-eyebrow">
                      {r.recipeId} · v{r.version}
                    </div>
                    <h4 className="mini-title">{r.productName}</h4>
                  </div>
                  <StatusPill status={r.status} />
                </div>
                <p className="section-copy" style={{ marginBottom: 12 }}>
                  Base Yield:{' '}
                  <strong>
                    {r.baseYield} {r.yieldUnit}
                  </strong>{' '}
                  · Default Mode: <strong>{r.defaultScalingMode}</strong>
                </p>
                <div className="table-shell">
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>Material</th>
                        <th>Type</th>
                        <th className="num">Base Qty</th>
                        <th className="num">Waste</th>
                      </tr>
                    </thead>
                    <tbody>
                      {r.items.map(it => (
                        <tr key={it.recipeItemId}>
                          <td>{it.materialName}</td>
                          <td>{it.itemType}</td>
                          <td className="num">
                            {formatNumber(it.quantityBase)} {it.baseUnit}
                          </td>
                          <td className="num">{it.wasteAllowancePct}%</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </article>
            ))}
          </div>
        </section>
      )}

      {tab === 'calculator' && (
        <section className="product-panel">
          <div className="calculator-layout">
            <article className="card cream">
              <div className="page-eyebrow">Auto Recipe Scaling</div>
              <h3 className="section-title">Recipe Calculator</h3>
              <p className="page-subtitle">
                Choose a recipe and target output. The engine normalizes units, applies waste
                allowance, calculates required materials and estimates COGS.
              </p>

              <form className="form-grid" style={{ marginTop: 18 }} onSubmit={handleCalculate}>
                <label className="form-field span-2">
                  <span>Recipe</span>
                  <select
                    value={selectedRecipeId}
                    onChange={e => setSelectedRecipeId(e.target.value)}
                    required
                  >
                    {state.recipes.map(r => (
                      <option key={r.recipeId} value={r.recipeId}>
                        {r.productName} (v{r.version} · Base {r.baseYield} {r.yieldUnit} ·{' '}
                        {r.defaultScalingMode})
                      </option>
                    ))}
                  </select>
                </label>
                <label className="form-field">
                  <span>Target Production</span>
                  <input
                    type="number"
                    min="0.000001"
                    step="any"
                    value={targetQty}
                    onChange={e => setTargetQty(e.target.value)}
                    placeholder="e.g. 25"
                    required
                  />
                </label>
                <label className="form-field">
                  <span>Scaling Mode</span>
                  <select
                    value={modeOverride}
                    onChange={e => setModeOverride(e.target.value as '' | ScalingMode)}
                  >
                    <option value="">
                      Use recipe default ({activeRecipeForCalc?.defaultScalingMode ?? 'EXACT'})
                    </option>
                    <option value="EXACT">EXACT</option>
                    <option value="FULL_BATCH">FULL_BATCH</option>
                  </select>
                </label>
                <div className="span-2">
                  <button type="submit" className="primary-btn">
                    <span className="material-symbols-outlined">calculate</span> Calculate
                    Requirement
                  </button>
                </div>
              </form>
            </article>

            {calcResult && activeRecipeForCalc && (
              <article className="card">
                <div className="page-eyebrow">Calculation Result ({calcResult.mode})</div>
                <h3 className="section-title">{activeRecipeForCalc.productName}</h3>
                <div className="calc-kpis">
                  <div>
                    <span>Multiplier</span>
                    <strong>{formatNumber(calcResult.multiplier, 2)}×</strong>
                  </div>
                  <div>
                    <span>Expected Output</span>
                    <strong>
                      {formatNumber(calcResult.expectedOutput)} {activeRecipeForCalc.yieldUnit}
                    </strong>
                  </div>
                  <div>
                    <span>Surplus</span>
                    <strong>
                      {formatNumber(calcResult.surplus)} {activeRecipeForCalc.yieldUnit}
                    </strong>
                  </div>
                  {canSeeMargin && (
                    <div>
                      <span>Est. COGS / Output</span>
                      <strong>{formatIDR(calcResult.estimatedUnitCogs)}</strong>
                    </div>
                  )}
                </div>
              </article>
            )}
          </div>

          {calcResult && (
            <div className="table-shell" style={{ marginTop: 18 }}>
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Material</th>
                    <th>Type</th>
                    <th className="num">Base Recipe</th>
                    <th className="num">Required (Gross)</th>
                    <th className="num">Waste</th>
                    {canSeeMargin && <th className="num">Est. Cost</th>}
                  </tr>
                </thead>
                <tbody>
                  {calcResult.lines.map(l => (
                    <tr key={l.itemId}>
                      <td>
                        <strong>{l.materialName}</strong>
                      </td>
                      <td>{l.itemType}</td>
                      <td className="num">
                        {formatNumber(l.baseQuantity)} {l.baseUnit}
                      </td>
                      <td className="num">
                        <strong>
                          {formatNumber(l.requiredGrossQuantity)} {l.baseUnit}
                        </strong>
                      </td>
                      <td className="num">
                        {formatNumber(l.wasteQuantity)} {l.baseUnit}
                      </td>
                      {canSeeMargin && <td className="num">{formatIDR(l.estimatedCost)}</td>}
                    </tr>
                  ))}
                </tbody>
                {canSeeMargin && (
                  <tfoot>
                    <tr>
                      <td colSpan={5}>
                        <strong>Estimated Batch Cost</strong>
                      </td>
                      <td className="num">
                        <strong>{formatIDR(calcResult.totalEstimatedCost)}</strong>
                      </td>
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>
          )}
        </section>
      )}

      {showProductModal && (
        <div className="modal-overlay" onClick={() => setShowProductModal(false)}>
          <div className="modal-card" onClick={e => e.stopPropagation()}>
            <div className="section-head">
              <div>
                <div className="page-eyebrow">Product Master</div>
                <h3 className="section-title">Tambah Produk Baru</h3>
              </div>
              <button
                type="button"
                className="icon-btn"
                onClick={() => setShowProductModal(false)}
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            <form className="form-grid" onSubmit={handleCreateProduct}>
              <label className="form-field span-2">
                <span>Nama Produk</span>
                <input
                  required
                  value={prodName}
                  onChange={e => setProdName(e.target.value)}
                  placeholder="Misal: Pistachio Kunafa Tiramisu"
                />
              </label>
              <label className="form-field">
                <span>SKU</span>
                <input
                  required
                  value={prodSku}
                  onChange={e => setProdSku(e.target.value)}
                  placeholder="TLB-TIR-PST"
                />
              </label>
              <label className="form-field">
                <span>Kategori</span>
                <input
                  required
                  value={prodCategory}
                  onChange={e => setProdCategory(e.target.value)}
                />
              </label>
              <label className="form-field">
                <span>Harga Jual (IDR)</span>
                <input
                  type="number"
                  required
                  value={prodPrice}
                  onChange={e => setProdPrice(e.target.value)}
                />
              </label>
              <label className="form-field">
                <span>Estimasi COGS Awal (IDR)</span>
                <input
                  type="number"
                  required
                  value={prodCogs}
                  onChange={e => setProdCogs(e.target.value)}
                />
              </label>
              <div className="span-2 form-actions">
                <button
                  type="button"
                  className="secondary-btn"
                  onClick={() => setShowProductModal(false)}
                >
                  Batal
                </button>
                <button type="submit" className="primary-btn">
                  Simpan Produk
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showMaterialModal && (
        <div className="modal-overlay" onClick={() => setShowMaterialModal(false)}>
          <div className="modal-card" onClick={e => e.stopPropagation()}>
            <div className="section-head">
              <div>
                <div className="page-eyebrow">Material Master</div>
                <h3 className="section-title">Tambah Ingredient / Packaging</h3>
              </div>
              <button
                type="button"
                className="icon-btn"
                onClick={() => setShowMaterialModal(false)}
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            <form className="form-grid" onSubmit={handleCreateMaterial}>
              <label className="form-field">
                <span>Tipe Material</span>
                <select
                  value={matType}
                  onChange={e => setMatType(e.target.value as 'INGREDIENT' | 'PACKAGING')}
                >
                  <option value="INGREDIENT">INGREDIENT</option>
                  <option value="PACKAGING">PACKAGING</option>
                </select>
              </label>
              <label className="form-field">
                <span>Satuan Dasar (Base Unit)</span>
                <select
                  value={matBaseUnit}
                  onChange={e => setMatBaseUnit(e.target.value as 'g' | 'ml' | 'pcs')}
                >
                  <option value="g">g (gram)</option>
                  <option value="ml">ml (mililiter)</option>
                  <option value="pcs">pcs (buah)</option>
                </select>
              </label>
              <label className="form-field span-2">
                <span>Nama Material</span>
                <input
                  required
                  value={matName}
                  onChange={e => setMatName(e.target.value)}
                  placeholder="Misal: Belgian Dark Couverture 70%"
                />
              </label>
              <label className="form-field">
                <span>Satuan Beli</span>
                <input
                  required
                  value={matPurchaseUnit}
                  onChange={e => setMatPurchaseUnit(e.target.value)}
                />
              </label>
              <label className="form-field">
                <span>Konversi ke Base Unit</span>
                <input
                  type="number"
                  required
                  value={matConv}
                  onChange={e => setMatConv(e.target.value)}
                />
              </label>
              <label className="form-field span-2">
                <span>Harga Beli per Satuan Beli (IDR)</span>
                <input
                  type="number"
                  required
                  value={matPrice}
                  onChange={e => setMatPrice(e.target.value)}
                />
              </label>
              <div className="span-2 form-actions">
                <button
                  type="button"
                  className="secondary-btn"
                  onClick={() => setShowMaterialModal(false)}
                >
                  Batal
                </button>
                <button type="submit" className="primary-btn">
                  Simpan Material
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </section>
  );
}

export function ProductionPage({
  state,
  onCreatePlan,
  onToast
}: {
  state: AppPreviewState;
  onCreatePlan: (plan: ProductionPlanRecord) => void;
  onToast: (title: string, message: string, type?: 'info' | 'success' | 'error') => void;
}) {
  const [tab, setTab] = useState<'overview' | 'plan' | 'plans'>('overview');
  const [fulfillmentDate, setFulfillmentDate] = useState('2026-11-05');
  const [productionDate, setProductionDate] = useState('2026-11-05');
  const [notes, setNotes] = useState('');
  const [previewed, setPreviewed] = useState(false);

  const canWriteProduction = hasPermission(state.role, 'PRODUCTION_WRITE');

  const activePlans = state.productionPlans.filter(p => p.status !== 'COMPLETED');
  const draftPlans = state.productionPlans.filter(p => p.status === 'DRAFT');
  const shortageFlags = state.productionPlans
    .flatMap(p => p.requirements)
    .filter(r => r.status === 'SHORTAGE').length;
  const plannedOrdersCount = new Set(state.productionPlans.flatMap(p => p.orderIds)).size;

  const eligibleOrders = state.orders.filter(
    o =>
      o.fulfillmentDate === fulfillmentDate &&
      !['CANCELLED', 'COMPLETED'].includes(o.status) &&
      !state.productionPlans.some(p => p.orderIds.includes(o.orderId))
  );

  function handlePreview(e: FormEvent) {
    e.preventDefault();
    setPreviewed(true);
    onToast(
      'Preview Demand Selesai',
      `Ditemukan ${eligibleOrders.length} order untuk tanggal fulfillment ${fulfillmentDate}.`,
      'info'
    );
  }

  function handleCreatePlanClick() {
    if (eligibleOrders.length === 0) {
      onToast(
        'Tidak ada order baru',
        'Pilih tanggal fulfillment yang memiliki order belum terjadwal.',
        'error'
      );
      return;
    }
    const newPlan: ProductionPlanRecord = {
      planId: `PPL-202611-00000${state.productionPlans.length + 1}`,
      fulfillmentDate,
      productionDate,
      orderIds: eligibleOrders.map(o => o.orderId),
      status: 'PLANNED',
      usagePosted: false,
      notes: notes.trim() || `Rencana produksi untuk fulfillment ${fulfillmentDate}`,
      targets: eligibleOrders.flatMap((o, idx) =>
        o.items.map((it, j) => ({
          planItemId: `PPI-0000${idx + 1}${j + 1}`,
          productId: it.productId,
          productName: it.productTitle,
          recipeId: 'RCP-000001',
          recipeVersion: 1,
          scalingMode: 'EXACT' as const,
          targetQty: it.quantity,
          expectedOutput: it.quantity,
          multiplier: 1
        }))
      ),
      requirements: [
        {
          requirementId: `REQ-00009${state.productionPlans.length + 1}`,
          itemId: 'ING-000001',
          materialName: 'Mascarpone Italian Cheese',
          itemType: 'INGREDIENT',
          baseUnit: 'g',
          requiredQtyBase: 600,
          availableQtyBase: 4200,
          shortageQtyBase: 0,
          status: 'SUFFICIENT'
        }
      ]
    };
    onCreatePlan(newPlan);
    setPreviewed(false);
    setTab('plans');
    onToast('Production Plan dibuat', `${newPlan.planId} berhasil dibekukan (snapshot).`, 'success');
  }

  return (
    <section className="page production-page route-motion-enter">
      <div className="module-banner">
        <div className="module-icon">
          <span className="material-symbols-outlined">oven_gen</span>
        </div>
        <div className="module-copy">
          <h2>Production</h2>
          <p>
            Turn confirmed demand into a frozen production snapshot: aggregate Product/Variant
            targets, scale active recipes, calculate ingredient and packaging requirements, and flag
            stock shortages before production starts.
          </p>
        </div>
      </div>

      <div className="production-toolbar">
        <div className="product-tabs" role="tablist" aria-label="Production tabs">
          {(
            [
              ['overview', 'Overview'],
              ['plan', 'Plan Orders'],
              ['plans', 'Production Plans']
            ] as const
          ).map(([key, label]) => (
            <button
              key={key}
              type="button"
              className={`product-tab ${tab === key ? 'active' : ''}`}
              onClick={() => setTab(key)}
            >
              {label}
            </button>
          ))}
        </div>
        <button
          type="button"
          className="secondary-btn"
          onClick={() =>
            onToast('Production disegarkan', 'Status plan dan kebutuhan bahan diperbarui.', 'info')
          }
        >
          <span className="material-symbols-outlined">refresh</span> Refresh
        </button>
      </div>

      {tab === 'overview' && (
        <section className="production-panel">
          <div className="grid grid-4">
            <article className="card">
              <div className="card-label">Active Plans</div>
              <div className="card-value">{activePlans.length}</div>
              <div className="card-help">Not completed/cancelled</div>
            </article>
            <article className="card">
              <div className="card-label">Draft</div>
              <div className="card-value">{draftPlans.length}</div>
              <div className="card-help">Still reviewable</div>
            </article>
            <article className="card">
              <div className="card-label">Shortage Flags</div>
              <div className="card-value">{shortageFlags}</div>
              <div className="card-help">Across active plan snapshots</div>
            </article>
            <article className="card pink">
              <div className="card-label">Source Orders</div>
              <div className="card-value">{plannedOrdersCount}</div>
              <div className="card-help">Orders already planned</div>
            </article>
          </div>

          <div className="grid grid-2">
            <article className="card cream">
              <div className="page-eyebrow">Demand → Kitchen</div>
              <h3 className="section-title" style={{ marginTop: 6 }}>
                Production snapshot
              </h3>
              <div className="production-flow">
                <span>Confirmed / Scheduled Orders</span>
                <span className="material-symbols-outlined">arrow_downward</span>
                <span>Aggregate Product / Variant</span>
                <span className="material-symbols-outlined">arrow_downward</span>
                <span>Recipe Scaling</span>
                <span className="material-symbols-outlined">arrow_downward</span>
                <span>Ingredient + Packaging Requirement</span>
                <span className="material-symbols-outlined">arrow_downward</span>
                <span>Stock Shortage Snapshot</span>
              </div>
            </article>

            <article className="card">
              <div className="page-eyebrow">Phase boundary</div>
              <h3 className="section-title" style={{ marginTop: 6 }}>
                Planning &amp; Batch Control
              </h3>
              <p className="page-subtitle">
                Production planning reads live stock and keeps material requirements reviewable
                before usage is posted. Inventory usage is posted once in Inventory → Production
                Usage.
              </p>
              <button
                type="button"
                className="primary-btn"
                style={{ marginTop: 18 }}
                onClick={() => setTab('plan')}
              >
                <span className="material-symbols-outlined">event_available</span> Plan Orders
              </button>
            </article>
          </div>
        </section>
      )}

      {tab === 'plan' && (
        <section className="production-panel">
          <article className="card production-planner-card">
            <div className="section-head">
              <div>
                <div className="page-eyebrow">Order Demand</div>
                <h3 className="section-title">Create Production Plan</h3>
                <p className="section-copy">
                  Choose a fulfillment date. The engine will use every eligible, not-yet-planned
                  order on that date.
                </p>
              </div>
            </div>

            <form className="form-grid" onSubmit={handlePreview}>
              <label className="form-field">
                <span>Order Fulfillment Date</span>
                <input
                  type="date"
                  required
                  value={fulfillmentDate}
                  onChange={e => {
                    setFulfillmentDate(e.target.value);
                    setPreviewed(false);
                  }}
                />
              </label>

              <label className="form-field">
                <span>Production Date</span>
                <input
                  type="date"
                  required
                  value={productionDate}
                  onChange={e => setProductionDate(e.target.value)}
                />
              </label>

              <label className="form-field span-2">
                <span>Plan Notes</span>
                <textarea
                  rows={2}
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  placeholder="Optional kitchen note"
                />
              </label>

              <div className="span-2 form-actions production-form-actions">
                <button type="submit" className="secondary-btn">
                  <span className="material-symbols-outlined">visibility</span> Preview Demand
                </button>
                {canWriteProduction && (
                  <button
                    type="button"
                    className="primary-btn"
                    disabled={!previewed || eligibleOrders.length === 0}
                    onClick={handleCreatePlanClick}
                  >
                    <span className="material-symbols-outlined">playlist_add_check</span> Create
                    Production Plan
                  </button>
                )}
              </div>
            </form>
          </article>

          {!previewed ? (
            <div className="empty-state compact-empty" style={{ marginTop: 18 }}>
              <div>
                <span className="material-symbols-outlined">event_note</span>
                <h3>Select a fulfillment date</h3>
                <p>Click Preview Demand to inspect eligible orders before creating a snapshot.</p>
              </div>
            </div>
          ) : (
            <div style={{ marginTop: 18 }}>
              <div className="grid grid-4">
                <article className="card">
                  <div className="card-label">Eligible Orders</div>
                  <div className="card-value">{eligibleOrders.length}</div>
                </article>
                <article className="card">
                  <div className="card-label">Production Targets</div>
                  <div className="card-value">
                    {eligibleOrders.reduce((s, o) => s + o.items.length, 0)}
                  </div>
                </article>
                <article className="card">
                  <div className="card-label">Requirements</div>
                  <div className="card-value">{eligibleOrders.length > 0 ? 3 : 0}</div>
                </article>
                <article className="card pink">
                  <div className="card-label">Shortages</div>
                  <div className="card-value">0</div>
                </article>
              </div>

              <article className="card" style={{ marginTop: 18 }}>
                <div className="page-eyebrow">Source Orders</div>
                <h3 className="section-title" style={{ marginTop: 5 }}>
                  Demand included ({fulfillmentDate})
                </h3>
                <div className="table-shell">
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>Order</th>
                        <th>Customer</th>
                        <th className="num">Items</th>
                        <th>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {eligibleOrders.map(o => (
                        <tr key={o.orderId}>
                          <td>
                            <strong>{o.orderId}</strong>
                          </td>
                          <td>{o.customerName}</td>
                          <td className="num">
                            {o.items.reduce((s, it) => s + it.quantity, 0)} pcs
                          </td>
                          <td>
                            <StatusPill status={o.status} />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {eligibleOrders.length === 0 && (
                    <div className="table-empty">
                      Tidak ada order baru yang belum terjadwal pada tanggal {fulfillmentDate}.
                    </div>
                  )}
                </div>
              </article>
            </div>
          )}
        </section>
      )}

      {tab === 'plans' && (
        <section className="production-panel">
          <div className="section-head">
            <div>
              <div className="page-eyebrow">Frozen Snapshots</div>
              <h3 className="section-title">Production Plans</h3>
              <p className="section-copy">
                Each plan stores the exact Order IDs, recipe version, scaling result, and material
                availability snapshot used when it was created.
              </p>
            </div>
          </div>

          {state.productionPlans.map(plan => (
            <article key={plan.planId} className="card" style={{ marginBottom: 18 }}>
              <div className="section-head">
                <div>
                  <div className="page-eyebrow">
                    {plan.planId} · Production {plan.productionDate} (Fulfillment{' '}
                    {plan.fulfillmentDate})
                  </div>
                  <h4 className="mini-title">
                    Orders: {plan.orderIds.join(', ')} · {plan.notes}
                  </h4>
                </div>
                <div className="inline-actions">
                  <StatusPill status={plan.status} />
                  <StatusPill status={plan.usagePosted ? 'USAGE POSTED' : 'USAGE PENDING'} />
                </div>
              </div>

              <div className="table-shell" style={{ marginTop: 12 }}>
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Material Requirement Snapshot</th>
                      <th>Type</th>
                      <th className="num">Required</th>
                      <th className="num">Available</th>
                      <th className="num">Shortage</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {plan.requirements.map(req => (
                      <tr key={req.requirementId}>
                        <td>
                          <strong>{req.materialName}</strong>
                        </td>
                        <td>{req.itemType}</td>
                        <td className="num">
                          {formatNumber(req.requiredQtyBase)} {req.baseUnit}
                        </td>
                        <td className="num">
                          {formatNumber(req.availableQtyBase)} {req.baseUnit}
                        </td>
                        <td className="num">
                          {formatNumber(req.shortageQtyBase)} {req.baseUnit}
                        </td>
                        <td>
                          <StatusPill status={req.status} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </article>
          ))}
        </section>
      )}
    </section>
  );
}
