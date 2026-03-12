<script lang="ts">
  import { progress } from '$lib/stores/progress.svelte';
  let { id = '', label = '' } = $props();
  const checked = $derived(progress.isChecked(id));
</script>

<label class="check-item" class:done={checked}>
  <input type="checkbox" checked={checked} onchange={() => progress.toggle(id)} />
  <span class="checkmark">{checked ? '✓' : ''}</span>
  <span class="check-label">{label}</span>
</label>

<style>
  .check-item {
    display: flex;
    align-items: center;
    gap: 8px;
    cursor: pointer;
    padding: 6px 0;
    border-bottom: 1px solid rgba(13,148,136,0.1);
    user-select: none;
  }
  .check-item:last-child { border-bottom: none; }
  input { display: none; }
  .checkmark {
    width: 20px;
    height: 20px;
    border: 2px solid #0D9488;
    border-radius: 4px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 12px;
    color: #0D9488;
    flex-shrink: 0;
    background: white;
  }
  .done .checkmark {
    background: #0D9488;
    color: white;
  }
  .check-label {
    font-size: 0.88rem;
    line-height: 1.4;
  }
  .done .check-label {
    text-decoration: line-through;
    opacity: 0.6;
  }
</style>
