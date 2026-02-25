<script>
  import { getToasts, dismissToast } from '$lib/stores/notifications.svelte.js';

  const toasts = $derived(getToasts());
</script>

{#if toasts.length > 0}
  <div class="toast-container">
    {#each toasts as toast (toast.id)}
      <div class="toast toast-{toast.type}" role="alert">
        <span class="toast-msg">{toast.message}</span>
        <button class="toast-dismiss" onclick={() => dismissToast(toast.id)} aria-label="Dismiss">&times;</button>
      </div>
    {/each}
  </div>
{/if}

<style>
  .toast-container {
    position: fixed;
    top: 12px;
    left: 50%;
    transform: translateX(-50%);
    z-index: 9999;
    display: flex;
    flex-direction: column;
    gap: 8px;
    max-width: 480px;
    width: calc(100% - 24px);
    pointer-events: none;
  }
  .toast {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 10px 14px;
    border-radius: 8px;
    border: 1px solid var(--bd);
    background: var(--sf);
    color: var(--tx);
    font-family: 'JetBrains Mono', monospace;
    font-size: 12px;
    line-height: 1.4;
    pointer-events: auto;
    animation: toast-in 0.2s ease-out;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.4);
  }
  @keyframes toast-in {
    from { opacity: 0; transform: translateY(-8px); }
    to { opacity: 1; transform: translateY(0); }
  }
  .toast-error {
    border-color: rgba(255, 107, 107, 0.4);
    background: rgba(255, 107, 107, 0.1);
    color: #FF6B6B;
  }
  .toast-warning {
    border-color: rgba(240, 160, 48, 0.4);
    background: rgba(240, 160, 48, 0.1);
    color: #F0A030;
  }
  .toast-info {
    border-color: rgba(88, 166, 255, 0.4);
    background: rgba(88, 166, 255, 0.1);
    color: var(--ac);
  }
  .toast-msg {
    flex: 1;
  }
  .toast-dismiss {
    background: none;
    border: none;
    color: inherit;
    font-size: 18px;
    cursor: pointer;
    padding: 0 2px;
    line-height: 1;
    opacity: 0.6;
    transition: opacity 0.15s;
    flex-shrink: 0;
  }
  .toast-dismiss:hover {
    opacity: 1;
  }
</style>
