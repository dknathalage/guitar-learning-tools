<script lang="ts">
  let {
    type = 'concept' as 'concept' | 'diagram' | 'dothis' | 'tip' | 'avoid' | 'check',
    title = '',
    children,
  } = $props();

  const CONFIG = {
    concept: { border: '#2563EB', bg: '#EFF6FF', label: 'CONCEPT' },
    diagram: { border: '#7C3AED', bg: '#F5F3FF', label: 'DIAGRAM' },
    dothis: { border: '#16A34A', bg: '#F0FDF4', label: 'DO THIS' },
    tip: { border: '#D97706', bg: '#FFFBEB', label: 'TIP' },
    avoid: { border: '#DC2626', bg: '#FEF2F2', label: 'AVOID' },
    check: { border: '#0D9488', bg: '#F0FDFA', label: 'CHECK' },
  };

  const cfg = $derived(CONFIG[type]);
</script>

<div class="block" style="border-left-color:{cfg.border};background:{cfg.bg}">
  <div class="block-label" style="color:{cfg.border}">{title || cfg.label}</div>
  {@render children()}
</div>

<style>
  .block {
    border-left: 4px solid;
    border-radius: 0 8px 8px 0;
    padding: 12px 14px;
    margin-bottom: 12px;
  }
  .block-label {
    font-size: 0.7rem;
    font-weight: 800;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    margin-bottom: 6px;
    opacity: 0.9;
  }
</style>
