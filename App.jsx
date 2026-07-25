import { useState, useEffect, useMemo, useRef } from "react";
import {
  ChefHat, Search, Upload, Clock, Users, Sparkles, X, Plus,
  ArrowUpDown, Image as ImageIcon, Loader2, PenLine,
  UtensilsCrossed, Soup, Cake, Coffee, Salad, GlassWater, BookOpen, ClipboardList
} from "lucide-react";

// ---------- design tokens ----------
const COLORS = {
  navy: "#152A4E",
  navyDeep: "#0E1E3B",
  blue: "#3568A8",
  sky: "#8CB9E6",
  yellow: "#F2B705",
  yellowDeep: "#D99A00",
  cream: "#FBF7EC",
  card: "#FFFFFF",
  ink: "#1C2541",
  inkSoft: "#5B6785",
  line: "#E4DCC8",
};

const CATEGORIES = [
  { id: "app", label: "Apps", icon: Soup, tab: "#3568A8" },
  { id: "main", label: "Mains", icon: UtensilsCrossed, tab: "#152A4E" },
  { id: "side", label: "Sides", icon: Salad, tab: "#5B8A4A" },
  { id: "dessert", label: "Dessert", icon: Cake, tab: "#C1548C" },
  { id: "breakfast", label: "Breakfast", icon: Coffee, tab: "#B9701F" },
  { id: "drink", label: "Drinks", icon: GlassWater, tab: "#2C8C93" },
  { id: "other", label: "Other", icon: BookOpen, tab: "#7A6FB0" },
];
const catInfo = (id) => CATEGORIES.find((c) => c.id === id) || CATEGORIES[CATEGORIES.length - 1];

// ---------- helpers ----------
function resizeImage(file, maxDim = 1000, quality = 0.78) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("Could not read file"));
    reader.onload = () => {
      const img = new window.Image();
      img.onerror = () => reject(new Error("Could not read image"));
      img.onload = () => {
        let { width, height } = img;
        if (width > height && width > maxDim) {
          height = Math.round((height * maxDim) / width);
          width = maxDim;
        } else if (height > maxDim) {
          width = Math.round((width * maxDim) / height);
          height = maxDim;
        }
        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        canvas.getContext("2d").drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL("image/jpeg", quality));
      };
      img.src = reader.result;
    };
    reader.readAsDataURL(file);
  });
}

function emptyForm() {
  return {
    submitterName: "",
    recipeName: "",
    category: "main",
    prepTime: "",
    cookTime: "",
    servings: "",
    difficulty: "Easy",
    ingredients: "",
    instructions: "",
    notes: "",
    image: null,
  };
}

// calls our own backend function, which holds the real Anthropic API key
async function extractRecipeWithAI({ image, text }) {
  const response = await fetch("/api/extract", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      image: image ? { data: image.data, mediaType: image.mediaType } : null,
      text: text || null,
    }),
  });
  if (!response.ok) throw new Error("AI request failed");
  return response.json();
}

async function fetchRecipes() {
  const res = await fetch("/api/recipes");
  if (!res.ok) throw new Error("Failed to load recipes");
  return res.json();
}

async function saveRecipeToServer(recipe) {
  const res = await fetch("/api/recipes", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(recipe),
  });
  if (!res.ok) throw new Error("Failed to save recipe");
  return res.json();
}

// ---------- small UI atoms ----------
function Badge({ children, bg, color = "#fff" }) {
  return (
    <span
      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold tracking-wide"
      style={{ background: bg, color }}
    >
      {children}
    </span>
  );
}

function Field({ label, required, children, hint }) {
  return (
    <label className="block mb-4">
      <span className="block text-sm font-semibold mb-1.5" style={{ color: COLORS.navy }}>
        {label} {required && <span style={{ color: COLORS.yellowDeep }}>*</span>}
      </span>
      {children}
      {hint && <span className="block text-xs mt-1" style={{ color: COLORS.inkSoft }}>{hint}</span>}
    </label>
  );
}

const inputStyle = {
  border: `1.5px solid ${COLORS.line}`,
  color: COLORS.ink,
  background: "#fff",
};

// ---------- Recipe Card ----------
function RecipeCard({ recipe, onOpen }) {
  const cat = catInfo(recipe.category);
  const Icon = cat.icon;
  return (
    <button
      onClick={() => onOpen(recipe)}
      className="text-left rounded-lg overflow-hidden transition-transform duration-200 hover:-translate-y-1 focus:outline-none focus:ring-2"
      style={{
        background: COLORS.card,
        border: `1px solid ${COLORS.line}`,
        boxShadow: "0 1px 2px rgba(21,42,78,0.06)",
        outlineColor: COLORS.yellow,
      }}
    >
      <div className="h-1.5" style={{ background: cat.tab }} />
      {recipe.image ? (
        <div className="h-40 w-full overflow-hidden" style={{ background: COLORS.cream }}>
          <img src={recipe.image} alt={recipe.recipeName} className="w-full h-full object-cover" />
        </div>
      ) : (
        <div
          className="h-40 w-full flex items-center justify-center"
          style={{ background: `linear-gradient(135deg, ${COLORS.cream}, #fff)` }}
        >
          <Icon size={40} strokeWidth={1.3} color={cat.tab} />
        </div>
      )}
      <div className="p-4">
        <div className="flex items-center justify-between mb-2">
          <Badge bg={cat.tab}>
            <Icon size={12} /> {cat.label}
          </Badge>
          {recipe.difficulty && (
            <span className="text-xs font-mono" style={{ color: COLORS.inkSoft }}>{recipe.difficulty}</span>
          )}
        </div>
        <h3
          className="text-lg leading-snug mb-1"
          style={{ fontFamily: "'Fraunces', serif", fontWeight: 600, color: COLORS.navy }}
        >
          {recipe.recipeName}
        </h3>
        <p className="text-xs mb-3" style={{ color: COLORS.inkSoft }}>by {recipe.submitterName}</p>
        <div className="flex items-center gap-3 text-xs font-mono" style={{ color: COLORS.blue }}>
          {recipe.cookTime && (
            <span className="inline-flex items-center gap-1"><Clock size={13} /> {recipe.cookTime}</span>
          )}
          {recipe.servings && (
            <span className="inline-flex items-center gap-1"><Users size={13} /> {recipe.servings}</span>
          )}
        </div>
      </div>
    </button>
  );
}

// ---------- Recipe Modal ----------
function RecipeModal({ recipe, onClose }) {
  if (!recipe) return null;
  const cat = catInfo(recipe.category);
  const Icon = cat.icon;
  return (
    <div
      className="fixed inset-0 z-50 flex items-start sm:items-center justify-center p-0 sm:p-6 overflow-y-auto"
      style={{ background: "rgba(14,30,59,0.55)" }}
      onClick={onClose}
    >
      <div
        className="w-full sm:max-w-2xl sm:rounded-xl overflow-hidden my-0 sm:my-auto relative"
        style={{ background: COLORS.card }}
        onClick={(e) => e.stopPropagation()}
      >
        {recipe.image ? (
          <div className="h-56 w-full relative">
            <img src={recipe.image} alt={recipe.recipeName} className="w-full h-full object-cover" />
            <div className="absolute inset-0" style={{ background: "linear-gradient(to top, rgba(14,30,59,0.55), transparent 50%)" }} />
          </div>
        ) : (
          <div className="h-3" style={{ background: cat.tab }} />
        )}
        <button
          onClick={onClose}
          className="absolute top-3 right-3 rounded-full p-2"
          style={{ background: "rgba(255,255,255,0.9)", color: COLORS.navy }}
        >
          <X size={18} />
        </button>

        <div className="p-6 sm:p-8">
          <Badge bg={cat.tab}><Icon size={12} /> {cat.label}</Badge>
          <h2
            className="mt-3 mb-1 text-3xl"
            style={{ fontFamily: "'Fraunces', serif", fontWeight: 700, color: COLORS.navy }}
          >
            {recipe.recipeName}
          </h2>
          <p className="text-sm mb-5" style={{ color: COLORS.inkSoft }}>
            Submitted by {recipe.submitterName}
          </p>

          <div className="flex flex-wrap gap-4 mb-6 pb-6" style={{ borderBottom: `1px solid ${COLORS.line}` }}>
            {recipe.prepTime && (
              <div>
                <div className="text-xs uppercase tracking-wide" style={{ color: COLORS.inkSoft }}>Prep</div>
                <div className="font-mono text-sm font-medium" style={{ color: COLORS.navy }}>{recipe.prepTime}</div>
              </div>
            )}
            {recipe.cookTime && (
              <div>
                <div className="text-xs uppercase tracking-wide" style={{ color: COLORS.inkSoft }}>Cook</div>
                <div className="font-mono text-sm font-medium" style={{ color: COLORS.navy }}>{recipe.cookTime}</div>
              </div>
            )}
            {recipe.servings && (
              <div>
                <div className="text-xs uppercase tracking-wide" style={{ color: COLORS.inkSoft }}>Serves</div>
                <div className="font-mono text-sm font-medium" style={{ color: COLORS.navy }}>{recipe.servings}</div>
              </div>
            )}
            {recipe.difficulty && (
              <div>
                <div className="text-xs uppercase tracking-wide" style={{ color: COLORS.inkSoft }}>Difficulty</div>
                <div className="font-mono text-sm font-medium" style={{ color: COLORS.navy }}>{recipe.difficulty}</div>
              </div>
            )}
          </div>

          <div className="grid sm:grid-cols-2 gap-8">
            <div>
              <h3 className="text-sm font-bold uppercase tracking-wide mb-3" style={{ color: COLORS.yellowDeep }}>
                Ingredients
              </h3>
              <ul className="space-y-2">
                {recipe.ingredients.map((ing, i) => (
                  <li key={i} className="text-sm flex gap-2" style={{ color: COLORS.ink }}>
                    <span className="mt-1.5 w-1.5 h-1.5 rounded-full shrink-0" style={{ background: COLORS.blue }} />
                    {ing}
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <h3 className="text-sm font-bold uppercase tracking-wide mb-3" style={{ color: COLORS.yellowDeep }}>
                Instructions
              </h3>
              <ol className="space-y-3">
                {recipe.instructions.map((step, i) => (
                  <li key={i} className="text-sm flex gap-3" style={{ color: COLORS.ink }}>
                    <span
                      className="shrink-0 w-5 h-5 rounded-full flex items-center justify-center text-xs font-mono font-semibold"
                      style={{ background: COLORS.navy, color: COLORS.yellow }}
                    >
                      {i + 1}
                    </span>
                    <span className="pt-0.5">{step}</span>
                  </li>
                ))}
              </ol>
            </div>
          </div>

          {recipe.notes && (
            <div className="mt-6 pt-6" style={{ borderTop: `1px solid ${COLORS.line}` }}>
              <h3 className="text-sm font-bold uppercase tracking-wide mb-2" style={{ color: COLORS.yellowDeep }}>
                Notes
              </h3>
              <p className="text-sm" style={{ color: COLORS.ink }}>{recipe.notes}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ---------- Submit View ----------
function SubmitView({ onSaved }) {
  const [form, setForm] = useState(emptyForm());
  const [inputMode, setInputMode] = useState("text");
  const [rawText, setRawText] = useState("");
  const [imagePreview, setImagePreview] = useState(null);
  const [imageForAI, setImageForAI] = useState(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState("");
  const [aiDone, setAiDone] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [saved, setSaved] = useState(false);
  const fileInput = useRef(null);

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  async function handleFile(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setAiError("");
    try {
      const dataUrl = await resizeImage(file);
      setImagePreview(dataUrl);
      setImageForAI({ data: dataUrl.split(",")[1], mediaType: "image/jpeg" });
      setForm((f) => ({ ...f, image: dataUrl }));
    } catch {
      setAiError("Couldn't read that image — try a different file.");
    }
  }

  async function runAI() {
    setAiError("");
    setAiLoading(true);
    try {
      const result = await extractRecipeWithAI(
        inputMode === "image" ? { image: imageForAI } : { text: rawText }
      );
      setForm((f) => ({
        ...f,
        recipeName: result.recipeName || f.recipeName,
        prepTime: result.prepTime || "",
        cookTime: result.cookTime || "",
        servings: result.servings || "",
        difficulty: result.difficulty || "Easy",
        category: CATEGORIES.some((c) => c.id === result.category) ? result.category : "other",
        ingredients: (result.ingredients || []).join("\n"),
        instructions: (result.instructions || []).join("\n"),
        notes: result.notes || "",
      }));
      setAiDone(true);
    } catch {
      setAiError("Couldn't clean that up automatically — no worries, just fill in the fields below by hand.");
    } finally {
      setAiLoading(false);
    }
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!form.submitterName.trim() || !form.recipeName.trim()) return;
    setSaving(true);
    setSaveError("");
    const recipe = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      submitterName: form.submitterName.trim(),
      recipeName: form.recipeName.trim(),
      category: form.category,
      prepTime: form.prepTime.trim(),
      cookTime: form.cookTime.trim(),
      servings: form.servings.trim(),
      difficulty: form.difficulty,
      ingredients: form.ingredients.split("\n").map((s) => s.trim()).filter(Boolean),
      instructions: form.instructions.split("\n").map((s) => s.trim()).filter(Boolean),
      notes: form.notes.trim(),
      image: form.image,
      createdAt: Date.now(),
    };
    try {
      await onSaved(recipe);
      setSaved(true);
      setForm(emptyForm());
      setRawText("");
      setImagePreview(null);
      setImageForAI(null);
      setAiDone(false);
      if (fileInput.current) fileInput.current.value = "";
      setTimeout(() => setSaved(false), 3500);
    } catch {
      setSaveError("Couldn't save that recipe — check your connection and try again.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8">
      <h2 className="text-2xl mb-1" style={{ fontFamily: "'Fraunces', serif", fontWeight: 700, color: COLORS.navy }}>
        Add a recipe to the box
      </h2>
      <p className="text-sm mb-6" style={{ color: COLORS.inkSoft }}>
        Paste the recipe text or upload a screenshot, and we'll tidy it up for you — then check it over before it goes in.
      </p>

      <div className="rounded-xl p-5 mb-6" style={{ background: "#fff", border: `1px solid ${COLORS.line}` }}>
        <div className="flex items-center gap-2 mb-4">
          <div className="flex rounded-lg overflow-hidden" style={{ border: `1.5px solid ${COLORS.navy}` }}>
            <button
              type="button"
              onClick={() => setInputMode("text")}
              className="px-4 py-2 text-sm font-semibold flex items-center gap-1.5"
              style={{ background: inputMode === "text" ? COLORS.navy : "#fff", color: inputMode === "text" ? "#fff" : COLORS.navy }}
            >
              <PenLine size={15} /> Paste text
            </button>
            <button
              type="button"
              onClick={() => setInputMode("image")}
              className="px-4 py-2 text-sm font-semibold flex items-center gap-1.5"
              style={{ background: inputMode === "image" ? COLORS.navy : "#fff", color: inputMode === "image" ? "#fff" : COLORS.navy }}
            >
              <ImageIcon size={15} /> Upload screenshot
            </button>
          </div>
        </div>

        {inputMode === "text" ? (
          <textarea
            value={rawText}
            onChange={(e) => setRawText(e.target.value)}
            rows={6}
            placeholder="Paste the recipe here, in any format — grandma's handwriting typed up, a blog copy-paste, whatever you've got..."
            className="w-full rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2"
            style={{ ...inputStyle, outlineColor: COLORS.yellow }}
          />
        ) : (
          <div>
            <input ref={fileInput} type="file" accept="image/*" onChange={handleFile} className="hidden" id="recipe-image" />
            <label
              htmlFor="recipe-image"
              className="flex flex-col items-center justify-center gap-2 rounded-lg py-8 cursor-pointer"
              style={{ border: `2px dashed ${COLORS.sky}`, background: COLORS.cream }}
            >
              <Upload size={24} color={COLORS.blue} />
              <span className="text-sm font-medium" style={{ color: COLORS.navy }}>
                {imagePreview ? "Choose a different image" : "Click to upload a recipe screenshot"}
              </span>
              <span className="text-xs" style={{ color: COLORS.inkSoft }}>PNG or JPG</span>
            </label>
            {imagePreview && (
              <img src={imagePreview} alt="preview" className="mt-3 max-h-48 rounded-lg mx-auto object-contain" />
            )}
          </div>
        )}

        <button
          type="button"
          onClick={runAI}
          disabled={aiLoading || (inputMode === "text" ? !rawText.trim() : !imageForAI)}
          className="mt-4 inline-flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold transition disabled:opacity-40"
          style={{ background: COLORS.yellow, color: COLORS.navyDeep }}
        >
          {aiLoading ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />}
          {aiLoading ? "Cleaning up your recipe..." : "Clean up & auto-fill"}
        </button>
        {aiError && <p className="text-xs mt-2" style={{ color: "#B3261E" }}>{aiError}</p>}
        {aiDone && !aiError && (
          <p className="text-xs mt-2 font-medium" style={{ color: "#3E7B3E" }}>
            Done! Review the details below before submitting.
          </p>
        )}
      </div>

      <form onSubmit={handleSubmit} className="rounded-xl p-5 sm:p-6" style={{ background: "#fff", border: `1px solid ${COLORS.line}` }}>
        <div className="grid sm:grid-cols-2 gap-x-4">
          <Field label="Your name" required>
            <input value={form.submitterName} onChange={set("submitterName")} required
              className="w-full rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2"
              style={{ ...inputStyle, outlineColor: COLORS.yellow }} placeholder="Aunt Carol" />
          </Field>
          <Field label="Recipe name" required>
            <input value={form.recipeName} onChange={set("recipeName")} required
              className="w-full rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2"
              style={{ ...inputStyle, outlineColor: COLORS.yellow }} placeholder="Sunday Pot Roast" />
          </Field>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-x-3">
          <Field label="Category">
            <select value={form.category} onChange={set("category")}
              className="w-full rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2"
              style={{ ...inputStyle, outlineColor: COLORS.yellow }}>
              {CATEGORIES.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}
            </select>
          </Field>
          <Field label="Difficulty">
            <select value={form.difficulty} onChange={set("difficulty")}
              className="w-full rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2"
              style={{ ...inputStyle, outlineColor: COLORS.yellow }}>
              <option>Easy</option><option>Medium</option><option>Hard</option>
            </select>
          </Field>
          <Field label="Prep time">
            <input value={form.prepTime} onChange={set("prepTime")} placeholder="15 min"
              className="w-full rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2"
              style={{ ...inputStyle, outlineColor: COLORS.yellow }} />
          </Field>
          <Field label="Cook time">
            <input value={form.cookTime} onChange={set("cookTime")} placeholder="45 min"
              className="w-full rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2"
              style={{ ...inputStyle, outlineColor: COLORS.yellow }} />
          </Field>
        </div>

        <Field label="Servings">
          <input value={form.servings} onChange={set("servings")} placeholder="6"
            className="w-full sm:w-40 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2"
            style={{ ...inputStyle, outlineColor: COLORS.yellow }} />
        </Field>

        <Field label="Ingredients" required hint="One ingredient per line">
          <textarea value={form.ingredients} onChange={set("ingredients")} rows={5} required
            className="w-full rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2"
            style={{ ...inputStyle, outlineColor: COLORS.yellow }} placeholder={"2 lbs chuck roast\n1 tsp salt\n..."} />
        </Field>

        <Field label="Instructions" required hint="One step per line">
          <textarea value={form.instructions} onChange={set("instructions")} rows={6} required
            className="w-full rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2"
            style={{ ...inputStyle, outlineColor: COLORS.yellow }} placeholder={"Sear the roast on all sides...\nAdd vegetables and broth...\n..."} />
        </Field>

        <Field label="Notes" hint="Substitutions, storage tips, family stories — optional">
          <textarea value={form.notes} onChange={set("notes")} rows={2}
            className="w-full rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2"
            style={{ ...inputStyle, outlineColor: COLORS.yellow }} />
        </Field>

        <button
          type="submit"
          disabled={saving}
          className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 rounded-lg text-sm font-bold transition disabled:opacity-50"
          style={{ background: COLORS.navy, color: "#fff" }}
        >
          {saving ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />}
          {saving ? "Saving..." : "Add to the cookbook"}
        </button>
        {saved && <span className="ml-3 text-sm font-medium" style={{ color: "#3E7B3E" }}>Added! Thank you 🎉</span>}
        {saveError && <p className="text-xs mt-2" style={{ color: "#B3261E" }}>{saveError}</p>}
      </form>
    </div>
  );
}

// ---------- Browse View ----------
function BrowseView({ recipes, loading, loadError }) {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("all");
  const [sortBy, setSortBy] = useState("newest");
  const [selected, setSelected] = useState(null);

  const filtered = useMemo(() => {
    let list = recipes.filter((r) => {
      if (category !== "all" && r.category !== category) return false;
      if (!query.trim()) return true;
      const q = query.toLowerCase();
      return (
        r.recipeName.toLowerCase().includes(q) ||
        r.submitterName.toLowerCase().includes(q) ||
        r.ingredients.some((i) => i.toLowerCase().includes(q))
      );
    });
    const timeToMin = (t) => {
      const m = (t || "").match(/(\d+)\s*h/);
      const mm = (t || "").match(/(\d+)\s*m/);
      return (m ? parseInt(m[1]) * 60 : 0) + (mm ? parseInt(mm[1]) : 0) || 9999;
    };
    if (sortBy === "newest") list = [...list].sort((a, b) => b.createdAt - a.createdAt);
    if (sortBy === "az") list = [...list].sort((a, b) => a.recipeName.localeCompare(b.recipeName));
    if (sortBy === "time") list = [...list].sort((a, b) => timeToMin(a.cookTime) - timeToMin(b.cookTime));
    return list;
  }, [recipes, query, category, sortBy]);

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
      <div className="flex flex-col sm:flex-row gap-3 mb-5">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2" color={COLORS.inkSoft} />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search recipes, ingredients, or names..."
            className="w-full rounded-lg pl-9 pr-3 py-2.5 text-sm focus:outline-none focus:ring-2"
            style={{ ...inputStyle, outlineColor: COLORS.yellow }}
          />
        </div>
        <div className="relative">
          <ArrowUpDown size={14} className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" color={COLORS.inkSoft} />
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="rounded-lg pl-8 pr-3 py-2.5 text-sm focus:outline-none focus:ring-2 appearance-none"
            style={{ ...inputStyle, outlineColor: COLORS.yellow }}
          >
            <option value="newest">Newest first</option>
            <option value="az">Name A–Z</option>
            <option value="time">Quickest cook time</option>
          </select>
        </div>
      </div>

      <div className="flex gap-1.5 mb-6 overflow-x-auto pb-1">
        <button
          onClick={() => setCategory("all")}
          className="px-3.5 py-1.5 rounded-t-lg text-xs font-bold whitespace-nowrap transition"
          style={{ background: category === "all" ? COLORS.navy : COLORS.line, color: category === "all" ? "#fff" : COLORS.navy }}
        >
          All Recipes
        </button>
        {CATEGORIES.map((c) => {
          const Icon = c.icon;
          const active = category === c.id;
          return (
            <button
              key={c.id}
              onClick={() => setCategory(c.id)}
              className="px-3.5 py-1.5 rounded-t-lg text-xs font-bold whitespace-nowrap transition inline-flex items-center gap-1.5"
              style={{ background: active ? c.tab : COLORS.line, color: active ? "#fff" : COLORS.navy }}
            >
              <Icon size={12} /> {c.label}
            </button>
          );
        })}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-24" style={{ color: COLORS.inkSoft }}>
          <Loader2 size={22} className="animate-spin mr-2" /> Loading the cookbook...
        </div>
      ) : loadError ? (
        <div className="text-center py-24 rounded-xl" style={{ background: "#fff", border: `1px dashed ${COLORS.line}` }}>
          <p className="font-semibold" style={{ color: COLORS.navy }}>Couldn't load the cookbook</p>
          <p className="text-sm mt-1" style={{ color: COLORS.inkSoft }}>Check your connection and refresh the page.</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-24 rounded-xl" style={{ background: "#fff", border: `1px dashed ${COLORS.line}` }}>
          <ClipboardList size={32} color={COLORS.sky} className="mx-auto mb-3" />
          <p className="font-semibold" style={{ color: COLORS.navy }}>
            {recipes.length === 0 ? "The box is empty so far" : "No recipes match that search"}
          </p>
          <p className="text-sm mt-1" style={{ color: COLORS.inkSoft }}>
            {recipes.length === 0 ? "Be the first to add one!" : "Try a different search or category."}
          </p>
        </div>
      ) : (
        <>
          <p className="text-xs mb-4 font-mono" style={{ color: COLORS.inkSoft }}>
            {filtered.length} recipe{filtered.length !== 1 ? "s" : ""}
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {filtered.map((r) => (
              <RecipeCard key={r.id} recipe={r} onOpen={setSelected} />
            ))}
          </div>
        </>
      )}

      <RecipeModal recipe={selected} onClose={() => setSelected(null)} />
    </div>
  );
}

// ---------- App ----------
export default function App() {
  const [tab, setTab] = useState("browse");
  const [recipes, setRecipes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);

  async function load() {
    setLoading(true);
    setLoadError(false);
    try {
      const data = await fetchRecipes();
      setRecipes(data);
    } catch {
      setLoadError(true);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function handleSaved(recipe) {
    await saveRecipeToServer(recipe);
    setRecipes((prev) => [...prev, recipe]);
    setTab("browse");
  }

  return (
    <div className="min-h-screen" style={{ background: COLORS.cream, fontFamily: "'Inter', sans-serif" }}>
      <header style={{ background: COLORS.navy }}>
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-full flex items-center justify-center shrink-0" style={{ background: COLORS.yellow }}>
              <ChefHat size={22} color={COLORS.navyDeep} />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl" style={{ fontFamily: "'Fraunces', serif", fontWeight: 700, color: "#fff" }}>
                Tridelta Cookbook
              </h1>
              <p className="text-xs" style={{ color: COLORS.sky }}>a shared collection, one recipe at a time</p>
            </div>
          </div>
          <nav className="flex rounded-lg overflow-hidden self-start sm:self-auto" style={{ border: `1.5px solid ${COLORS.yellow}` }}>
            <button
              onClick={() => setTab("browse")}
              className="px-4 py-2 text-sm font-semibold inline-flex items-center gap-1.5"
              style={{ background: tab === "browse" ? COLORS.yellow : "transparent", color: tab === "browse" ? COLORS.navyDeep : "#fff" }}
            >
              <BookOpen size={14} /> Browse
            </button>
            <button
              onClick={() => setTab("submit")}
              className="px-4 py-2 text-sm font-semibold inline-flex items-center gap-1.5"
              style={{ background: tab === "submit" ? COLORS.yellow : "transparent", color: tab === "submit" ? COLORS.navyDeep : "#fff" }}
            >
              <Plus size={14} /> Submit
            </button>
          </nav>
        </div>
      </header>

      {tab === "browse" ? (
        <BrowseView recipes={recipes} loading={loading} loadError={loadError} />
      ) : (
        <SubmitView onSaved={handleSaved} />
      )}

      <footer className="text-center text-xs py-8" style={{ color: COLORS.inkSoft }}>
        Tridelta Cookbook · recipes shared by everyone who adds one
      </footer>
    </div>
  );
}
